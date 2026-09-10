import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medication } from './schemas/medication.schema';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name)
    private readonly medicationModel: Model<Medication>,
  ) {}

  create(dto: CreateMedicationDto) {
    return this.medicationModel.create(dto);
  }

  findByPractitioner(practitionerId: string, search?: string) {
    const filter: Record<string, unknown> = { practitionerId };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    return this.medicationModel.find(filter).sort({ name: 1 }).lean();
  }

  async findById(id: string) {
    const medication = await this.medicationModel.findById(id).lean();
    if (!medication) throw new NotFoundException('Medication not found');
    return medication;
  }

  async update(id: string, dto: UpdateMedicationDto) {
    const medication = await this.medicationModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean();
    if (!medication) throw new NotFoundException('Medication not found');
    return medication;
  }

  async remove(id: string) {
    const medication = await this.medicationModel.findByIdAndDelete(id);
    if (!medication) throw new NotFoundException('Medication not found');
    return { deleted: true };
  }
}
