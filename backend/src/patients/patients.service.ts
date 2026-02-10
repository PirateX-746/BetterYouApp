import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient, PatientDocument } from './schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

  // ✅ Now this WILL return data
  async findAll() {
    return this.patientModel
      .find({ isActive: true })
      .select('-password') // 🔐 hide password
      .exec();
  }

  async create(data: CreatePatientDto) {
    return this.patientModel.create(data);
  }
}
