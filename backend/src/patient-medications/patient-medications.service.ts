import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PatientMedication } from './schemas/patient-medication.schema';
import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { assertPatientInPractice } from '../common/tenancy/assert-in-practice';
import { withObjectIds } from '../common/object-ids';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';
import {
  practiceScopeFilter,
  practiceStamp,
} from '../common/tenancy/practice-scope';

const MEDICATION_FIELDS = 'name category description';

/**
 * The patient and author are fixed at creation; an update can't move a
 * record to another patient or re-attribute it.
 */
function editable<T extends { patientId?: string; practitionerId?: string }>(
  dto: T,
  idKeys: string[],
) {
  const {
    patientId: _patientId,
    practitionerId: _practitionerId,
    ...rest
  } = dto;
  return withObjectIds(rest, idKeys);
}

@Injectable()
export class PatientMedicationsService {
  constructor(
    @InjectModel(PatientMedication.name)
    private readonly patientMedicationModel: Model<PatientMedication>,
  ) {}

  async create(dto: CreatePatientMedicationDto, practiceId: string | null) {
    const db = this.patientMedicationModel.db;
    await assertPatientInPractice(db, dto.patientId, practiceId);
    // Prescribed from the prescriber's own library (ids are stored as
    // strings by the API and as ObjectIds by older seeds).
    const inLibrary = await db.model('Medication').exists({
      _id: new Types.ObjectId(dto.medicationId),
      practitionerId: {
        $in: [dto.practitionerId, new Types.ObjectId(dto.practitionerId)],
      },
    });
    if (!inLibrary) throw new BadRequestException('Medication not found');
    const record = await this.patientMedicationModel.create(
      withObjectIds({ ...dto, practiceId: practiceStamp(practiceId) }, [
        'patientId',
        'practitionerId',
        'medicationId',
      ]),
    );
    return this.patientMedicationModel
      .findById(record._id)
      .populate('patientId', 'firstName lastName email')
      .populate('medicationId', MEDICATION_FIELDS)
      .lean();
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.patientMedicationModel
      .find({
        patientId: new Types.ObjectId(patientId),
        ...practiceScopeFilter(practiceId),
      })
      .populate('practitionerId', 'firstName lastName')
      .populate('medicationId', MEDICATION_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string, practiceId: string | null) {
    return this.patientMedicationModel
      .find({
        practitionerId: new Types.ObjectId(practitionerId),
        ...practiceScopeFilter(practiceId),
      })
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

  async update(
    id: string,
    dto: UpdatePatientMedicationDto,
    practiceId: string | null,
  ) {
    const record = await this.patientMedicationModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: editable(dto, ['medicationId']) },
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
