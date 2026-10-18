/* eslint-disable no-console */
/**
 * Migration 001 — tenancy backfill (steps 1–5 of the plan).
 *
 * NON-DESTRUCTIVE. It creates the practices collection, seeds practice #1
 * from your existing data, adds an OPTIONAL practiceId to every tenant-owned
 * collection, backfills it, and then verifies there are no duplicate
 * (practiceId, email) or (practiceId, mrn) pairs.
 *
 * It deliberately stops before the two irreversible steps:
 *   step 6 — swapping the unique email index
 *   step 7 — making practiceId required
 * Those belong in migration 003 (not yet written) and must only run once
 * this one reports a clean verify. NOTE: 002 is the platform-admin seed,
 * which is unrelated to this backfill.
 *
 * Usage:
 *   npx ts-node src/migrations/001-tenancy-backfill.ts --dry-run
 *   npx ts-node src/migrations/001-tenancy-backfill.ts
 *
 * ALWAYS run against a restored dump first:
 *   mongodump --uri "$MONGO_URI" --out ./dump
 *   mongorestore --uri "mongodb://localhost:27017/betteryou_test" ./dump/<db>
 *
 * Re-running is safe: every step is idempotent.
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

/** Collections that become tenant-owned. */
const TENANT_COLLECTIONS = [
  'patients',
  'practitioners',
  'appointments',
  'availabilities',
  'documents',
  'progressnotes',
  'followupnotes',
  'treatmentplans',
  'patientmedications',
  'conversations',
  'messages',
];

/**
 * Explicitly NOT tenant-owned:
 *   medications   — shared drug catalogue across all practices
 *   practices     — is the tenant
 *   platformadmins— deliberately outside every practice
 *   auditlogs     — practiceId is nullable, set at write time
 */
const GLOBAL_COLLECTIONS = ['medications', 'platformadmins', 'auditlogs'];

const DRY_RUN = process.argv.includes('--dry-run');

const FIRST_PRACTICE = {
  name: process.env.SEED_PRACTICE_NAME ?? 'BetterYou Clinic',
  subdomain: process.env.SEED_PRACTICE_SUBDOMAIN ?? 'betteryou',
  status: 'active',
  timezone: 'Asia/Kolkata',
  deletedAt: null,
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  const redacted = uri.replace(/\/\/[^@]*@/, '//<credentials>@');
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Connecting to ${redacted}`);

  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;
  if (!db) throw new Error('No database handle');

  const existing = (await db.listCollections().toArray()).map((c) => c.name);

  /* ---- Step 2: create the first practice --------------------------- */
  let practiceId: mongoose.Types.ObjectId;
  const practices = db.collection('practices');
  const found = await practices.findOne({ subdomain: FIRST_PRACTICE.subdomain });

  if (found) {
    practiceId = found._id;
    console.log(`✓ Practice "${FIRST_PRACTICE.subdomain}" already exists (${practiceId})`);
  } else if (DRY_RUN) {
    practiceId = new mongoose.Types.ObjectId();
    console.log(`  would create practice "${FIRST_PRACTICE.subdomain}"`);
  } else {
    const res = await practices.insertOne({
      ...FIRST_PRACTICE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    practiceId = res.insertedId;
    console.log(`✓ Created practice "${FIRST_PRACTICE.subdomain}" (${practiceId})`);
  }

  await practices.createIndex({ subdomain: 1 }, { unique: true });

  /* ---- Steps 3 & 4: add and backfill practiceId --------------------- */
  console.log('\nBackfilling practiceId:');
  for (const name of TENANT_COLLECTIONS) {
    if (!existing.includes(name)) {
      console.log(`  ${name.padEnd(20)} — collection absent, skipped`);
      continue;
    }

    const col = db.collection(name);
    const total = await col.countDocuments();
    const missing = await col.countDocuments({
      practiceId: { $exists: false },
    });

    if (missing === 0) {
      console.log(`  ${name.padEnd(20)} ${total} docs, already backfilled`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ${name.padEnd(20)} would set practiceId on ${missing}/${total}`);
      continue;
    }

    const res = await col.updateMany(
      { practiceId: { $exists: false } },
      { $set: { practiceId } },
    );
    await col.createIndex({ practiceId: 1 });
    console.log(`  ${name.padEnd(20)} set on ${res.modifiedCount}/${total}`);
  }

  for (const name of GLOBAL_COLLECTIONS) {
    if (existing.includes(name)) {
      console.log(`  ${name.padEnd(20)} — global, intentionally not scoped`);
    }
  }

  /* ---- Step 5: verify uniqueness before 002 swaps the indexes ------- */
  console.log('\nVerifying no duplicate pairs (blocks step 6 if any):');
  let clean = true;

  for (const [name, field] of [
    ['patients', 'email'],
    ['patients', 'mrn'],
    ['practitioners', 'email'],
  ] as const) {
    if (!existing.includes(name)) continue;

    const dupes = await db
      .collection(name)
      .aggregate([
        { $group: { _id: { p: '$practiceId', v: `$${field}` }, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 }, '_id.v': { $ne: null } } },
      ])
      .toArray();

    if (dupes.length) {
      clean = false;
      console.log(`  ✗ ${name}.${field}: ${dupes.length} duplicate group(s)`);
      for (const d of dupes.slice(0, 5)) {
        console.log(`      ${String(d._id.v)} ×${d.n}`);
      }
    } else {
      console.log(`  ✓ ${name}.${field}: no duplicates`);
    }
  }

  console.log(
    clean
      ? '\n✓ Verify clean — safe to proceed to the index swap + required practiceId step.'
      : '\n✗ Duplicates found. Resolve them before the index swap, or the unique index build will fail.',
  );

  if (DRY_RUN) console.log('\n[DRY RUN] No changes were written.');

  await mongoose.disconnect();
  process.exit(clean ? 0 : 1);
}

main().catch((err) => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
