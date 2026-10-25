/**
 * Adds 100 medications to Dr. Sarah Mitchell's library and 100 session
 * assessments (each on a new completed appointment from the last 14 days, so
 * they show on the Assessments page) — enough rows to exercise paging.
 *
 * Additive and idempotent, like the other seed scripts: never deletes or
 * modifies existing records. Medications are skipped by name; the sessions
 * are skipped as a set once any row tagged `bulk-clinical-v1` exists.
 *
 *   cd backend && npx ts-node src/seed-bulk-clinical.ts
 *
 * Run seed-bulk-patients.ts first: sessions are booked for those patients.
 */
import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import {
  DEFAULT_SECTIONS,
  DEFAULT_TEMPLATE_KEY,
} from './session-assessments/assessment-template.defaults';

const PRACTITIONER_EMAIL = 'dr.sarah@betteryou.com';
const SEED_TAG = 'bulk-clinical-v1';
const PATIENT_TAG = 'bulk-patients-v1';
const SESSIONS = 100;
const TZ = '+05:30';

/* ─── Medications: [name, category, description] × strengths ─── */

const DRUGS: [string, string, string, string[]][] = [
  [
    'Sertraline',
    'SSRI',
    'Antidepressant for depression, anxiety, OCD and PTSD.',
    ['25 mg', '50 mg', '100 mg'],
  ],
  [
    'Escitalopram',
    'SSRI',
    'Antidepressant for depression and generalised anxiety.',
    ['5 mg', '10 mg', '20 mg'],
  ],
  [
    'Fluoxetine',
    'SSRI',
    'Antidepressant; also used for OCD and bulimia.',
    ['10 mg', '20 mg', '40 mg'],
  ],
  [
    'Paroxetine',
    'SSRI',
    'Antidepressant for depression, panic and social anxiety.',
    ['10 mg', '20 mg'],
  ],
  [
    'Citalopram',
    'SSRI',
    'Antidepressant for depression and panic disorder.',
    ['10 mg', '20 mg'],
  ],
  [
    'Fluvoxamine',
    'SSRI',
    'Used mainly for obsessive-compulsive disorder.',
    ['50 mg', '100 mg'],
  ],
  [
    'Venlafaxine XR',
    'SNRI',
    'Antidepressant for depression and anxiety disorders.',
    ['37.5 mg', '75 mg', '150 mg'],
  ],
  [
    'Desvenlafaxine',
    'SNRI',
    'Antidepressant for major depressive disorder.',
    ['50 mg', '100 mg'],
  ],
  [
    'Duloxetine',
    'SNRI',
    'Antidepressant; also for anxiety and chronic pain.',
    ['20 mg', '30 mg', '60 mg'],
  ],
  [
    'Mirtazapine',
    'Atypical antidepressant',
    'Antidepressant that can help sleep and appetite.',
    ['7.5 mg', '15 mg', '30 mg'],
  ],
  [
    'Bupropion SR',
    'Atypical antidepressant',
    'Antidepressant; also used for smoking cessation.',
    ['150 mg', '300 mg'],
  ],
  [
    'Trazodone',
    'Atypical antidepressant',
    'Antidepressant often used at low dose for sleep.',
    ['25 mg', '50 mg', '100 mg'],
  ],
  [
    'Vortioxetine',
    'Atypical antidepressant',
    'Antidepressant for major depressive disorder.',
    ['5 mg', '10 mg', '20 mg'],
  ],
  [
    'Agomelatine',
    'Atypical antidepressant',
    'Antidepressant acting on melatonin receptors.',
    ['25 mg'],
  ],
  [
    'Amitriptyline',
    'TCA',
    'Tricyclic antidepressant; low dose for pain and sleep.',
    ['10 mg', '25 mg'],
  ],
  ['Nortriptyline', 'TCA', 'Tricyclic antidepressant.', ['10 mg', '25 mg']],
  [
    'Clomipramine',
    'TCA',
    'Tricyclic used for OCD and depression.',
    ['25 mg', '50 mg'],
  ],
  ['Imipramine', 'TCA', 'Tricyclic antidepressant.', ['25 mg']],
  [
    'Quetiapine',
    'Antipsychotic',
    'Atypical antipsychotic; bipolar disorder and adjunct in depression.',
    ['25 mg', '50 mg', '100 mg', '200 mg'],
  ],
  [
    'Olanzapine',
    'Antipsychotic',
    'Atypical antipsychotic for schizophrenia and bipolar disorder.',
    ['2.5 mg', '5 mg', '10 mg'],
  ],
  [
    'Risperidone',
    'Antipsychotic',
    'Atypical antipsychotic.',
    ['0.5 mg', '1 mg', '2 mg'],
  ],
  [
    'Aripiprazole',
    'Antipsychotic',
    'Atypical antipsychotic; adjunct in depression.',
    ['2 mg', '5 mg', '10 mg', '15 mg'],
  ],
  [
    'Lurasidone',
    'Antipsychotic',
    'Atypical antipsychotic; bipolar depression.',
    ['20 mg', '40 mg'],
  ],
  [
    'Haloperidol',
    'Antipsychotic',
    'Typical antipsychotic.',
    ['0.5 mg', '5 mg'],
  ],
  [
    'Clozapine',
    'Antipsychotic',
    'For treatment-resistant schizophrenia; needs blood monitoring.',
    ['25 mg', '100 mg'],
  ],
  [
    'Lithium carbonate',
    'Mood stabiliser',
    'Mood stabiliser for bipolar disorder; needs level monitoring.',
    ['300 mg', '400 mg'],
  ],
  [
    'Sodium valproate',
    'Mood stabiliser',
    'Mood stabiliser and anticonvulsant.',
    ['200 mg', '500 mg'],
  ],
  [
    'Lamotrigine',
    'Mood stabiliser',
    'Mood stabiliser for bipolar depression; titrate slowly.',
    ['25 mg', '50 mg', '100 mg'],
  ],
  [
    'Carbamazepine',
    'Mood stabiliser',
    'Mood stabiliser and anticonvulsant.',
    ['200 mg'],
  ],
  [
    'Clonazepam',
    'Benzodiazepine',
    'Short-term relief of severe anxiety or panic.',
    ['0.25 mg', '0.5 mg', '1 mg'],
  ],
  [
    'Lorazepam',
    'Benzodiazepine',
    'Short-term relief of severe anxiety.',
    ['0.5 mg', '1 mg', '2 mg'],
  ],
  [
    'Alprazolam',
    'Benzodiazepine',
    'Short-term treatment of anxiety and panic.',
    ['0.25 mg', '0.5 mg'],
  ],
  [
    'Diazepam',
    'Benzodiazepine',
    'Anxiety and muscle spasm; short-term use.',
    ['2 mg', '5 mg'],
  ],
  [
    'Buspirone',
    'Anxiolytic',
    'Non-sedating treatment for generalised anxiety.',
    ['5 mg', '10 mg'],
  ],
  [
    'Hydroxyzine',
    'Anxiolytic',
    'Antihistamine used for anxiety and itching.',
    ['10 mg', '25 mg'],
  ],
  [
    'Pregabalin',
    'Anxiolytic',
    'Generalised anxiety and neuropathic pain.',
    ['75 mg', '150 mg'],
  ],
  [
    'Propranolol',
    'Beta blocker',
    'Reduces physical symptoms of performance anxiety.',
    ['10 mg', '40 mg'],
  ],
  [
    'Zolpidem',
    'Hypnotic',
    'Short-term treatment of insomnia.',
    ['5 mg', '10 mg'],
  ],
  [
    'Zopiclone',
    'Hypnotic',
    'Short-term treatment of insomnia.',
    ['3.75 mg', '7.5 mg'],
  ],
  [
    'Melatonin PR',
    'Hypnotic',
    'Prolonged-release melatonin for insomnia.',
    ['2 mg'],
  ],
  [
    'Methylphenidate',
    'Stimulant',
    'ADHD treatment.',
    ['5 mg', '10 mg', '18 mg ER', '36 mg ER'],
  ],
  [
    'Atomoxetine',
    'ADHD non-stimulant',
    'Non-stimulant ADHD treatment.',
    ['18 mg', '40 mg'],
  ],
  [
    'Naltrexone',
    'Addiction',
    'Reduces alcohol and opioid cravings.',
    ['50 mg'],
  ],
  [
    'Acamprosate',
    'Addiction',
    'Maintains abstinence from alcohol.',
    ['333 mg'],
  ],
  ['Disulfiram', 'Addiction', 'Alcohol deterrent.', ['250 mg']],
];

