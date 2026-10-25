import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Matches,
  Min,
  Max,
  MaxLength,
  ValidateBy,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** A browser-encoded image (what the profile photo picker produces), or "" to clear. */
export const AVATAR_DATA_URL =
  /^(data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+=*)?$/;
/** 2 MB image limit in the UI, base64-encoded (4/3) with headroom. */
export const AVATAR_MAX_LENGTH = 3_000_000;

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Weekday → { isOpen, openTime, closeTime } with "HH:mm" times, closing
 * after opening on open days. The calendar parses these directly, so a
 * malformed value breaks it for that practitioner.
 */
const IsPracticeHours = () =>
  ValidateBy({
    name: 'isPracticeHours',
    validator: {
      validate: (value: unknown) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return false;
        }
        return Object.entries(value as Record<string, unknown>).every(
          ([day, v]) => {
            if (!DAYS.includes(day) || !v || typeof v !== 'object')
              return false;
            const { isOpen, openTime, closeTime } = v as Record<
              string,
              unknown
            >;
            if (typeof isOpen !== 'boolean') return false;
            if (typeof openTime !== 'string' || !HHMM.test(openTime))
              return false;
            if (typeof closeTime !== 'string' || !HHMM.test(closeTime))
              return false;
            return !isOpen || closeTime > openTime;
          },
        );
      },
      defaultMessage: () =>
        'practiceHours must map weekdays to { isOpen, openTime, closeTime } with HH:mm times, closing after opening',
    },
  });

export class UpdatePractitionerDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(60)
  lastName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Specialization is required' })
  @MaxLength(100)
  specialization?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  @MaxLength(AVATAR_MAX_LENGTH, { message: 'Profile photo must be under 2 MB' })
  @Matches(AVATAR_DATA_URL, {
    message: 'Profile photo must be a PNG, JPEG, GIF or WebP image',
  })
  avatarBase64?: string;

  @IsOptional()
  @IsPracticeHours()
  practiceHours?: Record<
    string,
    { isOpen: boolean; openTime: string; closeTime: string }
  >;
}
