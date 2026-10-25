export type Patient = {
  _id?: string;
  mrn?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNo?: string;
  email?: string;
  lastVisit?: string;
  healthCondition?: string;
  bloodGroup?: string;
  allergies?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  /** Legacy field names some older records/types used. */
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  isActive?: boolean;
};

export const emergencyName = (p: Patient) => p.emergencyContactName ?? p.emergency_contact_name;
export const emergencyPhone = (p: Patient) => p.emergencyContactPhone ?? p.emergency_contact_phone;
