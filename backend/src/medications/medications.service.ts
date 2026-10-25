import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async findById(id: string, requesterId: string) {
    const medication = await this.medicationModel.findById(id).lean();
    if (!medication) throw new NotFoundException('Medication not found');
    if (String(medication.practitionerId) !== requesterId) {
      throw new ForbiddenException('This medication does not belong to you');
    }
    return medication;
  }

  async update(id: string, dto: UpdateMedicationDto, requesterId: string) {
    await this.findById(id, requesterId);
    // Ownership is never reassignable through an update.
    const { practitionerId: _practitionerId, ...safeDto } = dto;
    const medication = await this.medicationModel
      .findByIdAndUpdate(id, { $set: safeDto }, { new: true })
      .lean();
    if (!medication) throw new NotFoundException('Medication not found');
    return medication;
  }

  async remove(id: string, requesterId: string) {
    await this.findById(id, requesterId);
    const medication = await this.medicationModel.findByIdAndDelete(id);
    if (!medication) throw new NotFoundException('Medication not found');
    return { deleted: true };
  }
}