function medications() {
  const out: { name: string; category: string; description: string }[] = [];
  for (const [drug, category, description, strengths] of DRUGS) {
    for (const s of strengths)
      out.push({ name: `${drug} ${s}`, category, description });
  }
  return out.slice(0, 100);
}

/* ─── Assessments ─── */

const SCALE_ITEMS = DEFAULT_SECTIONS.flatMap((s) => s.items)
  .filter((i) => i.type === 'scale')
  .map((i) => i.id);
const FOLLOW_UPS = [
  'Review sleep diary next session.',
  'Check homework completion (thought records).',
  'Re-score PHQ-9 at next visit.',
  'Discuss medication side effects with GP.',
  'Continue graded exposure plan.',
  'Monitor mood over the anniversary date.',
  'Revisit safety plan; no current concerns.',
  '',
];
const NOTES = [
  'Engaged well; reported fewer intrusive worries this week.',
  'Low energy at start, brighter by the end of the session.',
  'Practised grounding exercise; tolerated discussion of trigger.',
  'Some avoidance when discussing work; agreed small behavioural goal.',
  'Good insight into thinking patterns; completed most homework.',
  'Tearful at times; supportive session focused on coping strategies.',
];

/** 50 submitted, 30 drafts, 20 ready for review. */
const statusFor = (i: number) =>
  i % 10 < 5 ? 'submitted' : i % 10 < 8 ? 'draft' : 'ready_for_review';

