import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TreatmentPlan } from './schemas/treatment-plan.schema';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { assertPatientInPractice } from '../common/tenancy/assert-in-practice';
import { withObjectIds } from '../common/object-ids';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import {
  practiceScopeFilter,
  practiceStamp,
} from '../common/tenancy/practice-scope';

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
export class TreatmentPlansService {
  constructor(
    @InjectModel(TreatmentPlan.name)
    private readonly treatmentPlanModel: Model<TreatmentPlan>,
  ) {}

  async create(dto: CreateTreatmentPlanDto, practiceId: string | null) {
    await assertPatientInPractice(
      this.treatmentPlanModel.db,
      dto.patientId,
      practiceId,
    );
    const plan = await this.treatmentPlanModel.create(
      withObjectIds({ ...dto, practiceId: practiceStamp(practiceId) }, [
        'patientId',
        'practitionerId',
      ]),
    );
    return this.treatmentPlanModel
      .findById(plan._id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.treatmentPlanModel
      .find({
        patientId: new Types.ObjectId(patientId),
        ...practiceScopeFilter(practiceId),
      })
      .populate('practitionerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string, practiceId: string | null) {
    return this.treatmentPlanModel
      .find({
        practitionerId: new Types.ObjectId(practitionerId),
        ...practiceScopeFilter(practiceId),
      })
      .populate('patientId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string, practiceId: string | null) {
    const plan = await this.treatmentPlanModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  async update(
    id: string,
    dto: UpdateTreatmentPlanDto,
    practiceId: string | null,
  ) {
    const plan = await this.treatmentPlanModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: editable(dto, []) },
        { new: true },
      )
      .populate('patientId', 'firstName lastName')
      .lean();
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  async remove(id: string, practiceId: string | null) {
    const plan = await this.treatmentPlanModel.findOneAndDelete({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return { deleted: true };
  }
}
