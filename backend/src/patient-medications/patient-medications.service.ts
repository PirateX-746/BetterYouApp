import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PatientMedication } from './schemas/patient-medication.schema';
import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';
import { practiceScopeFilter, practiceStamp } from '../common/tenancy/practice-scope';

const MEDICATION_FIELDS = 'name category description';

@Injectable()
export class PatientMedicationsService {
  constructor(
    @InjectModel(PatientMedication.name)
    private readonly patientMedicationModel: Model<PatientMedication>,
  ) {}

  async create(dto: CreatePatientMedicationDto, practiceId: string | null) {
    const record = await this.patientMedicationModel.create({
      ...dto,
      practiceId: practiceStamp(practiceId),
    });
    return this.patientMedicationModel
      .findById(record._id)
      .populate('patientId', 'firstName lastName email')
      .populate('medicationId', MEDICATION_FIELDS)
      .lean();
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.patientMedicationModel
      .find({ patientId: new Types.ObjectId(patientId), ...practiceScopeFilter(practiceId) })
      .populate('practitionerId', 'firstName lastName')
      .populate('medicationId', MEDICATION_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string, practiceId: string | null) {
    return this.patientMedicationModel
      .find({ practitionerId: new Types.ObjectId(practitionerId), ...practiceScopeFilter(practiceId) })
      .populate('patientId', 'firstName lastName email')
      .populate('medicationId', MEDICATION_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string, practiceId: string | null) {
    const record = await this.patientMedicationModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .populate('patientId', 'firstName lastName email')
      .populate('practitionerId', 'firstName lastName')
      .populate('medicationId', MEDICATION_FIELDS)
      .lean();
    if (!record) throw new NotFoundException('Patient medication not found');
    return record;
  }

  async update(id: string, dto: UpdatePatientMedicationDto, practiceId: string | null) {
    const record = await this.patientMedicationModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: dto },
        { new: true },
      )
      .populate('patientId', 'firstName lastName email')
      .populate('medicationId', MEDICATION_FIELDS)
      .lean();
    if (!record) throw new NotFoundException('Patient medication not found');
    return record;
  }

  async remove(id: string, practiceId: string | null) {
    const record = await this.patientMedicationModel.findOneAndDelete({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });
    if (!record) throw new NotFoundException('Patient medication not found');
    return { deleted: true };
  }

}
