import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';
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

  // Optional — defaults to 'scheduled' in the schema if not provided
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
