/**
 * Merges follow-up notes into progress notes (session notes).
 *
 * ADDITIVE ONLY — every follow-up note is *copied* into `progressnotes` as a
 * session note with its Follow-up section filled in. Nothing in
 * `followupnotes` is modified or deleted, so the original records stay as an
 * audit trail. Re-running is safe: a note already copied (matched on
 * `migratedFromFollowUpId`) is skipped.
 *
 * Field mapping (follow-up → session note):
 *   title, patientId, practitionerId, practiceId, appointmentId → same
 *   summary         → content
 *   recommendations → recommendations
 *   actionItems     → actionItems
 *   followUpDate    → followUpDate
 *   sessionDate     ← the linked appointment's start, else the note's createdAt
 *   createdAt       ← preserved
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/migrations/003-merge-follow-up-notes.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register src/migrations/003-merge-follow-up-notes.ts
 */
import mongoose, { Types } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

type FollowUp = {
  _id: Types.ObjectId;
  practiceId?: Types.ObjectId;
  patientId: Types.ObjectId;
  practitionerId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  title: string;
  summary?: string;
  recommendations?: string;
  actionItems?: string[];
  followUpDate?: Date;
  createdAt?: Date;
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;
  if (!db) throw new Error('No database handle');

  const followUps = db.collection<FollowUp>('followupnotes');
  const progress = db.collection('progressnotes');
  const appointments = db.collection('appointments');

  let copied = 0;
  let skipped = 0;
  const total = await followUps.countDocuments();
  console.log(
    `${DRY_RUN ? '[dry run] ' : ''}Found ${total} follow-up note(s).`,
  );

  for await (const f of followUps.find({})) {
    if (
      await progress.findOne(
        { migratedFromFollowUpId: f._id },
        { projection: { _id: 1 } },
      )
    ) {
      skipped++;
      continue;
    }

    let sessionDate = f.createdAt ?? f._id.getTimestamp();
    if (f.appointmentId) {
      const appt = await appointments.findOne(
        { _id: f.appointmentId },
        { projection: { start: 1 } },
      );
      if (appt?.start) sessionDate = new Date(appt.start as string | Date);
    }

    const doc = {
      ...(f.practiceId ? { practiceId: f.practiceId } : {}),
      patientId: f.patientId,
      practitionerId: f.practitionerId,
      ...(f.appointmentId ? { appointmentId: f.appointmentId } : {}),
      title: f.title,
      sessionDate,
      ...(f.summary ? { content: f.summary } : {}),
      symptoms: [],
      ...(f.recommendations ? { recommendations: f.recommendations } : {}),
      actionItems: f.actionItems ?? [],
      ...(f.followUpDate ? { followUpDate: f.followUpDate } : {}),
      migratedFromFollowUpId: f._id,
      createdAt: f.createdAt ?? sessionDate,
      updatedAt: new Date(),
    };

    if (!DRY_RUN) await progress.insertOne(doc);
    copied++;
  }

  console.log(
    `${DRY_RUN ? '[dry run] Would copy' : 'Copied'} ${copied} note(s); ` +
      `${skipped} already merged. Follow-up notes were left untouched.`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Migration 003 failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
