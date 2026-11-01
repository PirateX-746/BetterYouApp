import type { Connection } from 'mongoose';

/**
 * Whether this practice currently allows emails to its patients
 * (Practice.patientEmailsEnabled, set in practitioner Settings).
 *
 * A record with no practiceId (single-practice setups) follows the only
 * practice. Unknown or missing practice = allowed, so a lookup problem never
 * silently stops appointment emails.
 */
export async function patientEmailsAllowed(
  db: Connection,
  practiceId?: unknown,
): Promise<boolean> {
  const Practice = db.model<{ patientEmailsEnabled?: boolean }>('Practice');
  const practice = practiceId
    ? await Practice.findById(practiceId, { patientEmailsEnabled: 1 }).lean()
    : await Practice.findOne({ deletedAt: null }, { patientEmailsEnabled: 1 })
        .sort({ createdAt: 1 })
        .lean();
  return practice?.patientEmailsEnabled !== false;
}
