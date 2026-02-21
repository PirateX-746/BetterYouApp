import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

  private async generateMRN(): Promise<string> {
    const year = new Date().getFullYear();

    const count = await this.patientModel.countDocuments();
    const nextNumber = count + 1;

    const paddedNumber = String(nextNumber).padStart(4, '0');

    return `MRN-${year}-${paddedNumber}`;
  }

  /* ===============================
     CREATE PATIENT
     =============================== */
  async create(dto: CreatePatientDto) {
    // Check duplicate email
    const existing = await this.patientModel.findOne({ email: dto.email });
    if (existing) {
      throw new ConflictException('Patient already exists');
    }
    // Generate MRN
    const mrn = await this.generateMRN();

    // Check duplicate phoneNo
    const existingPhone = await this.patientModel.findOne({ phoneNo: dto.phoneNo });

    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const patient = new this.patientModel({
      ...dto,
      mrn,
      password: hashedPassword,
      dateOfBirth: new Date(dto.dateOfBirth),
      lastVisit: dto.lastVisit ? new Date(dto.lastVisit) : undefined,
      role: dto.role ?? Role.PATIENT,
      isActive: dto.isActive ?? true,
    });

    const saved = await patient.save();

    // Remove password before returning
    const { password, ...result } = saved.toObject();
    return result;
  }

  /* ===============================
     GET ALL PATIENTS
     =============================== */
  async findAll() {
    return this.patientModel
      .find({ isActive: true })
      .select('-password') // hide password
      .sort({ createdAt: -1 });
  }

  /* ===============================
     GET PATIENT BY ID
     =============================== */
  async findById(id: string) {
    const patient = await this.patientModel.findById(id).select('-password');
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }
}
