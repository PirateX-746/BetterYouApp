import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class PractitionerSignupDto {
  @IsString()
  firstName: string;

  @IsOptional()
  lastname: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  specialization: string;

  @IsOptional()
  @IsNumber()
  experienceYears?: number;
}
