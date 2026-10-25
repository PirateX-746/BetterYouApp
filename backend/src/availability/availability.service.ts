import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AvailabilityDocument,
  Availability,
} from './schemas/availability.schema';
import { BlockSlotDto } from './dto/block-slot.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async fetchBlockedSlots(practitionerId: string) {
    if (!practitionerId || !Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID');
    }
    return this.availabilityModel
      .find({ practitionerId: new Types.ObjectId(practitionerId) })
      .exec();
  }

  async blockSlot(practitionerId: string, dto: BlockSlotDto) {
    const { blockType, date, startTime, endTime, reason } = dto;

    // Validate practitioner ID is a valid ObjectId
    if (!Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID format.');
    }

    if (blockType === 'slot' && (!startTime || !endTime)) {
      throw new BadRequestException(
        'Start and end times are required for slot blocks.',
      );
    }
    // "HH:mm" strings compare in time order.
    if (blockType === 'slot' && endTime! <= startTime!) {
      throw new BadRequestException('End time must be after start time.');
    }

    const owner = new Types.ObjectId(practitionerId);
    // Only "slot" blocks carry times; a "day" block's null times are dropped.
    const times =
      blockType === 'slot'
        ? { startTime: startTime ?? undefined, endTime: endTime ?? undefined }
        : {};
    // Very basic collision detection: an exact duplicate of an existing block.
    const existingBlock = await this.availabilityModel.findOne({
      practitionerId: owner,
      date,
      blockType,
      ...times,
    });

    if (existingBlock) {
      throw new BadRequestException(
        'This exact availability block already exists.',
      );
    }

    return this.availabilityModel.create({
      practitionerId: owner,
      blockType,
      date,
      ...times,
      reason,
    });
  }

  async deleteBlock(blockId: string, requesterId: string) {
    if (!blockId || !Types.ObjectId.isValid(blockId)) {
      throw new BadRequestException('Invalid block ID');
    }
    const block = await this.availabilityModel.findById(blockId);
    if (!block) {
      throw new BadRequestException('Block not found');
    }
    if (String(block.practitionerId) !== requesterId) {
      throw new ForbiddenException('This block does not belong to you');
    }
    await block.deleteOne();
    return block;
  }
}
