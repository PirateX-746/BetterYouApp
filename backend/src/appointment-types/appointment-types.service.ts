import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppointmentType } from './schemas/appointment-type.schema';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto';
import { DEFAULT_APPOINTMENT_TYPES } from './appointment-types.defaults';
import { Practitioner } from '../practitioners/schemas/practitioner.schema';
import { practiceScopeFilter } from '../common/tenancy/practice-scope';

const isDuplicateKey = (err: unknown) =>
  (err as { code?: number } | null)?.code === 11000;

@Injectable()
export class AppointmentTypesService {
  constructor(
    @InjectModel(AppointmentType.name)
    private readonly typeModel: Model<AppointmentType>,
    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,
  ) {}

  /** Every type the practitioner owns, active or not, in display order. */
  async findOwn(practitionerId: string) {
    await this.ensureSeeded(practitionerId);
    return this.typeModel
      .find({ practitionerId: new Types.ObjectId(practitionerId) })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
  }

  /**
   * What a patient may book with this practitioner: active types only, and
   * only when the practitioner is in the patient's own practice.
   */
  async findBookable(practitionerId: string, practiceId: string | null) {
    if (!Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID');
    }
    const practitioner = await this.practitionerModel.exists({
      _id: new Types.ObjectId(practitionerId),
      ...practiceScopeFilter(practiceId),
    });
    if (!practitioner) throw new NotFoundException('Practitioner not found');

    await this.ensureSeeded(practitionerId);
    return this.typeModel
      .find({
        practitionerId: new Types.ObjectId(practitionerId),
        isActive: true,
      })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
  }

  async create(dto: CreateAppointmentTypeDto, practitionerId: string) {
    const owner = new Types.ObjectId(practitionerId);
    // Seed first, so a practitioner whose very first action is "Add type"
    // still gets the starter list rather than losing it for good.
    await this.ensureSeeded(practitionerId);

    const last = await this.typeModel
      .findOne({ practitionerId: owner })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const practiceId = await this.practiceIdOf(practitionerId);

    try {
      const created = await this.typeModel.create({
        ...dto,
        practitionerId: owner,
        practiceId,
        nameKey: dto.name.toLowerCase(),
        sortOrder: dto.sortOrder ?? (last ? last.sortOrder + 1 : 0),
      });
      return this.typeModel.findById(created._id).lean();
    } catch (err) {
      if (isDuplicateKey(err)) throw this.duplicateName(dto.name);
      throw err;
    }
  }

  async update(id: string, dto: UpdateAppointmentTypeDto, requesterId: string) {
    await this.findOwned(id, requesterId);
    const set: Record<string, unknown> = { ...dto };
    if (dto.name !== undefined) set.nameKey = dto.name.toLowerCase();
    try {
      return await this.typeModel
        .findByIdAndUpdate(id, { $set: set }, { new: true })
        .lean();
    } catch (err) {
      if (isDuplicateKey(err)) throw this.duplicateName(dto.name ?? '');
      throw err;
    }
  }

  /**
   * Hard delete. Appointments already booked keep their copied title, so
   * history is unaffected; to stop new bookings but keep the type around,
   * deactivate it instead.
   */
  async remove(id: string, requesterId: string) {
    await this.findOwned(id, requesterId);
    await this.typeModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  /**
   * The type an appointment is being booked as. It must belong to the
   * appointment's practitioner; `requireActive` is relaxed only when an
   * existing appointment keeps the type it already had.
   */
  async resolveForBooking(
    typeId: string,
    practitionerId: string,
    { requireActive }: { requireActive: boolean },
  ) {
    if (!Types.ObjectId.isValid(typeId)) {
      throw new BadRequestException('Invalid appointment type');
    }
    const type = await this.typeModel
      .findOne({
        _id: new Types.ObjectId(typeId),
        practitionerId: new Types.ObjectId(practitionerId),
      })
      .lean();
    if (!type) throw new BadRequestException('Unknown appointment type');
    if (requireActive && !type.isActive) {
      throw new BadRequestException(
        `"${type.name}" is inactive and can no longer be booked`,
      );
    }
    return type;
  }

  private async findOwned(id: string, requesterId: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    const type = await this.typeModel.findById(id).lean();
    if (!type) throw new NotFoundException('Appointment type not found');
    if (String(type.practitionerId) !== requesterId) {
      throw new ForbiddenException(
        'This appointment type does not belong to you',
      );
    }
    return type;
  }

  /**
   * Gives a practitioner the default list exactly once. The flag is claimed
   * atomically before inserting, so two concurrent first requests can't both
   * seed, and deleting every type later doesn't bring the defaults back.
   */
  private async ensureSeeded(practitionerId: string) {
    const claimed = await this.practitionerModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(practitionerId),
          appointmentTypesSeededAt: { $exists: false },
        },
        { $set: { appointmentTypesSeededAt: new Date() } },
      )
      .select('practiceId')
      .lean();
    if (!claimed) return;

    const owner = new Types.ObjectId(practitionerId);
    try {
      await this.typeModel.insertMany(
        DEFAULT_APPOINTMENT_TYPES.map((t, i) => ({
          ...t,
          practitionerId: owner,
          practiceId: claimed.practiceId,
          nameKey: t.name.toLowerCase(),
          isActive: true,
          sortOrder: i,
        })),
        { ordered: false },
      );
    } catch (err) {
      // A same-named type the practitioner already had wins; seed the rest.
      if (!isDuplicateKey(err)) throw err;
    }
  }

  private async practiceIdOf(practitionerId: string) {
    const p = await this.practitionerModel
      .findById(practitionerId)
      .select('practiceId')
      .lean();
    return p?.practiceId;
  }

  private duplicateName(name: string) {
    return new ConflictException(
      `You already have an appointment type named "${name}"`,
    );
  }
}
