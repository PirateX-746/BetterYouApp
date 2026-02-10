import { IsOptional, IsISO8601, IsString, IsEnum } from 'class-validator';
import { AppointmentStatus } from '../schemas/appointment.schema';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsISO8601()
  start?: string;

  @IsOptional()
  @IsISO8601()
  end?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
