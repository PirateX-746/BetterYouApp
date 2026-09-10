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

import { LoginDto } from './dto/login.dto';
import { CreatePatientDto } from './dto/patient-signup.dto';

import { Patient } from '../patients/schemas/patient.schema';
import { Practitioner } from '../practitioners/schemas/practitioner.schema';
import { Role } from '../common/role.enum';

type UserDocument = (Patient | Practitioner) &
  Document & {
    password: string;
    role: string;
    firstName: string;
    lastName?: string;
  };

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<Patient>,

    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,

    private readonly jwtService: JwtService,
  ) {}

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

    if (user.role.toLowerCase() !== role.toLowerCase()) {
      throw new UnauthorizedException(
        'You are trying to access the wrong portal',
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
        user.role === Role.PRACTITIONER
          ? `${user.firstName} ${user.lastName}`
          : user.firstName,
    };
  }
}
