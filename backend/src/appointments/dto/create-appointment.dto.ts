import { IsString, IsDateString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { AppointmentStatus } from '../schemas/appointment.schema';

export class CreateAppointmentDto {
  // Required unless appointmentTypeId is given — then the type's name is used.
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsMongoId()
  appointmentTypeId?: string;

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
