import {
  IsString,
  IsEmail,
  IsDateString,
  IsEnum,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Role } from '../../common/role.enum';

export class CreatePatientDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dateOfBirth: string; // ISO string from frontend

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  phoneNo: string;

  @IsString()
  gender: string;

  @IsString()
  bloodGroup: string;

  @IsOptional()
  @IsDateString()
  lastVisit?: string;

  @IsOptional()
  @IsString()
  healthCondition?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role; // optional, default is PATIENT

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
