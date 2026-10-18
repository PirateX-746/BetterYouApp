/**
 * Adds 10 demo patients to Dr. Sarah Mitchell's practice, each with complete
 * profile details and a history of past + upcoming appointments.
 *
 * Additive and idempotent: it never deletes or modifies existing records, and
 * a patient whose email already exists is skipped (with their appointments),
 * so re-running is safe. Unlike seed-full.ts, which wipes every collection.
 *
 *   cd backend && npx ts-node src/seed-demo-patients.ts
 *
 * Appointments use the practitioner's configured appointment types (seeding
 * the defaults first if she has none), fall inside Mon–Fri 09:00–17:00 IST,
 * and are checked against her existing bookings so nothing double-books.
 */
import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { DEFAULT_APPOINTMENT_TYPES } from './appointment-types/appointment-types.defaults';

const PRACTITIONER_EMAIL = 'dr.sarah@betteryou.com';
const SEED_TAG = 'demo-patients-v1';
const TZ = '+05:30'; // clinic local time (IST)

type Status = 'completed' | 'no_show' | 'cancelled' | 'confirmed' | 'scheduled';

interface Visit {
  type: string; // appointment type name
  status: Status;
  notes: string;
}

interface DemoPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bloodGroup: string;
  phoneNo: string;
  healthCondition: string;
  allergies: string;
  past: Visit[];
  upcoming: Visit[];
}

