import { IsString, IsDateString, IsEnum } from 'class-validator';
import { AppointmentStatus } from '../schemas/appointment.schema';

export class CreateAppointmentDto {
  @IsString()
  title: string;

  @IsString()
  patientId: string;

  @IsString()
  practitionerId: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
