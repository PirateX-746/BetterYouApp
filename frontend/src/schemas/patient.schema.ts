import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional().or(z.literal(""));

/** Add patient — every field the profile panel shows. Mirrors CreatePatientDto. */
export const addPatientSchema = z.object({
  firstName:   z.string().trim().min(1, "First name is required").max(60, "First name is too long"),
  lastName:    z.string().trim().min(1, "Last name is required").max(60, "Last name is too long"),
  email:       z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  phoneNo:     z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => !v || new Date(v) <= new Date(), "Date of birth can't be in the future")
    .refine((v) => !v || new Date(v).getFullYear() >= 1900, "Enter a realistic date of birth"),
  gender:      z.enum(["male", "female", "other"], { message: "Select a gender" }),
  bloodGroup:  z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], {
    message: "Select a blood group",
  }),
  healthCondition: optionalText(200, "Health condition"),
  allergies:   optionalText(300, "Allergies"),
  emergencyContactName: optionalText(100, "Name"),
  emergencyContactRelation: optionalText(40, "Relationship"),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});
export type AddPatientValues = z.infer<typeof addPatientSchema>;