const PATIENTS: DemoPatient[] = [
  {
    firstName: 'Ananya', lastName: 'Iyer', dateOfBirth: '1994-04-12', gender: 'female',
    bloodGroup: 'A+', phoneNo: '9845012301', healthCondition: 'Generalised Anxiety Disorder',
    allergies: 'Penicillin',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'Intake assessment. GAD-7: 15 (moderate). Worry centred on work deadlines; poor sleep onset.' },
      { type: 'CBT Session', status: 'completed', notes: 'Introduced worry diary and thought records. Agreed scheduled "worry time".' },
      { type: 'CBT Session', status: 'completed', notes: 'GAD-7: 11. Using worry time consistently; challenging catastrophic predictions.' },
    ],
    upcoming: [
      { type: 'Follow-Up Session', status: 'confirmed', notes: 'Review sleep hygiene progress and GAD-7.' },
    ],
  },
  {
    firstName: 'Karan', lastName: 'Malhotra', dateOfBirth: '1988-09-03', gender: 'male',
    bloodGroup: 'B+', phoneNo: '9845012302', healthCondition: 'Major Depressive Disorder (moderate)',
    allergies: 'None known',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'PHQ-9: 17. Low mood 4 months after redundancy. No active suicidal ideation; safety plan agreed.' },
      { type: 'Counselling Session', status: 'completed', notes: 'Behavioural activation: daily walk and one social contact per week.' },
    ],
    upcoming: [
      { type: 'Counselling Session', status: 'confirmed', notes: 'Review activity schedule; PHQ-9 re-score.' },
      { type: 'Follow-Up Session', status: 'scheduled', notes: 'Monthly check-in.' },
    ],
  },
  {
    firstName: 'Sneha', lastName: 'Reddy', dateOfBirth: '1999-01-25', gender: 'female',
    bloodGroup: 'O+', phoneNo: '9845012303', healthCondition: 'Panic Disorder with Agoraphobia',
    allergies: 'Peanuts',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'Panic attacks 3–4x/week, avoiding metro and malls. Psychoeducation on the panic cycle.' },
      { type: 'CBT Session', status: 'completed', notes: 'Interoceptive exposure (spinning, breath-holding). SUDS peaked at 70, settled to 30.' },
      { type: 'CBT Session', status: 'no_show', notes: 'Did not attend; no prior notice. Follow-up call made.' },
      { type: 'CBT Session', status: 'completed', notes: 'Rode two metro stops with support. Panic frequency down to 1x/week.' },
    ],
    upcoming: [
      { type: 'CBT Session', status: 'confirmed', notes: 'Graded exposure: shopping mall visit, 20 minutes.' },
    ],
  },
  {
    firstName: 'Rohan', lastName: 'Desai', dateOfBirth: '1985-11-17', gender: 'male',
    bloodGroup: 'AB-', phoneNo: '9845012304', healthCondition: 'Adult ADHD (combined presentation)',
    allergies: 'Sulfa drugs',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'ASRS screen positive. Lifelong difficulty with organisation; workplace performance concerns.' },
      { type: 'Follow-Up Session', status: 'completed', notes: 'Started planner system and body-doubling for focused work blocks.' },
    ],
    upcoming: [
      { type: 'Follow-Up Session', status: 'confirmed', notes: 'Review planner adherence; discuss psychiatry referral for medication review.' },
      { type: 'Counselling Session', status: 'scheduled', notes: 'Emotional regulation skills.' },
    ],
  },
  {
    firstName: 'Meera', lastName: 'Pillai', dateOfBirth: '1979-06-08', gender: 'female',
    bloodGroup: 'O-', phoneNo: '9845012305', healthCondition: 'Post-Traumatic Stress Disorder (PTSD)',
    allergies: 'Latex',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'PCL-5: 52. Road traffic accident 8 months ago; nightmares and driving avoidance.' },
      { type: 'Counselling Session', status: 'completed', notes: 'Grounding techniques (5-4-3-2-1). Stabilisation before trauma processing.' },
      { type: 'Counselling Session', status: 'completed', notes: 'Began written trauma narrative. Tolerated well; distress manageable.' },
    ],
    upcoming: [
      { type: 'Counselling Session', status: 'confirmed', notes: 'Continue trauma narrative; PCL-5 re-score.' },
    ],
  },
  {
    firstName: 'Aditya', lastName: 'Rao', dateOfBirth: '2001-02-14', gender: 'male',
    bloodGroup: 'A-', phoneNo: '9845012306', healthCondition: 'Social Anxiety Disorder',
    allergies: 'None known',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'Final-year student avoiding presentations and group work. SPIN: 44.' },
      { type: 'CBT Session', status: 'completed', notes: 'Identified safety behaviours; video-feedback exercise on self-image.' },
    ],
    upcoming: [
      { type: 'CBT Session', status: 'confirmed', notes: 'Behavioural experiment: ask a question in class.' },
      { type: 'CBT Session', status: 'scheduled', notes: 'Prepare for project presentation.' },
    ],
  },
  {
    firstName: 'Kavya', lastName: 'Menon', dateOfBirth: '1991-12-30', gender: 'female',
    bloodGroup: 'B-', phoneNo: '9845012307', healthCondition: 'Postpartum Depression',
    allergies: 'Ibuprofen',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'EPDS: 16, five months postpartum. Strong family support; coordinating with GP.' },
      { type: 'Counselling Session', status: 'cancelled', notes: 'Cancelled by patient (infant unwell). Rebooked.' },
      { type: 'Counselling Session', status: 'completed', notes: 'EPDS: 12. Sleep shifts shared with partner; mood improving.' },
    ],
    upcoming: [
      { type: 'Follow-Up Session', status: 'confirmed', notes: 'EPDS re-score; review support plan.' },
    ],
  },
  {
    firstName: 'Siddharth', lastName: 'Chopra', dateOfBirth: '1976-07-21', gender: 'male',
    bloodGroup: 'O+', phoneNo: '9845012308', healthCondition: 'Insomnia Disorder, Mild Depression',
    allergies: 'None known',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'ISI: 19. Sleeps ~4.5 h; long-standing shift work history.' },
      { type: 'CBT Session', status: 'completed', notes: 'CBT-I: sleep restriction window 00:30–06:00, stimulus control.' },
      { type: 'CBT Session', status: 'completed', notes: 'Sleep efficiency 86%. Extended window by 15 minutes.' },
      { type: 'Follow-Up Session', status: 'completed', notes: 'ISI: 11. Mood brighter; maintaining routine.' },
    ],
    upcoming: [
      { type: 'Follow-Up Session', status: 'scheduled', notes: 'Relapse-prevention plan.' },
    ],
  },
  {
    firstName: 'Ishita', lastName: 'Banerjee', dateOfBirth: '1996-03-09', gender: 'female',
    bloodGroup: 'AB+', phoneNo: '9845012309', healthCondition: 'Obsessive-Compulsive Disorder (OCD)',
    allergies: 'Shellfish',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'Y-BOCS: 26. Contamination fears; hand-washing ~2 h/day.' },
      { type: 'CBT Session', status: 'completed', notes: 'ERP hierarchy built. First exposure: touch door handles, delay washing 10 min.' },
    ],
    upcoming: [
      { type: 'CBT Session', status: 'confirmed', notes: 'ERP: public transport handrails.' },
      { type: 'CBT Session', status: 'scheduled', notes: 'ERP: shared kitchen surfaces; Y-BOCS re-score.' },
    ],
  },
  {
    firstName: 'Farhan', lastName: 'Qureshi', dateOfBirth: '1983-10-05', gender: 'male',
    bloodGroup: 'A+', phoneNo: '9845012310', healthCondition: 'Alcohol Use Disorder (early remission)',
    allergies: 'Codeine',
    past: [
      { type: 'New Patient Visit', status: 'completed', notes: 'AUDIT: 21 at referral; 6 weeks abstinent after detox. Motivated; attends support group.' },
      { type: 'Counselling Session', status: 'completed', notes: 'Relapse-prevention: high-risk situations mapped, urge-surfing practised.' },
      { type: 'Family Therapy', status: 'completed', notes: 'Session with spouse: communication and rebuilding trust.' },
    ],
    upcoming: [
      { type: 'Counselling Session', status: 'confirmed', notes: 'Review cravings log; 3-month sobriety milestone.' },
    ],
  },
];

