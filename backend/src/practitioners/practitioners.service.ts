import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Practitioner } from './schemas/practitioner.schema';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';
import { practiceScopeFilter } from '../common/tenancy/practice-scope';

@Injectable()
export class PractitionersService {
  constructor(
    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,
  ) {}

  async findAll(practiceId: string | null) {
    return this.practitionerModel
      .find(practiceScopeFilter(practiceId))
      .select('-password -avatarBase64')
      .lean();
  }

  async findById(id: string, practiceId: string | null) {
    const doc = await this.practitionerModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .select('-password')
      .lean();
    if (!doc) throw new NotFoundException('Practitioner not found');
    return doc;
  }

  /**
   * Unscoped lookup for internal server-to-server use only (e.g.
   * AppointmentsService resolving practice hours for availability) — never
   * call this from a controller with a client-supplied id, since it skips
   * the practice check that `findById` enforces.
   */
  async findByIdInternal(id: string) {
    const doc = await this.practitionerModel
      .findById(id)
      .select('-password')
      .lean();
    if (!doc) throw new NotFoundException('Practitioner not found');
    return doc;
  }

  async update(id: string, dto: UpdatePractitionerDto, practiceId: string | null) {
    const updated = await this.practitionerModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: dto },
        { new: true },
      )
      .select('-password')
      .lean();
    if (!updated) throw new NotFoundException('Practitioner not found');
    return updated;
  }
}
