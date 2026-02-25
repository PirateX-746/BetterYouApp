import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AvailabilityDocument, Availability } from './schemas/availability.schema';

@Injectable()
export class AvailabilityService {
    constructor(
        @InjectModel(Availability.name)
        private readonly availabilityModel: Model<AvailabilityDocument>,
    ) { }

    async fetchBlockedSlots(practitionerId: string) {
        return this.availabilityModel.find({ practitionerId: new Types.ObjectId(practitionerId) }).exec();
    }

    async blockSlot(data: any) {
        const { practitionerId, blockType, date, startTime, endTime, reason } = data;

        if (!practitionerId || !blockType || !date) {
            throw new BadRequestException('PractitionerId, blockType, and date are required.');
        }

        if (blockType === 'slot' && (!startTime || !endTime)) {
            throw new BadRequestException('Start and end times are required for slot blocks.');
        }

        // Check for duplicate blocks
        const query: any = {
            practitionerId: new Types.ObjectId(practitionerId),
            date,
            blockType,
        };

        if (blockType === 'slot') {
            // Very basic collision detection for exact matching slots.
            // Evolving overlap overlap detection logic might be needed depending on the strictness of block entries.
            query.startTime = startTime;
            query.endTime = endTime;
        }

        const existingBlock = await this.availabilityModel.findOne(query);

        if (existingBlock) {
            throw new BadRequestException('This exact availability block already exists.');
        }

        return this.availabilityModel.create({
            practitionerId: new Types.ObjectId(practitionerId),
            blockType,
            date,
            startTime: blockType === 'slot' ? startTime : undefined,
            endTime: blockType === 'slot' ? endTime : undefined,
            reason,
        });
    }

    async deleteBlock(blockId: string) {
        const deleted = await this.availabilityModel.findByIdAndDelete(new Types.ObjectId(blockId));
        if (!deleted) {
            throw new BadRequestException('Block not found');
        }
        return deleted;
    }
}
