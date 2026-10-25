import { Transform } from 'class-transformer';
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

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePracticeDto {
  @Transform(trimmed)
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

  // Trimmed so "   " fails here, before the practice row is created —
  // otherwise the owner invitation fails after it and leaves it half-made.
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ownerName: string;

  @Transform(trimmed)
  @IsEmail()
  ownerEmail: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() timezone?: string;

  @IsOptional()
  @IsIn([PracticeStatus.TRIAL, PracticeStatus.ACTIVE])
  status?: PracticeStatus;
}

export class UpdatePracticeDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
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

export class SetPractitionerStatusDto {
  @IsIn(['ACTIVE', 'DISABLED'])
  status: 'ACTIVE' | 'DISABLED';
}

export class ChangePlanDto {
  @IsIn(Object.values(PlanKey))
  plan: PlanKey;
}

/** Roles a practice may be invited into — never SUPER_ADMIN or PATIENT. */
export class InvitePractitionerDto {
  @Transform(trimmed)
  @IsEmail()
  email: string;

  // Trimmed first: "   " passed MinLength and then failed in Mongoose (500).
  @Transform(trimmed)
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  @IsIn([Role.PRACTICE_ADMIN, Role.PRACTITIONER, Role.STAFF])
  role: Role;
}
