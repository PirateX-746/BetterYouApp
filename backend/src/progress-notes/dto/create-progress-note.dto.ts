import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsMongoId,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateProgressNoteDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  practitionerId: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200)
  title: string;

  @IsDateString()
  sessionDate: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  progressScore?: number;

  @IsOptional()
  @IsString()
  mood?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  nextSteps?: string;

  /* Follow-up section */

  @IsOptional()
  @IsMongoId()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actionItems?: string[];

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}
