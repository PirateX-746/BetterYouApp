import { IsEmail, IsString, IsDateString } from 'class-validator';

export class PatientSignupDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  gender: string;
}
