import {
  IsString,
  IsEmail,
  IsDateString,
  IsEnum,
  MinLength,
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
  gender: string;

  @IsEnum(Role)
  role: Role;
}