function responses(i: number, partial: boolean) {
  const r = SCALE_ITEMS.map((itemId, n) => {
    if (partial && n > 8 + (i % 6))
      return { itemId, state: 'blank', score: null };
    if ((i + n) % 23 === 0)
      return { itemId, state: 'not_observed', score: null };
    return { itemId, state: 'scored', score: 3 + ((i * 7 + n * 3) % 7) };
  });
  const text = FOLLOW_UPS[i % FOLLOW_UPS.length];
  r.push(
    text && !partial
      ? ({ itemId: 'follow_up', state: 'scored', text, score: null } as never)
      : { itemId: 'follow_up', state: 'blank', score: null },
  );
  return r;
}

/* ─── Scheduling: free slots, weekdays 08:00–19:00 IST, last 14 days ─── */

const OPEN = 8;
const CLOSE = 19;
const at = (date: string, minutes: number) =>
  new Date(
    `${date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00${TZ}`,
  );
const istDate = (d: Date) =>
  new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

function freeSlots(
  busy: { start: Date; end: Date }[],
  durations: number[],
  count: number,
) {
  const now = Date.now();
  const slots: { start: Date; end: Date }[] = [];
  // Oldest day first, so the newest days don't absorb everything.
  for (let back = 13; back >= 0 && slots.length < count; back--) {
    const date = istDate(new Date(now - back * 86_400_000));
    const dow = new Date(`${date}T12:00:00${TZ}`).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (let m = OPEN * 60; m < CLOSE * 60 && slots.length < count; m += 15) {
      const minutes = durations[slots.length % durations.length];
      const start = at(date, m);
      const end = new Date(start.getTime() + minutes * 60_000);
      if (end > at(date, CLOSE * 60) || end.getTime() > now) continue;
      if (busy.some((b) => b.start < end && b.end > start)) continue;
      busy.push({ start, end });
      slots.push({ start, end });
      m += minutes - 15;
    }
  }
  return slots;
}

