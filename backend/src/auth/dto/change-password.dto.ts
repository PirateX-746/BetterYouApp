import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  /**
   * Required unless the account is on a temporary password — the forced
   * change right after signing in with one, where the temp password was
   * just proven at login.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain 1 uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain 1 number' })
  @Matches(/[!@#$%^&*]/, {
    message: 'Password must contain 1 special character',
  })
  newPassword: string;
}
