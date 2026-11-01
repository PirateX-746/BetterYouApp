import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import { ValidateBy } from 'class-validator';

/** Patients are mostly in India; a bare 10-digit number is read as +91. */
const DEFAULT_COUNTRY = 'IN';

/**
 * A phone number in international (E.164) form, "+919876543210", or the
 * trimmed input unchanged when it can't be parsed (validation then rejects
 * it with a clear message). Empty stays empty.
 */
export function toE164(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  if (!v) return v;
  const p = parsePhoneNumberFromString(v, DEFAULT_COUNTRY);
  return p?.isValid() ? p.number : v;
}

/** Other spellings the same number may be stored under (legacy bare +91 numbers). */
export function phoneVariants(e164: string): string[] {
  const p = parsePhoneNumberFromString(e164, DEFAULT_COUNTRY);
  if (!p) return [e164];
  return p.countryCallingCode === '91'
    ? [p.number, p.nationalNumber]
    : [p.number];
}

/** A valid phone number for its country (bare numbers read as Indian). */
export const IsInternationalPhone = (allowEmpty = false) =>
  ValidateBy({
    name: 'isInternationalPhone',
    validator: {
      validate: (value: unknown) =>
        (allowEmpty && value === '') ||
        (typeof value === 'string' &&
          isValidPhoneNumber(value, DEFAULT_COUNTRY)),
      defaultMessage: () =>
        'Enter a valid phone number for the selected country',
    },
  });
