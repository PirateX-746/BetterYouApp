/**
 * Lifts the patient cap on the Free plan (was 100) — null means unlimited,
 * the same as Enterprise. The plan catalogue is seeded once, so changing
 * DEFAULT_PLANS alone does not reach existing databases.
 *
 * Updates one field on one document; nothing is deleted. Re-running is safe.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/migrations/005-free-plan-unlimited-patients.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register src/migrations/005-free-plan-unlimited-patients.ts
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  const conn = await mongoose.connect(uri);
  const plans = conn.connection.db!.collection('plans');

  const free = await plans.findOne({ key: 'free' });
  if (!free) {
    console.log('No FREE plan found — nothing to do.');
  } else if (free.maxPatients === null) {
    console.log('FREE plan already has unlimited patients.');
  } else {
    console.log(`FREE plan maxPatients: ${free.maxPatients} -> unlimited`);
    if (!DRY_RUN) {
      await plans.updateOne({ _id: free._id }, { $set: { maxPatients: null } });
      console.log('Updated.');
    } else {
      console.log('(dry run — no changes written)');
    }
  }

  await conn.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
