import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PatientMedication } from './schemas/patient-medication.schema';
import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';

const MEDICATION_FIELDS = 'name category description';

@Injectable()
export class PatientMedicationsService {
  constructor(
    @InjectModel(PatientMedication.name)
    private readonly patientMedicationModel: Model<PatientMedication>,
  ) {}

  async create(dto: CreatePatientMedicationDto) {
    const record = await this.patientMedicationModel.create(dto);
    return this.patientMedicationModel
      .findById(record._id)
      .populate('patientId', 'firstName lastName email')
      .populate('medicationId', MEDICATION_FIELDS)
      .lean();
  }

  async findByPatient(patientId: string) {
    return this.patientMedicationModel
      .find({ patientId })
      .populate('practitionerId', 'firstName lastName')
      .populate('medicationId', MEDICATION_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string) {
    return this.patientMedicationModel
      .find({ practitionerId })
      .populate('patientId', 'firstName lastName email')
      .populate('medicationId', MEDICATION_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string) {
    const record = await this.patientMedicationModel
      .findById(id)
      .populate('patientId', 'firstName lastName email')
      .populate('practitionerId', 'firstName lastName')
      .populate('medicationId', MEDICATION_FIELDS)
      .lean();
    if (!record) throw new NotFoundException('Patient medication not found');
    return record;
  }

  async update(id: string, dto: UpdatePatientMedicationDto) {
    const record = await this.patientMedicationModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('patientId', 'firstName lastName email')
      .populate('medicationId', MEDICATION_FIELDS)
      .lean();
    if (!record) throw new NotFoundException('Patient medication not found');
    return record;
  }

  async remove(id: string) {
    const record = await this.patientMedicationModel.findByIdAndDelete(id);
    if (!record) throw new NotFoundException('Patient medication not found');
    return { deleted: true };
  }
}
