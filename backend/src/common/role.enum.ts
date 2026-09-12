export enum Role {
  /**
   * Platform operator. Lives in the `platformadmins` collection and never
   * carries a practiceId — Super Admin and practice membership are
   * structurally incapable of overlapping.
   */
  SUPER_ADMIN = 'super_admin',

  /** Owns a practice: manages its staff, settings and billing. */
  PRACTICE_ADMIN = 'practice_admin',

  /** Clinician. Existing accounts all have this role. */
  PRACTITIONER = 'practitioner',

  /** Scheduling and reception. No access to clinical notes. */
  STAFF = 'staff',

  PATIENT = 'patient',
}

/**
 * Roles that may read and write clinical records.
 *
 * Use this rather than `Role.PRACTITIONER` on clinical routes: a practice
 * admin is a clinician too, and hard-coding the single role would lock them
 * out of their own practice's records the moment the first one is created.
 */
export const CLINICAL_ROLES = [
  Role.PRACTICE_ADMIN,
  Role.PRACTITIONER,
] as const;

/** Everyone who works at a practice, clinical or not. */
export const PRACTICE_MEMBER_ROLES = [
  Role.PRACTICE_ADMIN,
  Role.PRACTITIONER,
  Role.STAFF,
] as const;

/** Roles stored in the `practitioners` collection. */
export function isPractitionerCollectionRole(role: Role): boolean {
  return (PRACTICE_MEMBER_ROLES as readonly Role[]).includes(role);
}
