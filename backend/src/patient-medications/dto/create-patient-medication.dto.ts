import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class CreatePatientMedicationDto {
  @IsMongoId()
  patientId: string;

  @IsMongoId()
  practitionerId: string;

  @IsMongoId()
  medicationId: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['active', 'discontinued', 'completed'])
  status?: string;
}
