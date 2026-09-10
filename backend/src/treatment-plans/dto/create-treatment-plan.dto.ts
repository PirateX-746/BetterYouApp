import { IsString, IsNotEmpty, IsOptional, IsArray, IsDateString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GoalDto {
  @IsString() @IsNotEmpty()
  goal: string;

  @IsOptional() @IsEnum(['pending', 'in-progress', 'achieved'])
  status?: 'pending' | 'in-progress' | 'achieved';
}

export class CreateTreatmentPlanDto {
  @IsString() @IsNotEmpty()
  patientId: string;

  @IsString() @IsNotEmpty()
  practitionerId: string;

  @IsString() @IsNotEmpty()
  title: string;

  @IsDateString()
  startDate: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GoalDto)
  goals?: GoalDto[];

  @IsOptional() @IsArray() @IsString({ each: true })
  interventions?: string[];

  @IsOptional() @IsEnum(['active', 'completed', 'paused'])
  status?: string;

  @IsOptional() @IsString()
  notes?: string;
}
