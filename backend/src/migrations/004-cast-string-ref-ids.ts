/**
 * Casts string reference ids to ObjectIds on records created through the API
 * before `withObjectIds()` (common/object-ids.ts) was added.
 *
 * Those refs resolve to Mixed paths, so the API stored the raw request
 * strings — and every list query, which compares against an ObjectId,
 * silently missed the records. This rewrites only the listed id fields, and
 * only where the stored value is a 24-hex string; nothing is deleted.
 * Re-running is safe: once cast, a field no longer matches.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/migrations/004-cast-string-ref-ids.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register src/migrations/004-cast-string-ref-ids.ts
 */
import mongoose, { Types } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const TARGETS: Record<string, string[]> = {
  progressnotes: ['patientId', 'practitionerId', 'appointmentId', 'practiceId'],
  treatmentplans: ['patientId', 'practitionerId', 'practiceId'],
  patientmedications: [
    'patientId',
    'practitionerId',
    'medicationId',
    'practiceId',
  ],
  documents: ['patient', 'doctor', 'practiceId'],
};

const HEX_ID = /^[0-9a-fA-F]{24}$/;

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;
  if (!db) throw new Error('No database handle');

  for (const [name, fields] of Object.entries(TARGETS)) {
    const col = db.collection(name);
    let updated = 0;
    const cursor = col.find({
      $or: fields.map((f) => ({ [f]: { $type: 'string' } })),
    });
    for await (const doc of cursor) {
      const set: Record<string, Types.ObjectId> = {};
      for (const f of fields) {
        const v: unknown = doc[f];
        if (typeof v === 'string' && HEX_ID.test(v)) {
          set[f] = new Types.ObjectId(v);
        }
      }
      if (!Object.keys(set).length) continue;
      updated++;
      if (DRY_RUN) {
        console.log(
          `  ${name} ${String(doc._id)}: ${Object.keys(set).join(', ')}`,
        );
      } else {
        await col.updateOne({ _id: doc._id }, { $set: set });
      }
    }
    console.log(
      `${DRY_RUN ? '[dry run] ' : ''}${name}: ${updated} record(s) ${DRY_RUN ? 'to cast' : 'cast'}.`,
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
