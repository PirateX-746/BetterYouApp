import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { AppointmentsGateway } from './appointments.gateway';
import { AvailabilityModule } from '../availability/availability.module';
import { PractitionersModule } from '../practitioners/practitioners.module';
import { AppointmentTypesModule } from '../appointment-types/appointment-types.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AvailabilityModule,
    PractitionersModule,
    AppointmentTypesModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsGateway],
})
export class AppointmentsModule {}
