import { z } from "zod";
import type { FormEvent } from "react";

/**
 * Field rules shared by every patient form (add, edit) so they agree with
 * each other and with the API (backend/src/patients/dto/create-patient.dto.ts).
 */

/** Letters (any script), spaces, apostrophes, hyphens and dots. */
export const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
/** Indian mobile: 10 digits starting 6–9, no country code. */
export const MOBILE_RE = /^[6-9]\d{9}$/;
/** Any phone: digits, spaces, + ( ) -, 7–20 characters. */
export const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;

export const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(60, `${label} must be 60 characters or fewer`)
    .regex(NAME_RE, `${label} can only contain letters, spaces, apostrophes, hyphens and dots`);

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Enter a valid email address");

export const mobileField = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .regex(/^\d+$/, "Use digits only")
  .length(10, "Mobile number must be exactly 10 digits")
  .regex(MOBILE_RE, "Mobile number must start with 6, 7, 8 or 9");

export const optionalPhoneField = z
  .string()
  .trim()
  .regex(PHONE_RE, "Enter a valid phone number (7–20 digits)")
  .optional()
  .or(z.literal(""));

/** Blood group is optional: "" means not known. */
export const bloodGroupField = z.enum(BLOOD_GROUPS).optional().or(z.literal(""));

/** Input handlers that stop bad characters being typed or pasted at all. */
export const onlyDigits = (max: number) => (e: FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const clean = el.value.replace(/\D/g, "").slice(0, max);
  if (clean !== el.value) el.value = clean;
};
export const onlyPhoneChars = (e: FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const clean = el.value.replace(/[^0-9+()\-\s]/g, "").slice(0, 20);
  if (clean !== el.value) el.value = clean;
};
