import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { LoginDto } from './dto/login.dto';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { PractitionerSignupDto } from './dto/practitioner-signup.dto';

import { Patient } from '../patients/schemas/patient.schema';
import { Practitioner } from '../practitioners/schemas/practitioner.schema';
import { Role } from '../common/role.enum';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<Patient>,

    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,

    private readonly jwtService: JwtService, // ✅ REQUIRED
  ) { }

  //Patient Signup

  async patientSignup(dto: PatientSignupDto) {
    const exists = await this.patientModel.findOne({ email: dto.email });
    if (exists) {
      throw new BadRequestException('Patient already exists');
    }

    const patient = await this.patientModel.create({
      ...dto,
      password: await bcrypt.hash(dto.password, SALT_ROUNDS),
      dateOfBirth: new Date(dto.dateOfBirth),
      role: Role.PATIENT,
    });

    const { password, ...result } = patient.toObject();
    return result;
  }

  //Practitioner Signup

  async practitionerSignup(dto: PractitionerSignupDto) {
    const exists = await this.practitionerModel.findOne({ email: dto.email });
    if (exists) {
      throw new BadRequestException('Practitioner already exists');
    }

    const practitioner = await this.practitionerModel.create({
      ...dto,
      password: await bcrypt.hash(dto.password, SALT_ROUNDS),
      dateOfBirth: new Date(dto.dateOfBirth),
      role: Role.PRACTITIONER,
    });

    const { password, ...result } = practitioner.toObject();
    return result;
  }

  //LOGIN + JWT
  async login(loginDto: LoginDto) {
    const { email, password, role } = loginDto;

    console.log("Incoming email:", email);
    console.log("Incoming password:", password);
    console.log("Incoming role:", role);

    let user: any;

    if (role.toLowerCase() === 'practitioner') {
      user = await this.practitionerModel.findOne({ email });
      console.log("Looking in practitioner collection");
    } else {
      user = await this.patientModel.findOne({ email });
      console.log("Looking in patient collection");
    }

    console.log("User found:", !!user);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log("Stored hash:", user.password);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log("LOGIN SUCCESS");

    const payload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

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
