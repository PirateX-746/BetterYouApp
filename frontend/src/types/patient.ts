export interface Patient {
    _id: string;
    avatar?: string;
    name?: string; // Legacy
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: "male" | "female" | "other";
    phoneNo?: string;
    email: string;
    lastVisit?: string;
    bloodGroup?: string;
    healthCondition?: string;
    allergies?: string;
    mrn?: string;
    isActive?: boolean;
}

export type PatientView = Patient & {
    displayName: string;
};
