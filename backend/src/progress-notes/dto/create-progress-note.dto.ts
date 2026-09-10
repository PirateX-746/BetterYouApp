import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsDateString, Min, Max } from 'class-validator';

export class CreateProgressNoteDto {
  @IsString() @IsNotEmpty()
  patientId: string;

  @IsString() @IsNotEmpty()
  practitionerId: string;

  @IsString() @IsNotEmpty()
  title: string;

  @IsDateString()
  sessionDate: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsNumber() @Min(1) @Max(10)
  progressScore?: number;

  @IsOptional() @IsString()
  mood?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  symptoms?: string[];

  @IsOptional() @IsString()
  observations?: string;

  @IsOptional() @IsString()
  nextSteps?: string;
}
