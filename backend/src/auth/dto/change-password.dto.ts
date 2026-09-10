import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain 1 uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain 1 number' })
  @Matches(/[!@#$%^&*]/, {
    message: 'Password must contain 1 special character',
  })
  newPassword: string;
}
