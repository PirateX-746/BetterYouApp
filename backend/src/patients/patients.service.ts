// src/patients/patients.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { Patient, PatientDocument } from './schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { Role } from '../common/role.enum';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) { }

  /* ===============================
     GENERATE MRN (Better Version)
     =============================== */
  private async generateMRN(): Promise<string> {
    const year = new Date().getFullYear();

    // Count only patients created this year
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year + 1}-01-01`);

    const count = await this.patientModel.countDocuments({
      createdAt: { $gte: startOfYear, $lt: endOfYear },
    });

    const padded = String(count + 1).padStart(4, '0');

    return `MRN-${year}-${padded}`;
  }

  /* ===============================
     CREATE PATIENT
     =============================== */
  async create(dto: CreatePatientDto) {
    // 🔹 Check duplicate email or phone
    const existing = await this.patientModel.findOne({
      $or: [{ email: dto.email }, { phoneNo: dto.phoneNo }],
    });

    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      if (existing.phoneNo === dto.phoneNo) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // 🔹 Generate MRN
    const mrn = await this.generateMRN();

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const patient = await this.patientModel.create({
      ...dto,
      mrn,
      password: hashedPassword,
      dateOfBirth: new Date(dto.dateOfBirth),
      lastVisit: dto.lastVisit ? new Date(dto.lastVisit) : undefined,
      role: dto.role ?? Role.PATIENT,
      isActive: dto.isActive ?? true,
    });

    const { password, ...result } = patient.toObject();
    return result;
  }

  /* ===============================
     GET ALL ACTIVE PATIENTS
     =============================== */
  async findAll() {
    return this.patientModel
      .find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
  }

  /* ===============================
     GET PATIENT BY ID
     =============================== */
  async findById(id: string) {
    const patient = await this.patientModel
      .findById(id)
      .select('-password')
      .lean();

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }
}