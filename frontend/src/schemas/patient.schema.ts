import { z } from "zod";
import { NAME_RE, bloodGroupField, emailField, mobileField, optionalPhoneField, personName } from "./fields";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional().or(z.literal(""));

/** Add patient — every field the profile panel shows. Mirrors CreatePatientDto. */
export const addPatientSchema = z.object({
  firstName:   personName("First name"),
  lastName:    personName("Last name"),
  email:       emailField,
  phoneNo:     mobileField,
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => !v || new Date(v) <= new Date(), "Date of birth can't be in the future")
    .refine((v) => !v || new Date(v).getFullYear() >= 1900, "Enter a realistic date of birth"),
  gender:      z.enum(["male", "female", "other"], { message: "Select a gender" }),
  bloodGroup:  bloodGroupField,
  healthCondition: optionalText(200, "Health condition"),
  allergies:   optionalText(300, "Allergies"),
  emergencyContactName: optionalText(100, "Name").refine(
    (v) => !v || NAME_RE.test(v),
    "Name can only contain letters, spaces, apostrophes, hyphens and dots",
  ),
  emergencyContactRelation: optionalText(40, "Relationship"),
  emergencyContactPhone: optionalPhoneField,
});
export type AddPatientValues = z.infer<typeof addPatientSchema>;
