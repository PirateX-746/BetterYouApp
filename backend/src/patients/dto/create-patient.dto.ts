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
import { IsInternationalPhone, toE164 } from '../../common/phone';

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

/** Letters (any script), spaces, apostrophes, hyphens and dots. */
export const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
const NAME_MSG = (label: string) =>
  `${label} can only contain letters, spaces, apostrophes, hyphens and dots`;

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
  @Matches(NAME_RE, { message: NAME_MSG('First name') })
  firstName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(60)
  @Matches(NAME_RE, { message: NAME_MSG('Last name') })
  lastName: string;

  @IsDateString()
  @IsRealisticBirthDate()
  dateOfBirth: string; // ISO string from frontend

  // Optional: a patient may have no email (they then get no appointment
  // emails). Blank is treated as not given.
  @Transform(({ value }: { value: unknown }) => {
    const v = lower({ value });
    return v === '' ? undefined : v;
  })
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email?: string;

  // Any country; stored as E.164 ("+919876543210"). Bare 10-digit numbers
  // are read as Indian.
  @Transform(({ value }: { value: unknown }) => toE164(value))
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsInternationalPhone()
  phoneNo: string;

  // Lower-cased first: older records were seeded as "Male".
  @Transform(lower)
  @IsIn(GENDERS, { message: `gender must be one of: ${GENDERS.join(', ')}` })
  gender: string;

  // Optional: blank means "not known" (and clears it on update).
  @IsOptional()
  @Transform(trim)
  @IsIn(['', ...BLOOD_GROUPS], {
    message: `bloodGroup must be one of: ${BLOOD_GROUPS.join(', ')}`,
  })
  bloodGroup?: string;

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
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  // Empty clears it on update.
  @Matches(/^([\p{L}\p{M}][\p{L}\p{M}' .-]*)?$/u, {
    message: NAME_MSG('Emergency contact name'),
  })
  emergencyContactName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toE164(value))
  // Empty clears it on update.
  @IsInternationalPhone(true)
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
