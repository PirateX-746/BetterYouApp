/**
 * Creates the first platform administrator, and optionally practice #1.
 *
 * ADDITIVE ONLY — it never modifies or deletes an existing document. Run it
 * once so you can sign in to the platform console; re-running is safe and
 * will simply report that the account already exists.
 *
 * Usage:
 *   PLATFORM_ADMIN_EMAIL=you@example.com \
 *   PLATFORM_ADMIN_PASSWORD='a strong password' \
 *   npx ts-node -r tsconfig-paths/register src/migrations/002-seed-platform-admin.ts
 *
 * Add --with-practice to also create the first practice from your existing
 * data (this only inserts the practice row; it does NOT backfill practiceId
 * onto existing documents — that is migration 001).
 *
 * The password is read from the environment and never printed or stored in
 * plaintext; it is bcrypt-hashed before it touches the database.
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const SALT_ROUNDS = 10;
const WITH_PRACTICE = process.argv.includes('--with-practice');
const ALLOW_WEAK = process.argv.includes('--allow-weak-password');

async function main() {
  const uri = process.env.MONGO_URI;
  const email = process.env.PLATFORM_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const name = process.env.PLATFORM_ADMIN_NAME ?? 'Platform Admin';

  if (!uri) throw new Error('MONGO_URI is not set');
  if (!email || !password) {
    throw new Error(
      'PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD must be set',
    );
  }
  // A platform account can see every practice, so short passwords are
  // refused by default. --allow-weak-password exists for local setup only
  // and prints a warning; do not use it for a real deployment.
  if (password.length < 12) {
    if (!ALLOW_WEAK) {
      throw new Error(
        'Platform passwords must be at least 12 characters. ' +
          'Pass --allow-weak-password to override (local setup only).',
      );
    }
    console.warn(
      '⚠️  Weak platform password accepted via --allow-weak-password.\n' +
        '    This account can see every practice. Change it before deploying.',
    );
  }

  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;
  if (!db) throw new Error('No database handle');

  /* ---- platform admin ---------------------------------------------- */
  const admins = db.collection('platformadmins');
  await admins.createIndex({ email: 1 }, { unique: true });

  const existing = await admins.findOne({ email });
  if (existing) {
    console.log(`ℹ  Platform admin already exists: ${email}`);
  } else {
    await admins.insertOne({
      name,
      email,
      password: await bcrypt.hash(password, SALT_ROUNDS),
      role: 'super_admin',
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Platform admin created: ${email}`);
  }

  /* ---- optional: first practice ------------------------------------ */
  if (WITH_PRACTICE) {
    const practices = db.collection('practices');
    await practices.createIndex({ subdomain: 1 }, { unique: true });

    const subdomain =
      process.env.SEED_PRACTICE_SUBDOMAIN?.toLowerCase().trim() ?? 'betteryou';
    const practiceName = process.env.SEED_PRACTICE_NAME ?? 'BetterYou Clinic';

    const found = await practices.findOne({ subdomain });
    if (found) {
      console.log(`ℹ  Practice already exists: ${subdomain}`);
    } else {
      await practices.insertOne({
        name: practiceName,
        subdomain,
        status: 'active',
        timezone: 'Asia/Kolkata',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Practice created: ${practiceName} (${subdomain})`);
      console.log(
        '   Note: existing patients/practitioners are NOT yet linked to it — that is migration 001.',
      );
    }
  }

  await mongoose.disconnect();
  console.log('\nDone. Sign in at /adminLogin with the email above.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
