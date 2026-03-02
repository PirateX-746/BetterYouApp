import * as yup from "yup";

export interface PatientSignupFormValues {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    email: string;
    password: string;
    confirmPassword: string; // ✅ frontend only
    gender: "Male" | "Female" | "Other";
    phoneNo: string;
    bloodGroup: "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
    allergies?: string;
    healthCondition?: string;
}

export const patientSignupSchema: yup.ObjectSchema<PatientSignupFormValues> =
    yup.object({
        firstName: yup.string().required(),
        lastName: yup.string().required(),

        dateOfBirth: yup
            .date()
            .transform((value, originalValue) =>
                originalValue ? new Date(originalValue) : value
            )
            .required(),

        email: yup.string().email().required(),

        password: yup
            .string()
            .min(8)
            .matches(/[A-Z]/)
            .matches(/[0-9]/)
            .matches(/[!@#$%^&*]/)
            .required(),

        confirmPassword: yup
            .string()
            .oneOf([yup.ref("password")], "Passwords must match")
            .required(),

        gender: yup
            .mixed<"Male" | "Female" | "Other">()
            .oneOf(["Male", "Female", "Other"])
            .required(),

        phoneNo: yup
            .string()
            .matches(/^[6-9]\d{9}$/)
            .required(),

        bloodGroup: yup
            .mixed<
                "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-"
            >()
            .oneOf(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"])
            .required(),

        allergies: yup.string().optional(),
        healthCondition: yup.string().optional(),
    });