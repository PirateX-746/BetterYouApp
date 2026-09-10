import { IsEmail, IsIn } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsIn(['patient', 'practitioner'])
  role: 'patient' | 'practitioner';
}
