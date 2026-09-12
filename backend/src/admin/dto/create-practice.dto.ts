import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PracticeStatus } from '../../practices/schemas/practice.schema';
import { PlanKey } from '../../subscriptions/schemas/plan.schema';
import { Role } from '../../common/role.enum';

export class CreatePracticeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, {
    message:
      'subdomain must be 3–30 lowercase letters, digits or hyphens, and cannot start or end with a hyphen',
  })
  subdomain: string;

  @IsString()
  @MinLength(2)
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() timezone?: string;

  @IsOptional()
  @IsIn([PracticeStatus.TRIAL, PracticeStatus.ACTIVE])
  status?: PracticeStatus;
}

export class UpdatePracticeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() timezone?: string;
  // Note: subdomain is intentionally absent — it is immutable once created.
}

export class SetPracticeStatusDto {
  @IsIn(Object.values(PracticeStatus))
  status: PracticeStatus;
}

export class ChangePlanDto {
  @IsIn(Object.values(PlanKey))
  plan: PlanKey;
}

/** Roles a practice may be invited into — never SUPER_ADMIN or PATIENT. */
export class InvitePractitionerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsIn([Role.PRACTICE_ADMIN, Role.PRACTITIONER, Role.STAFF])
  role: Role;
}
