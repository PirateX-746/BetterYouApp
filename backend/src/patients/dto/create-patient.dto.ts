import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * A practitioner adding a patient. Deliberately has no `password`, `role` or
 * `isActive`: the server issues a one-time temporary password (see
 * PatientsService.create), the role is always patient, and new records are
 * always active. With forbidNonWhitelisted on, sending any of them is a 400.
 */
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
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @IsOptional()
  // Empty clears it on update.
  @Matches(/^([0-9+()\-\s]{7,20})?$/, {
    message: 'Emergency contact phone must be a valid phone number',
  })
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  emergencyContactRelation?: string;

  @IsOptional()
  @IsString()
  avatarBase64?: string;
}
