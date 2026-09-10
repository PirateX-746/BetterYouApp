import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TreatmentPlan } from './schemas/treatment-plan.schema';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';

@Injectable()
export class TreatmentPlansService {
  constructor(
    @InjectModel(TreatmentPlan.name)
    private readonly treatmentPlanModel: Model<TreatmentPlan>,
  ) {}

  async create(dto: CreateTreatmentPlanDto) {
    const plan = await this.treatmentPlanModel.create(dto);
    return this.treatmentPlanModel
      .findById(plan._id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
  }

  async findByPatient(patientId: string) {
    return this.treatmentPlanModel
      .find({ patientId })
      .populate('practitionerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string) {
    return this.treatmentPlanModel
      .find({ practitionerId })
      .populate('patientId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string) {
    const plan = await this.treatmentPlanModel
      .findById(id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  async update(id: string, dto: UpdateTreatmentPlanDto) {
    const plan = await this.treatmentPlanModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('patientId', 'firstName lastName')
      .lean();
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  async remove(id: string) {
    const plan = await this.treatmentPlanModel.findByIdAndDelete(id);
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return { deleted: true };
  }
}
