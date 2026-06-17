import { z } from "zod";

export const addPatientSchema = z.object({
  firstName:      z.string().min(1, "First name is required"),
  lastName:       z.string().min(1, "Last name is required"),
  email:          z.string().min(1, "Email is required").email("Enter a valid email"),
  phoneNo:        z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  dateOfBirth:    z.string().min(1, "Date of birth is required"),
  gender:         z.enum(["male", "female", "other"], { error: "Select a gender" }),
  bloodGroup:     z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], {
    error: "Select a blood group",
  }),
  allergies:      z.string().optional(),
});
export type AddPatientValues = z.infer<typeof addPatientSchema>;
