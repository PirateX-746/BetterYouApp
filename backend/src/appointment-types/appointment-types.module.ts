import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AppointmentType,
  AppointmentTypeSchema,
} from './schemas/appointment-type.schema';
import {
  Practitioner,
  PractitionerSchema,
} from '../practitioners/schemas/practitioner.schema';
import { AppointmentTypesController } from './appointment-types.controller';
import { AppointmentTypesService } from './appointment-types.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppointmentType.name, schema: AppointmentTypeSchema },
      { name: Practitioner.name, schema: PractitionerSchema },
    ]),
  ],
  controllers: [AppointmentTypesController],
  providers: [AppointmentTypesService],
  exports: [AppointmentTypesService],
})
export class AppointmentTypesModule {}
