import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
  ValidateBy,
} from 'class-validator';
import {
  AVATAR_DATA_URL,
  AVATAR_MAX_LENGTH,
} from '../../practitioners/dto/update-practitioner.dto';

// Mirrors frontend/src/schemas/patient.schema.ts so a direct API call gets a
// 400 for the same input the form rejects, rather than a 500 from Mongoose.
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const GENDERS = ['male', 'female', 'other'] as const;
export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
] as const;

/** Not in the future, and not before 1900. */
const IsRealisticBirthDate = () =>
  ValidateBy({
    name: 'isRealisticBirthDate',
    validator: {
      validate: (value: unknown) => {
        const d = new Date(String(value));
        return (
          !Number.isNaN(d.getTime()) &&
          d <= new Date() &&
          d.getFullYear() >= 1900
        );
      },
      defaultMessage: () =>
        'dateOfBirth must be a past date no earlier than 1900',
    },
  });

/**
 * A practitioner adding a patient. Deliberately has no `password`, `role` or
 * `isActive`: the server issues a one-time temporary password (see
 * PatientsService.create), the role is always patient, and new records are
 * always active. With forbidNonWhitelisted on, sending any of them is a 400.
 */
export class CreatePatientDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(60)
  firstName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(60)
  lastName: string;

  @IsDateString()
  @IsRealisticBirthDate()
  dateOfBirth: string; // ISO string from frontend

  @Transform(trim)
  @IsEmail()
  email: string;

  @Transform(trim)
  @Matches(/^[6-9]\d{9}$/, {
    message: 'phoneNo must be a valid 10-digit mobile number',
  })
  phoneNo: string;

  // Lower-cased first: older records were seeded as "Male".
  @Transform(lower)
  @IsIn(GENDERS, { message: `gender must be one of: ${GENDERS.join(', ')}` })
  gender: string;

  @IsIn(BLOOD_GROUPS, {
    message: `bloodGroup must be one of: ${BLOOD_GROUPS.join(', ')}`,
  })
  bloodGroup: string;

  @IsOptional()
  @IsDateString()
  lastVisit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  healthCondition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
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
  @MaxLength(AVATAR_MAX_LENGTH, { message: 'Profile photo must be under 2 MB' })
  @Matches(AVATAR_DATA_URL, {
    message: 'Profile photo must be a PNG, JPEG, GIF or WebP image',
  })
  avatarBase64?: string;
}
