import { IsString, IsOptional, IsNumber, Min, Max, IsObject } from 'class-validator';

export class UpdatePractitionerDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  avatarBase64?: string;

  @IsOptional()
  @IsObject()
  practiceHours?: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;
}