/* ─── Scheduling ─── */

const PAST_FROM = new Date(`2026-07-06T00:00:00${TZ}`);
const PAST_UNTIL = new Date(`2026-10-16T23:59:59${TZ}`);
const FUTURE_FROM = new Date(`2026-10-19T00:00:00${TZ}`);
const FUTURE_UNTIL = new Date(`2026-12-18T23:59:59${TZ}`);
const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;

const ymd = (d: Date) => {
  // Calendar date in IST, regardless of the machine's own timezone.
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return ist.toISOString().slice(0, 10);
};
const at = (date: string, hour: number, minute = 0) =>
  new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${TZ}`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const isWeekday = (date: string) => {
  const dow = new Date(`${date}T12:00:00${TZ}`).getUTCDay();
  return dow >= 1 && dow <= 5;
};

/** Busy intervals for the practitioner; grows as we book. */
class Calendar {
  constructor(private busy: { start: Date; end: Date }[]) {}

  private free(start: Date, end: Date) {
    return !this.busy.some((b) => b.start < end && b.end > start);
  }

  /**
   * First free slot on or after `from`, trying the preferred hour first and
   * then the rest of that day, then following weekdays, never past `until`.
   */
  book(from: Date, until: Date, preferredHour: number, minutes: number) {
    for (let day = from; day <= until; day = addDays(day, 1)) {
      const date = ymd(day);
      if (!isWeekday(date)) continue;
      const hours = [preferredHour, ...Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i)];
      for (const h of hours) {
        const start = at(date, h);
        const end = new Date(start.getTime() + minutes * 60_000);
        if (end > at(date, CLOSE_HOUR)) continue;
        if (this.free(start, end)) {
          this.busy.push({ start, end });
          return { start, end };
        }
      }
    }
    throw new Error(`No free slot between ${ymd(from)} and ${ymd(until)}`);
  }
}

/* ─── Main ─── */

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set — copy .env.example to .env first');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const patients = db.collection('patients');
  const appointments = db.collection('appointments');
  const types = db.collection('appointmenttypes');

  const practitioner = await db
    .collection('practitioners')
    .findOne({ email: PRACTITIONER_EMAIL }, { projection: { practiceId: 1, appointmentTypesSeededAt: 1 } });
  if (!practitioner) throw new Error(`Practitioner ${PRACTITIONER_EMAIL} not found`);
  const practitionerId = practitioner._id as Types.ObjectId;
  const practiceId = practitioner.practiceId as Types.ObjectId | undefined;

  // Give her the default types if she has never had any (same rule as the API).
  if (!practitioner.appointmentTypesSeededAt && (await types.countDocuments({ practitionerId })) === 0) {
    await types.insertMany(
      DEFAULT_APPOINTMENT_TYPES.map((t, i) => ({
        ...t, practitionerId, practiceId, nameKey: t.name.toLowerCase(),
        isActive: true, sortOrder: i, createdAt: new Date(), updatedAt: new Date(),
      })),
    );
    await db.collection('practitioners').updateOne({ _id: practitionerId }, { $set: { appointmentTypesSeededAt: new Date() } });
    console.log('Seeded default appointment types');
  }
  const typeByName = new Map(
    (await types.find({ practitionerId }).toArray()).map((t) => [t.name as string, t]),
  );

  const existing = await appointments
    .find({ practitionerId, status: { $nin: ['cancelled', 'no_show'] } }, { projection: { start: 1, end: 1 } })
    .toArray();
  const calendar = new Calendar(existing.map((a) => ({ start: a.start as Date, end: a.end as Date })));

  let created = 0;
  let apptCount = 0;

  for (const [i, p] of PATIENTS.entries()) {
    const email = `${p.firstName}.${p.lastName}@example.com`.toLowerCase();
    if (await patients.findOne({ email })) {
      console.log(`- skip ${p.firstName} ${p.lastName} (already exists)`);
      continue;
    }

    // Plan visits first, so lastVisit is known before the patient is inserted.
    const preferredHour = OPEN_HOUR + (i % 7);
    const planned: { visit: Visit; start: Date; end: Date }[] = [];
    let cursor = addDays(PAST_FROM, i * 3);
    for (const [n, visit] of p.past.entries()) {
      const type = typeByName.get(visit.type);
      if (!type) throw new Error(`Appointment type "${visit.type}" not found`);
      const slot = calendar.book(cursor, PAST_UNTIL, preferredHour, type.durationMinutes as number);
      planned.push({ visit, ...slot });
      // Roughly fortnightly, but compressed when needed so every remaining
      // past visit still fits before PAST_UNTIL.
      const remaining = p.past.length - n - 1;
      const daysLeft = Math.floor((PAST_UNTIL.getTime() - slot.start.getTime()) / 86_400_000);
      const gap = remaining ? Math.min(14 + (i % 3) * 3, Math.floor(daysLeft / (remaining + 0.5))) : 0;
      cursor = addDays(slot.start, Math.max(gap, 1));
    }
    cursor = addDays(FUTURE_FROM, i % 5);
    for (const visit of p.upcoming) {
      const type = typeByName.get(visit.type)!;
      const slot = calendar.book(cursor, FUTURE_UNTIL, preferredHour, type.durationMinutes as number);
      planned.push({ visit, ...slot });
      cursor = addDays(slot.start, 14);
    }
    const lastVisit = planned
      .filter((x) => x.visit.status === 'completed')
      .reduce<Date | undefined>((latest, x) => (!latest || x.start > latest ? x.start : latest), undefined);

    const now = new Date();
    const firstStart = planned[0].start;
    const { insertedId: patientId } = await patients.insertOne({
      practiceId,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: new Date(`${p.dateOfBirth}T00:00:00.000Z`),
      email,
      mrn: `MRN-2026-${String(2001 + i).padStart(4, '0')}`,
      // No shared demo password: each account gets a random one nobody
      // knows. To sign in as a patient, issue a temporary password with
      // "Reset password" on their profile (or POST /patients/:id/temporary-password).
      password: await bcrypt.hash(randomBytes(24).toString('base64url'), 10),
      phoneNo: p.phoneNo,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      healthCondition: p.healthCondition,
      allergies: p.allergies,
      lastVisit,
      role: 'patient',
      isActive: true,
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(),
      seedTag: SEED_TAG,
      // Registered a few days before their first appointment.
      createdAt: addDays(firstStart, -5),
      updatedAt: now,
    });

    await appointments.insertMany(
      planned.map(({ visit, start, end }) => {
        const type = typeByName.get(visit.type)!;
        return {
          practiceId,
          practitionerId,
          patientId,
          appointmentTypeId: type._id,
          title: type.name,
          start,
          end,
          status: visit.status,
          notes: visit.notes,
          seedTag: SEED_TAG,
          createdAt: addDays(start, -7),
          updatedAt: start < now ? end : now,
        };
      }),
    );

    created++;
    apptCount += planned.length;
    console.log(
      `+ ${p.firstName} ${p.lastName}: ${p.past.length} past, ${p.upcoming.length} upcoming` +
        (lastVisit ? `, last visit ${ymd(lastVisit)}` : ''),
    );
  }

  console.log(
    `\nDone: ${created} patients and ${apptCount} appointments added. ` +
      'They have no usable password until a practitioner issues one (Reset password on the profile).',
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
