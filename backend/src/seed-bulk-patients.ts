/**
 * Adds 100 patients to Dr. Sarah Mitchell's practice — enough rows to
 * exercise table paging, sorting and search. Profiles only: no appointments,
 * so the calendar stays readable.
 *
 * Additive and idempotent, like seed-demo-patients.ts: it never deletes or
 * modifies existing records, and skips any patient whose email, MRN or phone
 * already exists, so re-running is safe.
 *
 *   cd backend && npx ts-node src/seed-bulk-patients.ts
 *
 * Every row is tagged `seedTag: 'bulk-patients-v1'` so it can be found later.
 */
import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const PRACTITIONER_EMAIL = 'dr.sarah@betteryou.com';
const SEED_TAG = 'bulk-patients-v1';
const COUNT = 100;

const FIRST_F = [
  'Aarohi',
  'Bhavna',
  'Charu',
  'Diya',
  'Esha',
  'Gauri',
  'Ishita',
  'Jhanvi',
  'Lavanya',
  'Mitali',
  'Nandini',
  'Pooja',
  'Riya',
  'Shruti',
  'Tanvi',
  'Vidya',
  'Zoya',
  'Anjali',
  'Priya',
  'Radhika',
];
const FIRST_M = [
  'Arjun',
  'Bharat',
  'Chirag',
  'Dev',
  'Farhan',
  'Gaurav',
  'Harsh',
  'Ishaan',
  'Kabir',
  'Manav',
  'Nikhil',
  'Omkar',
  'Pranav',
  'Rahul',
  'Sameer',
  'Tushar',
  'Varun',
  'Yash',
  'Vikram',
  'Neel',
];
const LAST = [
  'Agarwal',
  'Banerjee',
  'Bhat',
  'Chatterjee',
  'Das',
  'Gupta',
  'Joshi',
  'Kapoor',
  'Kulkarni',
  'Mehta',
  'Mishra',
  'Nair',
  'Patel',
  'Rao',
  'Saxena',
  'Sharma',
  'Shetty',
  'Singh',
  'Trivedi',
  'Verma',
];
const CONDITIONS = [
  'Generalised Anxiety Disorder',
  'Major Depressive Disorder (mild)',
  'Major Depressive Disorder (moderate)',
  'Panic Disorder',
  'Social Anxiety Disorder',
  'Adult ADHD',
  'Insomnia Disorder',
  'Obsessive-Compulsive Disorder',
  'Post-Traumatic Stress Disorder (PTSD)',
  'Adjustment Disorder',
  'Bipolar II Disorder',
  'Work-related stress',
  'Grief and bereavement',
  'Eating disorder (binge eating)',
  'Health anxiety',
];
const ALLERGIES = [
  'None known',
  'None known',
  'None known',
  'Penicillin',
  'Peanuts',
  'Latex',
  'Sulfa drugs',
  'Ibuprofen',
  'Shellfish',
  'Dust mites',
];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/** Deterministic, so a re-run produces the same people (and skips them). */
function person(i: number) {
  const female = i % 2 === 0;
  const firstPool = female ? FIRST_F : FIRST_M;
  const firstName = firstPool[(i * 7) % firstPool.length];
  const lastName = LAST[(i * 13 + Math.floor(i / 20)) % LAST.length];
  const year = 1960 + ((i * 17) % 45); // ages ~21–66
  const month = ((i * 5) % 12) + 1;
  const day = ((i * 11) % 28) + 1;
  // Roughly a third active recently, a third a while ago, the rest never seen.
  const lastVisitDaysAgo = i % 3 === 2 ? null : 2 + ((i * 37) % 240);
  return {
    firstName,
    lastName,
    gender: female ? 'female' : 'male',
    dateOfBirth: new Date(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`,
    ),
    email:
      `${firstName}.${lastName}.${String(i + 1).padStart(3, '0')}@example.com`.toLowerCase(),
    mrn: `MRN-2026-${String(3001 + i)}`,
    phoneNo: `98460${String(10000 + i).padStart(5, '0')}`,
    bloodGroup: BLOOD[(i * 3) % BLOOD.length],
    healthCondition: CONDITIONS[(i * 7) % CONDITIONS.length],
    allergies: ALLERGIES[(i * 3) % ALLERGIES.length],
    lastVisit:
      lastVisitDaysAgo === null
        ? undefined
        : new Date(Date.now() - lastVisitDaysAgo * 86_400_000),
    // Every 8th patient is inactive, so the status filter has something to show.
    isActive: i % 8 !== 7,
  };
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri)
    throw new Error('MONGO_URI is not set — copy .env.example to .env first');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const patients = db.collection('patients');

  const practitioner = await db
    .collection('practitioners')
    .findOne({ email: PRACTITIONER_EMAIL }, { projection: { practiceId: 1 } });
  if (!practitioner)
    throw new Error(`Practitioner ${PRACTITIONER_EMAIL} not found`);
  const practiceId = practitioner.practiceId as Types.ObjectId | undefined;
  if (!practiceId)
    throw new Error(
      `${PRACTITIONER_EMAIL} has no practiceId — patients would be invisible`,
    );

  const people = Array.from({ length: COUNT }, (_, i) => person(i));
  const clashes = await patients
    .find<{
      email?: string;
      mrn?: string;
      phoneNo?: string;
    }>(
      {
        $or: [
          { email: { $in: people.map((p) => p.email) } },
          { mrn: { $in: people.map((p) => p.mrn) } },
          { phoneNo: { $in: people.map((p) => p.phoneNo) } },
        ],
      },
      { projection: { email: 1, mrn: 1, phoneNo: 1 } },
    )
    .toArray();
  const taken = new Set(
    clashes.flatMap((c) => [c.email, c.mrn, c.phoneNo]).filter(Boolean),
  );
  const fresh = people.filter(
    (p) => !taken.has(p.email) && !taken.has(p.mrn) && !taken.has(p.phoneNo),
  );

  // Nobody knows these passwords: a practitioner issues a temporary one from
  // the patient's profile ("Reset password") if a login is ever needed.
  const now = new Date();
  const docs: Record<string, unknown>[] = [];
  for (const [n, p] of fresh.entries()) {
    docs.push({
      ...p,
      practiceId,
      password: await bcrypt.hash(randomBytes(24).toString('base64url'), 10),
      role: 'patient',
      mustChangePassword: true,
      tempPasswordExpiresAt: now,
      seedTag: SEED_TAG,
      createdAt: new Date(now.getTime() - (COUNT - n) * 3_600_000),
      updatedAt: now,
    });
  }
  if (docs.length) await patients.insertMany(docs, { ordered: false });

  console.log(
    `Done: ${docs.length} patients added, ${COUNT - docs.length} skipped (already present).`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
