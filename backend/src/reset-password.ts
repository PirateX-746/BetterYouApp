/**
 * Password Reset Script
 * Resets both demo accounts to Admin@123
 * Run: npx ts-node -r tsconfig-paths/register src/reset-password.ts
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;
const NEW_PASSWORD = 'Admin@123';
const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({ password: String }, { strict: false });

async function resetPasswords() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const hash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);

  const Practitioner = mongoose.model('Practitioner', UserSchema);
  const Patient = mongoose.model('Patient', UserSchema);

  const practitionerResult = await Practitioner.updateMany(
    {},
    { $set: { password: hash } },
  );
  console.log(`✅ Updated ${practitionerResult.modifiedCount} practitioner(s)`);

  const patientResult = await Patient.updateMany(
    {},
    { $set: { password: hash } },
  );
  console.log(`✅ Updated ${patientResult.modifiedCount} patient(s)`);

  console.log('\n📋 Updated Credentials:');
  console.log('─────────────────────────────────────────');
  console.log('👨‍⚕️  PRACTITIONER   dr.sarah@betteryou.com');
  console.log('🧑  PATIENT        john.patient@betteryou.com');
  console.log(`🔑  Password       ${NEW_PASSWORD}`);
  console.log('─────────────────────────────────────────');

  await mongoose.disconnect();
  console.log('✅ Done.');
}

resetPasswords().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
