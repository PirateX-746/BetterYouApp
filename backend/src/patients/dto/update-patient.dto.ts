import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePatientDto } from './create-patient.dto';

/**
 * Profile fields only. `role`, `password` and `mrn` are not accepted from
 * anyone: the JWT strategy reads the role from this record on every request,
 * so a writable role was a privilege escalation (a patient could PATCH
 * themselves to practitioner). Passwords change via the change-password
 * routes. Email can be set or changed by the practice only (the service
 * ignores it when a patient edits their own profile).
 */
export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  /** Practitioners only — the controller drops it for a patient editing themselves. */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Opt in/out of appointment confirmation and reminder emails. */
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
