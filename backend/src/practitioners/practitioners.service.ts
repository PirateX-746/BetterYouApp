import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Practitioner } from './schemas/practitioner.schema';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';

@Injectable()
export class PractitionersService {
  constructor(
    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,
  ) {}

  async findAll() {
    return this.practitionerModel.find().select('-password -avatarBase64').lean();
  }

  async findById(id: string) {
    const doc = await this.practitionerModel
      .findById(id)
      .select('-password')
      .lean();
    if (!doc) throw new NotFoundException('Practitioner not found');
    return doc;
  }

  async update(id: string, dto: UpdatePractitionerDto) {
    const updated = await this.practitionerModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .select('-password')
      .lean();
    if (!updated) throw new NotFoundException('Practitioner not found');
    return updated;
  }
}
