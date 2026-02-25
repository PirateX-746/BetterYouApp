import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { Availability, AvailabilitySchema } from './schemas/availability.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Availability.name, schema: AvailabilitySchema },
        ]),
    ],
    controllers: [AvailabilityController],
    providers: [AvailabilityService],
    exports: [AvailabilityService]
})
export class AvailabilityModule { }
