/**
 * Seed Script — creates demo practitioner + patient accounts.
 * Run: npx ts-node -r tsconfig-paths/register src/seed.ts
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;
const SALT_ROUNDS = 10;

const PatientSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    email: { type: String, unique: true },
    mrn: { type: String, unique: true },
    password: String,
    phoneNo: String,
    gender: String,
    bloodGroup: String,
    allergies: String,
    healthCondition: String,
    role: { type: String, default: 'patient' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const PractitionerSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    email: { type: String, unique: true },
    password: String,
    specialization: String,
    experienceYears: Number,
    role: { type: String, default: 'practitioner' },
  },
  { timestamps: true },
);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const Patient = mongoose.model('Patient', PatientSchema);
  const Practitioner = mongoose.model('Practitioner', PractitionerSchema);

  /* ── PRACTITIONER ── */
  const practitionerEmail = 'dr.sarah@betteryou.com';
  const existingPractitioner = await Practitioner.findOne({
    email: practitionerEmail,
  });

  if (!existingPractitioner) {
    await Practitioner.create({
      firstName: 'Sarah',
      lastName: 'Mitchell',
      dateOfBirth: new Date('1985-03-15'),
      email: practitionerEmail,
      password: await bcrypt.hash('Doctor@123', SALT_ROUNDS),
      specialization: 'Clinical Psychology',
      experienceYears: 12,
      role: 'practitioner',
    });
    console.log('✅ Practitioner created: dr.sarah@betteryou.com');
  } else {
    console.log('ℹ️  Practitioner already exists, skipping.');
  }

  /* ── PATIENT ── */
  const patientEmail = 'john.patient@betteryou.com';
  const existingPatient = await Patient.findOne({ email: patientEmail });

  if (!existingPatient) {
    const mrn = `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await Patient.create({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1992-07-20'),
      email: patientEmail,
      mrn,
      password: await bcrypt.hash('Patient@123', SALT_ROUNDS),
      phoneNo: '9000100001',
      gender: 'Male',
      bloodGroup: 'O+',
      allergies: 'None',
      healthCondition: 'Generalized Anxiety Disorder',
      role: 'patient',
      isActive: true,
    });
    console.log(`✅ Patient created: john.patient@betteryou.com (MRN: ${mrn})`);
  } else {
    console.log('ℹ️  Patient already exists, skipping.');
  }

  console.log('\n📋 Demo Credentials:');
  console.log('─────────────────────────────────────────');
  console.log('👨‍⚕️  PRACTITIONER');
  console.log('   Email   : dr.sarah@betteryou.com');
  console.log('   Password: Doctor@123');
  console.log('');
  console.log('🧑  PATIENT');
  console.log('   Email   : john.patient@betteryou.com');
  console.log('   Password: Patient@123');
  console.log('─────────────────────────────────────────');

  await mongoose.disconnect();
  console.log('✅ Done.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
