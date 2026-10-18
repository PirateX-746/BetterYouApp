import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { generateTempPassword } from '../common/temp-password';

import { LoginDto } from './dto/login.dto';
import { CreatePatientDto } from './dto/patient-signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';

import { Patient } from '../patients/schemas/patient.schema';
import { Practitioner } from '../practitioners/schemas/practitioner.schema';
import {
  PlatformAdmin,
  PlatformAdminDocument,
} from '../platform-admins/schemas/platform-admin.schema';
import { Role, PRACTICE_MEMBER_ROLES } from '../common/role.enum';

type UserDocument = (Patient | Practitioner) &
  Document & {
    password: string;
    role: string;
    firstName: string;
    lastName?: string;
    mustChangePassword: boolean;
    tempPasswordExpiresAt?: Date;
  };

const SALT_ROUNDS = 10;
const TEMP_PASSWORD_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<Patient>,

    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,

    @InjectModel(PlatformAdmin.name)
    private readonly platformAdminModel: Model<PlatformAdminDocument>,

    private readonly jwtService: JwtService,
  ) {}

  private getModelForRole(role: Role): Model<any> {
    return role === Role.PRACTITIONER
      ? this.practitionerModel
      : this.patientModel;
  }

  async patientSignup(dto: CreatePatientDto) {
    const existing = await this.patientModel.findOne({ email: dto.email });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const mrn = `MRN-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const patient = await this.patientModel.create({
      ...dto,
      password: hashedPassword,
      mrn,
      role: 'patient',
      isActive: true,
    });

    this.logger.log(`New patient registered: ${patient._id}`);

    return {
      message: 'Patient created successfully',
      id: patient._id,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password, role: rawRole } = loginDto;
    const role = rawRole as unknown as Role;

    if (!email || !password || !role) {
      throw new BadRequestException('Email, password and role are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (role !== Role.PATIENT && role !== Role.PRACTITIONER) {
      throw new UnauthorizedException('Invalid role selected');
    }

    let user: UserDocument | null;

    if (role === Role.PRACTITIONER) {
      user = (await this.practitionerModel.findOne({
        email: normalizedEmail,
      })) as UserDocument | null;
    } else {
      user = (await this.patientModel.findOne({
        email: normalizedEmail,
      })) as UserDocument | null;
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // The "practitioner" portal serves every practice-member role (practice
    // admin, practitioner, staff) — not just the literal Role.PRACTITIONER
    // string. Matches CLINICAL_ROLES/isPractitioner() elsewhere: a practice
    // admin is a clinician too and must not be locked out of their own
    // practice's login because their role isn't spelled "practitioner".
    const actualRole = user.role as Role;
    const validPortal =
      role === Role.PATIENT
        ? actualRole === Role.PATIENT
        : (PRACTICE_MEMBER_ROLES as readonly Role[]).includes(actualRole);

    if (!validPortal) {
      throw new UnauthorizedException(
        'You are trying to access the wrong portal',
      );
    }

    if (
      user.mustChangePassword &&
      user.tempPasswordExpiresAt &&
      user.tempPasswordExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(
        'Your temporary password has expired. Please request a new one.',
      );
    }

    const payload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${user._id} logged in as ${user.role}`);

    return {
      access_token: accessToken,
      id: user._id.toString(),
      role: user.role,
      name:
        actualRole === Role.PATIENT
          ? user.firstName
          : `${user.firstName} ${user.lastName ?? ''}`.trim(),
      mustChangePassword: !!user.mustChangePassword,
    };
  }

  /**
   * Platform console sign-in.
   *
   * Separate from `login()` on purpose: platform admins live in their own
   * collection, carry no practice, and must never be reachable through the
   * practice login (or vice versa). A practitioner's credentials will not
   * authenticate here because this only ever looks in `platformadmins`.
   */
  async platformLogin(dto: PlatformLoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const admin = await this.platformAdminModel
      .findOne({ email: normalizedEmail })
      .select('+password')
      .exec();

    // Same generic message either way — this endpoint must not reveal
    // whether a given address is a platform account.
    if (!admin) {
      this.logger.warn('Platform login attempt for unknown email');
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) {
      this.logger.warn(`Failed platform login for ${admin._id.toString()}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('This account has been disabled');
    }

    await this.platformAdminModel
      .updateOne({ _id: admin._id }, { lastLoginAt: new Date() })
      .exec();

    const accessToken = this.jwtService.sign({
      sub: admin._id.toString(),
      role: Role.SUPER_ADMIN,
      // Explicit: a platform admin belongs to no practice.
      practiceId: null,
    });

    this.logger.log(`Platform admin ${admin._id.toString()} signed in`);

    return {
      access_token: accessToken,
      id: admin._id.toString(),
      role: Role.SUPER_ADMIN,
      name: admin.name,
      mustChangePassword: !!admin.mustChangePassword,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const role = dto.role as unknown as Role;
    const normalizedEmail = dto.email.toLowerCase().trim();
    const model = this.getModelForRole(role);

    const user = (await model.findOne({
      email: normalizedEmail,
    })) as UserDocument | null;

    // Always return a generic response so this endpoint can't be used to
    // enumerate which emails have accounts.
    const genericResponse = {
      message:
        'If an account exists for that email, a temporary password has been generated.',
    };

    if (!user) {
      this.logger.warn(`Forgot-password requested for unknown ${role} email`);
      return genericResponse;
    }

    const tempPassword = generateTempPassword();
    user.password = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    user.mustChangePassword = true;
    user.tempPasswordExpiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_MS);
    await user.save();

    this.logger.log(
      `Temporary password issued for ${role} ${user._id.toString()}`,
    );

    // Dev-only: since this app has no email/SMS provider wired up yet, the
    // temp password is "simulated" by returning it directly in the response.
    // Gated on two independent env vars, not just NODE_ENV — a production
    // deploy that forgets to set NODE_ENV is still safe unless someone has
    // *also* explicitly opted into the echo, which nobody does by accident.
    const devEchoAllowed =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_DEV_PASSWORD_RESET_ECHO === 'true';

    if (!devEchoAllowed) {
      return genericResponse;
    }

    return {
      ...genericResponse,
      devTempPassword: tempPassword,
      devNote:
        'DEV ONLY: returned because ALLOW_DEV_PASSWORD_RESET_ECHO=true. Never set this in production.',
    };
  }

  async changePassword(userId: string, role: Role, dto: ChangePasswordDto) {
    const model = this.getModelForRole(role);
    const user = (await model.findById(userId)) as UserDocument | null;

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    user.password = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    user.mustChangePassword = false;
    user.tempPasswordExpiresAt = undefined;
    await user.save();

    this.logger.log(`Password changed for ${role} ${user._id.toString()}`);

    return { message: 'Password updated successfully' };
  }
}
