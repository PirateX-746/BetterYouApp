import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import {
  Practitioner,
  PractitionerSchema,
} from '../practitioners/schemas/practitioner.schema';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schema';

/**
 * PracticesModule and AuditModule are @Global, so their services are
 * available without importing them here.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: Practitioner.name, schema: PractitionerSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
