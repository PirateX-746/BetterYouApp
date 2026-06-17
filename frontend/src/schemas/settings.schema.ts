import { z } from "zod";

export const practitionerProfileSchema = z.object({
  firstName:       z.string().min(1, "First name is required"),
  lastName:        z.string().min(1, "Last name is required"),
  specialization:  z.string().min(1, "Specialization is required"),
  experienceYears: z.string().optional(),
});
export type PractitionerProfileValues = z.infer<typeof practitionerProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword:     z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