/* ─── Main ─── */

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri)
    throw new Error('MONGO_URI is not set — copy .env.example to .env first');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  const practitioner = await db
    .collection('practitioners')
    .findOne({ email: PRACTITIONER_EMAIL }, { projection: { practiceId: 1 } });
  if (!practitioner)
    throw new Error(`Practitioner ${PRACTITIONER_EMAIL} not found`);
  const practitionerId = practitioner._id as Types.ObjectId;
  const practiceId = practitioner.practiceId as Types.ObjectId;
  const now = new Date();

  /* Medications — practitionerId stored as a string, matching rows the API writes. */
  const meds = db.collection('medications');
  const wanted = medications();
  const have = new Set(
    (
      await meds
        .find<{
          name: string;
        }>(
          {
            practitionerId: { $in: [practitionerId, String(practitionerId)] },
            name: { $in: wanted.map((m) => m.name) },
          },
          { projection: { name: 1 } },
        )
        .toArray()
    ).map((m) => m.name),
  );
  const newMeds = wanted.filter((m) => !have.has(m.name));
  if (newMeds.length) {
    await meds.insertMany(
      newMeds.map((m, i) => ({
        ...m,
        practitionerId: String(practitionerId),
        seedTag: SEED_TAG,
        createdAt: new Date(now.getTime() - (newMeds.length - i) * 60_000),
        updatedAt: now,
        __v: 0,
      })),
    );
  }
  console.log(
    `Medications: ${newMeds.length} added, ${wanted.length - newMeds.length} already present.`,
  );

  /* Sessions + assessments */
  const appointments = db.collection('appointments');
  const assessments = db.collection('sessionassessments');
  if (await appointments.findOne({ seedTag: SEED_TAG })) {
    console.log(
      'Assessments: already seeded (rows tagged bulk-clinical-v1 exist) — skipped.',
    );
    await mongoose.disconnect();
    return;
  }

  const patients = await db
    .collection('patients')
    .find({ seedTag: PATIENT_TAG, practiceId }, { projection: { _id: 1 } })
    .toArray();
  if (!patients.length)
    throw new Error('No bulk patients found — run seed-bulk-patients.ts first');

  const types = await db
    .collection('appointmenttypes')
    .find<{ _id: Types.ObjectId; name: string; durationMinutes: number }>({
      practitionerId,
      name: {
        $in: ['Follow-Up Session', 'Counselling Session', 'CBT Session'],
      },
    })
    .toArray();
  if (!types.length)
    throw new Error('Appointment types not found for the practitioner');

  const template = await db
    .collection('assessmenttemplates')
    .findOne(
      { key: DEFAULT_TEMPLATE_KEY, practiceId },
      { sort: { version: -1 } },
    );
  const templateVersion = (template?.version as number | undefined) ?? 1;

  const since = new Date(now.getTime() - 15 * 86_400_000);
  const busy = (
    await appointments
      .find(
        {
          practitionerId,
          start: { $gte: since },
          status: { $nin: ['cancelled', 'no_show'] },
        },
        { projection: { start: 1, end: 1 } },
      )
      .toArray()
  ).map((a) => ({ start: a.start as Date, end: a.end as Date }));

  const durations = types.map((t) => t.durationMinutes);
  const slots = freeSlots(busy, durations, SESSIONS);
  if (slots.length < SESSIONS)
    console.log(
      `Only ${slots.length} free slots in the last 14 days — seeding that many.`,
    );

  const apptDocs = slots.map((slot, i) => {
    const type = types[i % types.length];
    return {
      _id: new Types.ObjectId(),
      practiceId,
      practitionerId,
      patientId: patients[i % patients.length]._id,
      appointmentTypeId: type._id,
      title: type.name,
      start: slot.start,
      end: slot.end,
      status: 'completed',
      notes: '',
      seedTag: SEED_TAG,
      createdAt: new Date(slot.start.getTime() - 7 * 86_400_000),
      updatedAt: slot.end,
    };
  });
  await appointments.insertMany(apptDocs);

  const assessmentDocs = apptDocs.map((a, i) => {
    const status = statusFor(i);
    const saved = new Date(a.end.getTime() + 20 * 60_000);
    const final = status === 'submitted';
    return {
      practiceId,
      appointmentId: a._id,
      patientId: a.patientId,
      practitionerId,
      format: 'v2',
      templateKey: DEFAULT_TEMPLATE_KEY,
      templateVersion,
      status,
      revision: final ? 3 : 1 + (i % 3),
      responses: responses(i, status === 'draft'),
      notes: NOTES[i % NOTES.length],
      summary: final
        ? {
            text: `${NOTES[i % NOTES.length]} Observations recorded across behaviour, communication and mood.`,
            generatedBy: 'template',
            generatedAt: saved,
            edited: false,
            approved: true,
            approvedAt: saved,
          }
        : null,
      // The patient document for a submitted assessment is created on first view.
      submittedAt: final ? saved : undefined,
      lastSavedAt: saved,
      amendments: [],
      seedTag: SEED_TAG,
      createdAt: a.end,
      updatedAt: saved,
      __v: 0,
    };
  });
  await assessments.insertMany(assessmentDocs);

  const by = (s: string) => assessmentDocs.filter((d) => d.status === s).length;
  console.log(
    `Assessments: ${assessmentDocs.length} added on ${apptDocs.length} completed sessions ` +
      `(${by('submitted')} submitted, ${by('draft')} drafts, ${by('ready_for_review')} ready for review).`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
