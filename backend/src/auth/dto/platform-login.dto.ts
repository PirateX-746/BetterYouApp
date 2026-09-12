import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Platform console sign-in.
 *
 * Deliberately has no `role` field, unlike LoginDto: there is exactly one
 * platform role, and the caller does not get to name it. Keeping this
 * separate from the practice login also means the two entrances cannot be
 * confused — a practitioner's credentials will never authenticate here.
 */
export class PlatformLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
