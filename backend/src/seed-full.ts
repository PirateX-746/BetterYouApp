/**
 * Full Database Seed — BetterYou Health
 * Wipes and repopulates all collections with realistic demo data.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/seed-full.ts
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;
const SALT_ROUNDS = 10;
const PASSWORD_HASH_PLACEHOLDER = ''; // filled below

/* ══════════════════════════════════════════════════════════════
   SCHEMAS (permissive, strict:false so extra fields are allowed)
══════════════════════════════════════════════════════════════ */
const S = { strict: false, timestamps: true };

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
  S,
);

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
    lastVisit: Date,
    role: { type: String, default: 'patient' },
    isActive: { type: Boolean, default: true },
  },
  S,
);

const AppointmentSchema = new mongoose.Schema(
  {
    title: String,
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Practitioner' },
    start: Date,
    end: Date,
    status: { type: String, default: 'scheduled' },
    notes: String,
    checkedInAt: Date,
  },
  S,
);

const PrescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Practitioner' },
    diagnosis: String,
    medications: [{ name: String, dosage: String, frequency: String, duration: String }],
    notes: String,
    status: { type: String, default: 'active' },
  },
  S,
);

const ProgressNoteSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Practitioner' },
    title: String,
    sessionDate: Date,
    content: String,
    progressScore: Number,
    mood: String,
    symptoms: [String],
    observations: String,
    nextSteps: String,
  },
  S,
);

const FollowUpNoteSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Practitioner' },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    title: String,
    summary: String,
    recommendations: String,
    actionItems: [String],
    followUpDate: Date,
  },
  S,
);

const TreatmentPlanSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Practitioner' },
    title: String,
    startDate: Date,
    endDate: Date,
    goals: [{ goal: String, status: String }],
    interventions: [String],
    status: { type: String, default: 'active' },
    notes: String,
  },
  S,
);

const DocumentSchema = new mongoose.Schema(
  {
    type: String,
    date: Date,
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Practitioner' },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    status: { type: String, default: 'finalized' },
    content: mongoose.Schema.Types.Mixed,
    signedAt: Date,
  },
  S,
);

const ConversationSchema = new mongoose.Schema(
  {
    patientId: String,
    practitionerId: String,
    unreadForPatient: { type: Number, default: 0 },
    unreadForPractitioner: { type: Number, default: 0 },
  },
  S,
);
ConversationSchema.index({ patientId: 1, practitionerId: 1 }, { unique: true });

const MessageSchema = new mongoose.Schema(
  {
    conversationId: String,
    senderId: String,
    text: String,
    status: { type: String, default: 'seen' },
  },
  S,
);

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function hourOffset(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 3_600_000);
}

function mrn(suffix: string): string {
  return `MRN-2024-${suffix}`;
}

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const hash = await bcrypt.hash('Admin@123', SALT_ROUNDS);

  /* ── Models ── */
  const Practitioner = mongoose.model('Practitioner', PractitionerSchema);
  const Patient      = mongoose.model('Patient',      PatientSchema);
  const Appointment  = mongoose.model('Appointment',  AppointmentSchema);
  const Prescription = mongoose.model('Prescription', PrescriptionSchema);
  const ProgressNote = mongoose.model('ProgressNote', ProgressNoteSchema);
  const FollowUpNote = mongoose.model('FollowUpNote', FollowUpNoteSchema);
  const TreatmentPlan= mongoose.model('TreatmentPlan',TreatmentPlanSchema);
  const MedicalDocument = mongoose.model('MedicalDocument', DocumentSchema);
  const Conversation = mongoose.model('Conversation', ConversationSchema);
  const Message      = mongoose.model('Message',      MessageSchema);

  /* ── Wipe dependent collections ── */
  await Promise.all([
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    Prescription.deleteMany({}),
    ProgressNote.deleteMany({}),
    FollowUpNote.deleteMany({}),
    TreatmentPlan.deleteMany({}),
    MedicalDocument.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log('🗑  Cleared dependent collections');

  /* ══════════════════════════════════════════
     PRACTITIONERS — upsert 1 (standalone app)
  ══════════════════════════════════════════ */
  await Practitioner.deleteMany({});
  const sarah = await Practitioner.findOneAndUpdate(
    { email: 'dr.sarah@betteryou.com' },
    {
      firstName: 'Sarah', lastName: 'Mitchell',
      dateOfBirth: new Date('1985-03-15'),
      email: 'dr.sarah@betteryou.com',
      password: hash,
      specialization: 'Clinical Psychology',
      experienceYears: 12,
      role: 'practitioner',
    },
    { upsert: true, new: true },
  );
  console.log('✅ Practitioner ready (dr.sarah@betteryou.com)');

  const james = sarah; // all data assigned to Sarah only

  /* ══════════════════════════════════════════
     PATIENTS — 8 realistic profiles
  ══════════════════════════════════════════ */
  const patientsData = [
    {
      firstName: 'Maya', lastName: 'Sharma',
      dateOfBirth: new Date('1994-06-12'),
      email: 'maya.sharma@gmail.com',
      mrn: mrn('1001'), phoneNo: '9876543210',
      gender: 'female', bloodGroup: 'B+',
      allergies: 'Penicillin',
      healthCondition: 'Major Depressive Disorder, Generalised Anxiety Disorder',
      lastVisit: daysAgo(7),
    },
    {
      firstName: 'Rahul', lastName: 'Mehta',
      dateOfBirth: new Date('1988-11-30'),
      email: 'rahul.mehta@outlook.com',
      mrn: mrn('1002'), phoneNo: '9812345678',
      gender: 'male', bloodGroup: 'O-',
      allergies: 'None known',
      healthCondition: 'Post-Traumatic Stress Disorder (PTSD)',
      lastVisit: daysAgo(14),
    },
    {
      firstName: 'Priya', lastName: 'Nair',
      dateOfBirth: new Date('1997-02-18'),
      email: 'priya.nair@gmail.com',
      mrn: mrn('1003'), phoneNo: '9900112233',
      gender: 'female', bloodGroup: 'A+',
      allergies: 'Sulfa drugs',
      healthCondition: 'Bipolar Disorder Type I',
      lastVisit: daysAgo(3),
    },
    {
      firstName: 'Arjun', lastName: 'Kapoor',
      dateOfBirth: new Date('1990-08-25'),
      email: 'arjun.kapoor@yahoo.com',
      mrn: mrn('1004'), phoneNo: '9988776655',
      gender: 'male', bloodGroup: 'AB+',
      allergies: 'Latex, Aspirin',
      healthCondition: 'Obsessive-Compulsive Disorder (OCD)',
      lastVisit: daysAgo(10),
    },
    {
      firstName: 'Neha', lastName: 'Singh',
      dateOfBirth: new Date('2000-04-09'),
      email: 'neha.singh@gmail.com',
      mrn: mrn('1005'), phoneNo: '9111222333',
      gender: 'female', bloodGroup: 'O+',
      allergies: 'None',
      healthCondition: 'Anorexia Nervosa, Mild Depression',
      lastVisit: daysAgo(21),
    },
    {
      firstName: 'Vikram', lastName: 'Joshi',
      dateOfBirth: new Date('1975-12-01'),
      email: 'vikram.joshi@rediffmail.com',
      mrn: mrn('1006'), phoneNo: '9222333444',
      gender: 'male', bloodGroup: 'B-',
      allergies: 'Haloperidol (EPS side effects)',
      healthCondition: 'Schizophrenia (stable, on clozapine)',
      lastVisit: daysAgo(5),
    },
    {
      firstName: 'Aisha', lastName: 'Khan',
      dateOfBirth: new Date('1999-07-22'),
      email: 'aisha.khan@gmail.com',
      mrn: mrn('1007'), phoneNo: '9333444555',
      gender: 'female', bloodGroup: 'A-',
      allergies: 'None known',
      healthCondition: 'Social Anxiety Disorder, Panic Disorder',
      lastVisit: daysAgo(1),
    },
    {
      firstName: 'Dev', lastName: 'Patel',
      dateOfBirth: new Date('1993-03-15'),
      email: 'dev.patient@betteryou.com',
      mrn: mrn('1008'), phoneNo: '9444555666',
      gender: 'male', bloodGroup: 'O+',
      allergies: 'None',
      healthCondition: 'Generalised Anxiety Disorder',
      lastVisit: daysAgo(30),
    },
  ];

  const patients = await Patient.insertMany(
    patientsData.map((p) => ({ ...p, password: hash, role: 'patient', isActive: true })),
  );
  console.log(`✅ ${patients.length} patients created`);

  const [maya, rahul, priya, arjun, neha, vikram, aisha, dev] = patients;
  const sId = sarah!._id;
  const jId = sId; // single practitioner — all data flows to Dr. Sarah

  /* ══════════════════════════════════════════
     APPOINTMENTS — 30 spread across time
  ══════════════════════════════════════════ */
  const appts = await Appointment.insertMany([
    /* ── COMPLETED (past) ── */
    { title: 'Initial Assessment', patientId: maya._id, practitionerId: sId, start: daysAgo(60), end: hourOffset(daysAgo(60), 1), status: 'completed', notes: 'Intake completed. GAD-7 score: 18. Discussed treatment goals.' },
    { title: 'CBT Session 2', patientId: maya._id, practitionerId: sId, start: daysAgo(53), end: hourOffset(daysAgo(53), 1), status: 'completed', notes: 'Introduced thought records. Patient engaging well.' },
    { title: 'CBT Session 3', patientId: maya._id, practitionerId: sId, start: daysAgo(46), end: hourOffset(daysAgo(46), 1), status: 'completed', notes: 'Reviewed thought records. Mood improving.' },
    { title: 'Medication Review', patientId: maya._id, practitionerId: jId, start: daysAgo(30), end: hourOffset(daysAgo(30), 0.5), status: 'completed', notes: 'Sertraline 50mg continued. No adverse effects.' },
    { title: 'CBT Session 4', patientId: maya._id, practitionerId: sId, start: daysAgo(14), end: hourOffset(daysAgo(14), 1), status: 'completed', notes: 'Exposure hierarchy constructed. Patient motivated.' },
    { title: 'CBT Session 5', patientId: maya._id, practitionerId: sId, start: daysAgo(7), end: hourOffset(daysAgo(7), 1), status: 'completed', notes: 'Completed first exposure exercise. GAD-7: 11.' },

    { title: 'PTSD Assessment', patientId: rahul._id, practitionerId: sId, start: daysAgo(90), end: hourOffset(daysAgo(90), 1.5), status: 'completed', notes: 'PCL-5 score: 52. Confirmed PTSD diagnosis. Psychoeducation provided.' },
    { title: 'EMDR Session 1', patientId: rahul._id, practitionerId: sId, start: daysAgo(76), end: hourOffset(daysAgo(76), 1), status: 'completed', notes: 'History taking and target identification.' },
    { title: 'EMDR Session 2', patientId: rahul._id, practitionerId: sId, start: daysAgo(62), end: hourOffset(daysAgo(62), 1), status: 'completed', notes: 'Processing trauma memory. SUDS reduced from 9 to 5.' },
    { title: 'EMDR Session 3', patientId: rahul._id, practitionerId: sId, start: daysAgo(48), end: hourOffset(daysAgo(48), 1), status: 'completed', notes: 'Continued processing. VoC increased to 5.' },
    { title: 'Medication Consult', patientId: rahul._id, practitionerId: jId, start: daysAgo(35), end: hourOffset(daysAgo(35), 0.5), status: 'completed', notes: 'Initiated Prazosin 1mg for nightmares.' },
    { title: 'EMDR Session 4', patientId: rahul._id, practitionerId: sId, start: daysAgo(14), end: hourOffset(daysAgo(14), 1), status: 'completed', notes: 'Target memory fully processed. PCL-5: 32.' },

    { title: 'Bipolar Initial Assessment', patientId: priya._id, practitionerId: jId, start: daysAgo(45), end: hourOffset(daysAgo(45), 1), status: 'completed', notes: 'YMRS: 8, PHQ-9: 12. Currently in depressive phase. Lamotrigine initiated.' },
    { title: 'Mood Monitoring Check-In', patientId: priya._id, practitionerId: jId, start: daysAgo(30), end: hourOffset(daysAgo(30), 0.5), status: 'completed', notes: 'Mood stable. Sleep improved. Lamotrigine 50mg tolerated well.' },
    { title: 'Psychoeducation Session', patientId: priya._id, practitionerId: sId, start: daysAgo(15), end: hourOffset(daysAgo(15), 1), status: 'completed', notes: 'Mood charting introduced. Discussed triggers and early warning signs.' },
    { title: 'Medication Adjustment', patientId: priya._id, practitionerId: jId, start: daysAgo(3), end: hourOffset(daysAgo(3), 0.5), status: 'completed', notes: 'Lamotrigine increased to 100mg. Patient tolerating well.' },

    { title: 'OCD Assessment', patientId: arjun._id, practitionerId: sId, start: daysAgo(55), end: hourOffset(daysAgo(55), 1), status: 'completed', notes: 'Y-BOCS: 28 (moderate-severe). Primary obsessions: contamination. Compulsions: hand washing, checking.' },
    { title: 'ERP Introduction', patientId: arjun._id, practitionerId: sId, start: daysAgo(41), end: hourOffset(daysAgo(41), 1), status: 'completed', notes: 'Explained ERP rationale. Anxiety hierarchy created.' },
    { title: 'ERP Session 2', patientId: arjun._id, practitionerId: sId, start: daysAgo(27), end: hourOffset(daysAgo(27), 1), status: 'completed', notes: 'Touched contaminated surface without washing. Peak anxiety 8/10, habituated to 3/10.' },
    { title: 'ERP Session 3', patientId: arjun._id, practitionerId: sId, start: daysAgo(10), end: hourOffset(daysAgo(10), 1), status: 'completed', notes: 'Y-BOCS: 20. Significant improvement. Generalising gains at home.' },

    /* ── UPCOMING (future) ── */
    { title: 'CBT Session 6', patientId: maya._id, practitionerId: sId, start: daysFromNow(7), end: hourOffset(daysFromNow(7), 1), status: 'confirmed', notes: '' },
    { title: 'Follow-Up Therapy', patientId: rahul._id, practitionerId: sId, start: daysFromNow(3), end: hourOffset(daysFromNow(3), 1), status: 'scheduled', notes: '' },
    { title: 'Mood Review', patientId: priya._id, practitionerId: jId, start: daysFromNow(14), end: hourOffset(daysFromNow(14), 0.5), status: 'scheduled', notes: '' },
    { title: 'ERP Session 4', patientId: arjun._id, practitionerId: sId, start: daysFromNow(4), end: hourOffset(daysFromNow(4), 1), status: 'confirmed', notes: '' },
    { title: 'Initial Consultation', patientId: neha._id, practitionerId: sId, start: daysFromNow(2), end: hourOffset(daysFromNow(2), 1), status: 'scheduled', notes: '' },
    { title: 'Clozapine Monitoring', patientId: vikram._id, practitionerId: jId, start: daysFromNow(5), end: hourOffset(daysFromNow(5), 0.5), status: 'confirmed', notes: '' },
    { title: 'Exposure Session 1', patientId: aisha._id, practitionerId: sId, start: daysFromNow(1), end: hourOffset(daysFromNow(1), 1), status: 'confirmed', notes: '' },
    { title: 'CBT Check-In', patientId: dev._id, practitionerId: sId, start: daysFromNow(10), end: hourOffset(daysFromNow(10), 1), status: 'scheduled', notes: '' },

    /* ── NO-SHOW / CANCELLED ── */
    { title: 'CBT Session (No Show)', patientId: maya._id, practitionerId: sId, start: daysAgo(21), end: hourOffset(daysAgo(21), 1), status: 'no_show', notes: 'Patient did not attend. Follow-up call made.' },
    { title: 'Assessment (Cancelled)', patientId: neha._id, practitionerId: sId, start: daysAgo(28), end: hourOffset(daysAgo(28), 1), status: 'cancelled', notes: 'Patient requested reschedule due to work commitments.' },
  ]);
  console.log(`✅ ${appts.length} appointments created`);

  /* ══════════════════════════════════════════
     PRESCRIPTIONS
  ══════════════════════════════════════════ */
  await Prescription.insertMany([
    /* Maya — GAD + MDD */
    {
      patientId: maya._id, practitionerId: jId,
      diagnosis: 'Major Depressive Disorder with Anxiety',
      medications: [
        { name: 'Sertraline', dosage: '50mg', frequency: 'Once daily (morning)', duration: '3 months' },
        { name: 'Clonazepam', dosage: '0.5mg', frequency: 'As needed for acute anxiety (max 1/day)', duration: '1 month (tapering plan attached)' },
      ],
      notes: 'Monitor for serotonin syndrome. Review in 4 weeks. Avoid alcohol.',
      status: 'active',
    },
    {
      patientId: maya._id, practitionerId: jId,
      diagnosis: 'Generalised Anxiety Disorder — augmentation',
      medications: [
        { name: 'Sertraline', dosage: '100mg', frequency: 'Once daily (morning)', duration: 'Ongoing' },
        { name: 'Buspirone', dosage: '10mg', frequency: 'Twice daily', duration: '2 months' },
      ],
      notes: 'Dose increased due to partial response. Review in 6 weeks.',
      status: 'active',
    },

    /* Rahul — PTSD */
    {
      patientId: rahul._id, practitionerId: jId,
      diagnosis: 'Post-Traumatic Stress Disorder',
      medications: [
        { name: 'Prazosin', dosage: '1mg', frequency: 'Once daily (bedtime)', duration: '8 weeks' },
        { name: 'Paroxetine', dosage: '20mg', frequency: 'Once daily (morning)', duration: '6 months' },
      ],
      notes: 'Check BP before increasing Prazosin. Screen for suicidality at each visit.',
      status: 'active',
    },

    /* Priya — Bipolar */
    {
      patientId: priya._id, practitionerId: jId,
      diagnosis: 'Bipolar Disorder Type I — depressive phase',
      medications: [
        { name: 'Lamotrigine', dosage: '100mg', frequency: 'Once daily', duration: 'Ongoing (mood stabiliser)' },
        { name: 'Quetiapine', dosage: '25mg', frequency: 'Bedtime (PRN for insomnia/agitation)', duration: '6 weeks' },
      ],
      notes: 'Titrate slowly. Watch for rash (Stevens-Johnson). No antidepressant monotherapy.',
      status: 'active',
    },
    {
      patientId: priya._id, practitionerId: jId,
      diagnosis: 'Bipolar I — manic episode (historical)',
      medications: [
        { name: 'Lithium Carbonate', dosage: '400mg', frequency: 'Twice daily', duration: '6 months' },
        { name: 'Haloperidol', dosage: '5mg', frequency: 'As needed (acute mania)', duration: '2 weeks' },
      ],
      notes: 'Prior episode 2023. Lithium discontinued due to adherence issues.',
      status: 'completed',
    },

    /* Arjun — OCD */
    {
      patientId: arjun._id, practitionerId: jId,
      diagnosis: 'Obsessive-Compulsive Disorder',
      medications: [
        { name: 'Fluvoxamine', dosage: '150mg', frequency: 'Once daily (evening)', duration: 'Ongoing' },
        { name: 'Clomipramine', dosage: '25mg', frequency: 'Once daily', duration: '8 weeks (augmentation trial)' },
      ],
      notes: 'Fluvoxamine first-line SSRI for OCD. Monitor for QTc prolongation with Clomipramine.',
      status: 'active',
    },

    /* Vikram — Schizophrenia */
    {
      patientId: vikram._id, practitionerId: jId,
      diagnosis: 'Paranoid Schizophrenia — stable',
      medications: [
        { name: 'Clozapine', dosage: '200mg', frequency: 'Once daily (bedtime)', duration: 'Ongoing (monthly WBC required)' },
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', duration: 'Ongoing (metabolic syndrome prophylaxis)' },
        { name: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily (bedtime)', duration: 'Ongoing' },
      ],
      notes: 'WBC last checked 2 weeks ago (within range). Next CBC in 2 weeks. Weight & glucose monthly.',
      status: 'active',
    },

    /* Aisha — SAD + Panic */
    {
      patientId: aisha._id, practitionerId: jId,
      diagnosis: 'Social Anxiety Disorder with Panic Attacks',
      medications: [
        { name: 'Escitalopram', dosage: '10mg', frequency: 'Once daily (morning)', duration: '6 months' },
        { name: 'Propranolol', dosage: '10mg', frequency: 'As needed (1 hour before high-anxiety situations)', duration: 'Ongoing' },
      ],
      notes: 'Start low, go slow. Review in 6 weeks. Psychotherapy is primary treatment.',
      status: 'active',
    },

    /* Neha — Anorexia */
    {
      patientId: neha._id, practitionerId: jId,
      diagnosis: 'Anorexia Nervosa with comorbid Depression',
      medications: [
        { name: 'Fluoxetine', dosage: '20mg', frequency: 'Once daily (morning)', duration: '12 weeks' },
        { name: 'Olanzapine', dosage: '2.5mg', frequency: 'Once daily (bedtime, weight gain adjunct)', duration: '8 weeks' },
      ],
      notes: 'Monitor weight weekly. Electrolytes monthly. Refer to dietitian.',
      status: 'active',
    },
  ]);
  console.log('✅ Prescriptions created');

  /* ══════════════════════════════════════════
     PROGRESS NOTES — 4-5 per patient
  ══════════════════════════════════════════ */
  await ProgressNote.insertMany([
    /* Maya */
    { patientId: maya._id, practitionerId: sId, title: 'Session 1 — Intake', sessionDate: daysAgo(60), progressScore: 3, mood: 'Depressed', symptoms: ['Low mood', 'Insomnia', 'Anhedonia', 'Worry'], content: 'Patient presented with a 4-month history of persistent low mood and anxiety. PHQ-9: 19, GAD-7: 18. Discussed treatment goals and introduced psychoeducation.', observations: 'Poor eye contact initially. Tearful when discussing work stressors. Open to therapy.', nextSteps: 'Begin thought records between sessions. Schedule medication consult.' },
    { patientId: maya._id, practitionerId: sId, title: 'Session 2 — Thought Records', sessionDate: daysAgo(53), progressScore: 4, mood: 'Anxious', symptoms: ['Worry', 'Tension', 'Concentration difficulties'], content: 'Reviewed thought records. Patient identified 3 negative automatic thoughts. Began challenging cognitive distortions.', observations: 'More engaged than last session. Completed homework reliably.', nextSteps: 'Continue thought records. Introduce behavioural activation schedule.' },
    { patientId: maya._id, practitionerId: sId, title: 'Session 3 — Behavioural Activation', sessionDate: daysAgo(46), progressScore: 5, mood: 'Neutral', symptoms: ['Mild worry', 'Sleep issues'], content: 'Behavioural activation schedule implemented. Patient re-engaged with morning walks and cooking. PHQ-9: 14.', observations: 'Visible improvement in energy. Reports enjoying activities for the first time in months.', nextSteps: 'Begin exposure hierarchy planning for social anxiety component.' },
    { patientId: maya._id, practitionerId: sId, title: 'Session 4 — Exposure Planning', sessionDate: daysAgo(14), progressScore: 6, mood: 'Hopeful', symptoms: ['Anticipatory anxiety'], content: 'Collaboratively constructed exposure hierarchy. Patient identified 8 situations ranging from SUDS 3-9.', observations: 'Good insight. Motivated. Expressed confidence in managing anxiety.', nextSteps: 'Begin exposure practice with SUDS-3 situation (eating in café alone).' },
    { patientId: maya._id, practitionerId: sId, title: 'Session 5 — First Exposure', sessionDate: daysAgo(7), progressScore: 7, mood: 'Positive', symptoms: ['Mild anxiety'], content: 'Patient completed first exposure. Anxiety peaked at 6/10, reduced to 2/10 after 20 minutes. GAD-7: 11, PHQ-9: 10.', observations: 'Proud of achievement. Generalising skills spontaneously.', nextSteps: 'Proceed to SUDS-5 exposure. Continue medication at current dose.' },

    /* Rahul */
    { patientId: rahul._id, practitionerId: sId, title: 'PTSD Assessment — Session 1', sessionDate: daysAgo(90), progressScore: 2, mood: 'Distressed', symptoms: ['Flashbacks', 'Nightmares', 'Hypervigilance', 'Avoidance', 'Emotional numbing'], content: 'PCL-5: 52. Detailed trauma history taken. Incident occurred 18 months ago (road accident). Patient avoids driving and crowded spaces.', observations: 'Heightened startle response observed. Limited eye contact. Reports sleep of 3-4 hours per night.', nextSteps: 'Psychoeducation on PTSD. Introduce grounding techniques. Refer for medication consult.' },
    { patientId: rahul._id, practitionerId: sId, title: 'EMDR — Preparation', sessionDate: daysAgo(76), progressScore: 3, mood: 'Apprehensive', symptoms: ['Nightmares', 'Hypervigilance'], content: 'EMDR history taking and resource installation. Safe place imagery established (mountain cabin). Target identified: worst moment of accident.', observations: 'Engaged with resource installation. Reported safe place imagery vivid and calming.', nextSteps: 'Begin EMDR desensitisation next session. Practice safe place daily.' },
    { patientId: rahul._id, practitionerId: sId, title: 'EMDR — Desensitisation Phase', sessionDate: daysAgo(62), progressScore: 5, mood: 'Relieved', symptoms: ['Mild hypervigilance', 'Occasional nightmares'], content: 'SUDS reduced from 9 to 5 during bilateral stimulation. Patient able to process trauma narrative without dissociating.', observations: 'Significant reduction in physiological reactivity during target processing.', nextSteps: 'Continue desensitisation. Increase Prazosin if nightmares persist.' },
    { patientId: rahul._id, practitionerId: sId, title: 'EMDR — Continued Processing', sessionDate: daysAgo(48), progressScore: 6, mood: 'Calmer', symptoms: ['Occasional nightmares'], content: 'VoC for positive cognition ("I am safe now") increased from 3 to 5. SUDS down to 2. Patient drove for first time since accident.', observations: 'Remarkable progress. Patient reported driving felt "manageable but nerve-wracking."', nextSteps: 'Consolidation phase. Introduce driving graded exposure programme.' },
    { patientId: rahul._id, practitionerId: sId, title: 'EMDR — Closure & Progress', sessionDate: daysAgo(14), progressScore: 8, mood: 'Optimistic', symptoms: ['Mild startle'], content: 'PCL-5: 32 (below diagnostic threshold). Target memory fully processed. VoC: 6.', observations: 'Patient drove to session independently. Reports sleeping 7 hours most nights.', nextSteps: 'Monthly maintenance sessions. Relapse prevention planning.' },

    /* Priya */
    { patientId: priya._id, practitionerId: sId, title: 'Bipolar Psychoeducation — Session 1', sessionDate: daysAgo(45), progressScore: 4, mood: 'Depressed', symptoms: ['Low energy', 'Hypersomnia', 'Reduced motivation', 'Mood instability'], content: 'YMRS: 8, PHQ-9: 12. Currently in mild depressive phase. Introduced mood charting and sleep hygiene.', observations: 'Patient knowledgeable about diagnosis. Frustrated with mood unpredictability.', nextSteps: 'Begin daily mood charts. Sleep regularity protocol. Follow-up with Dr Patel.' },
    { patientId: priya._id, practitionerId: sId, title: 'Mood Charting Review', sessionDate: daysAgo(30), progressScore: 5, mood: 'Euthymic', symptoms: ['Variable energy'], content: '2-week mood chart reviewed. Identified sleep disruption precedes mood shifts by 24-48 hours. Good insight into prodromal signs.', observations: 'More stable affect. Engaged and hopeful.', nextSteps: 'Continue charting. Discuss relapse prevention triggers. Introduce interpersonal therapy concepts.' },
    { patientId: priya._id, practitionerId: sId, title: 'IPT — Life Changes', sessionDate: daysAgo(15), progressScore: 6, mood: 'Stable', symptoms: ['Mild irritability (pre-menstrual)'], content: 'Explored interpersonal role transitions (job change 6 months ago) as trigger for most recent episode.', observations: 'Strong therapeutic alliance. Patient connecting past experiences to mood patterns.', nextSteps: 'Continue IPT role transitions module. Social rhythm therapy referral considered.' },
    { patientId: priya._id, practitionerId: sId, title: 'Stability Check-In', sessionDate: daysAgo(3), progressScore: 7, mood: 'Good', symptoms: ['None significant'], content: 'PHQ-9: 5, YMRS: 2. Mood stable for 6 weeks. Sleep consolidated at 7.5 hours. No hypomanic symptoms.', observations: 'Best session to date. Patient discussing future plans and goals.', nextSteps: 'Taper to fortnightly sessions. Maintain medication. Emergency plan reviewed.' },

    /* Arjun */
    { patientId: arjun._id, practitionerId: sId, title: 'OCD Assessment', sessionDate: daysAgo(55), progressScore: 2, mood: 'Distressed', symptoms: ['Contamination obsessions', 'Excessive hand washing', 'Checking', 'Mental rituals'], content: 'Y-BOCS: 28. Primary obsession: contamination fears. Compulsions: hand washing up to 40x/day, checking locks/gas 10x before leaving home. Significant impairment.', observations: 'Wore gloves to session. Washed hands on arrival and before leaving.', nextSteps: 'Psychoeducation on OCD cycle. Introduce ERP rationale. Medication consult.' },
    { patientId: arjun._id, practitionerId: sId, title: 'ERP Introduction', sessionDate: daysAgo(41), progressScore: 3, mood: 'Anxious but motivated', symptoms: ['Contamination anxiety', 'Urges to check'], content: 'ERP rationale accepted after initial resistance. Hierarchy of 10 situations created (SUDS 20-95). Agreed to begin with touching door handle without washing.', observations: 'Intellectual understanding of ERP is strong. Emotional acceptance is a work in progress.', nextSteps: 'Practise hierarchy item 1 three times daily between sessions.' },
    { patientId: arjun._id, practitionerId: sId, title: 'ERP Session 2 — Exposure', sessionDate: daysAgo(27), progressScore: 5, mood: 'Challenged', symptoms: ['Contamination anxiety (reduced)'], content: 'In-session exposure to item 2 (touching contaminated surface). Peak anxiety 8/10, habituated to 3/10 within 25 minutes. No washing rituals.', observations: 'Patient visibly distressed initially, then noticeably calmer. Expressed surprise at anxiety reduction.', nextSteps: 'Items 1-3 daily. Begin delaying rituals by 10 minutes in other situations.' },
    { patientId: arjun._id, practitionerId: sId, title: 'ERP Session 3 — Progress', sessionDate: daysAgo(10), progressScore: 7, mood: 'Encouraged', symptoms: ['Mild checking urges'], content: 'Y-BOCS: 20 (32% improvement). Hand washing reduced to 8-10x/day. Checking behaviour reduced significantly.', observations: 'Patient reports improved quality of life. Arrived without gloves for first time.', nextSteps: 'Move to SUDS 60-70 items. Address checking compulsions formally.' },

    /* Vikram */
    { patientId: vikram._id, practitionerId: jId, title: 'Monthly Psychiatric Review', sessionDate: daysAgo(35), progressScore: 6, mood: 'Stable', symptoms: ['Occasional auditory hallucinations (low intensity)'], content: 'PANSS total: 58 (stable). Auditory hallucinations present but not distressing. Sleep good at 8 hours. Attending day programme 3x/week.', observations: 'Well-kempt appearance. Logical thought process. Good engagement.', nextSteps: 'Continue clozapine 200mg. CBC in 2 weeks. Encourage social activities.' },
    { patientId: vikram._id, practitionerId: jId, title: 'Psychiatric Review — Stable', sessionDate: daysAgo(5), progressScore: 7, mood: 'Content', symptoms: ['Background voices (non-distressing)'], content: 'WBC within normal range. Weight increased 2kg — reviewed diet and physical activity. Subjective wellbeing improved.', observations: 'Patient engaged in discussion about vocational rehabilitation.', nextSteps: 'Referral to vocational rehab. Continue monthly reviews. Metabolic monitoring.' },

    /* Aisha */
    { patientId: aisha._id, practitionerId: sId, title: 'Social Anxiety Assessment', sessionDate: daysAgo(40), progressScore: 3, mood: 'Anxious', symptoms: ['Social anxiety', 'Panic attacks', 'Avoidance', 'Physical symptoms in crowds'], content: 'SPIN: 42, PDQ: 18. Primary avoidance: public speaking, eating in restaurants, meeting strangers. Last panic attack: 3 days ago in supermarket.', observations: 'Spoke quietly, limited eye contact. Opened up considerably by session end.', nextSteps: 'Psychoeducation. Safety behaviour identification. Breathing technique introduction.' },
    { patientId: aisha._id, practitionerId: sId, title: 'Safety Behaviours & Exposure Planning', sessionDate: daysAgo(25), progressScore: 4, mood: 'Nervous but engaged', symptoms: ['Anticipatory anxiety', 'Avoidance'], content: 'Identified 7 safety behaviours (looking at phone, sitting near exits, mental rehearsal). Agreed to drop one safety behaviour per week. Exposure hierarchy constructed.', observations: 'Excellent rapport established. Patient articulate about her difficulties.', nextSteps: 'Drop phone-checking safety behaviour this week. Begin SUDS-30 exposures.' },
    { patientId: aisha._id, practitionerId: sId, title: 'Exposure Practice Review', sessionDate: daysAgo(1), progressScore: 6, mood: 'Proud', symptoms: ['Mild anticipatory anxiety'], content: 'Successfully ate in a restaurant without safety behaviours. Attended a social event for 45 minutes. SPIN: 31.', observations: 'Visibly more confident than first session. Reports social interactions "not as catastrophic" as expected.', nextSteps: 'Exposure session in-office for presentation practice. Continue diary.' },

    /* Dev */
    { patientId: dev._id, practitionerId: sId, title: 'Initial Assessment', sessionDate: daysAgo(60), progressScore: 4, mood: 'Anxious', symptoms: ['Chronic worry', 'Muscle tension', 'Fatigue', 'Difficulty concentrating'], content: 'GAD-7: 14. Primary worry domains: health, work, relationships. Physical symptoms include tension headaches and IBS-like symptoms.', observations: 'Articulate and self-aware. Has insight into anxiety being disproportionate.', nextSteps: 'Introduce worry postponement technique. Start relaxation training.' },
    { patientId: dev._id, practitionerId: sId, title: 'GAD — Progress Review', sessionDate: daysAgo(30), progressScore: 6, mood: 'Improving', symptoms: ['Worry (reduced)', 'Occasional tension'], content: 'GAD-7: 9. Worry postponement effective. IBS symptoms reduced by 60%. Attending gym 3x/week as agreed.', observations: 'More relaxed posture. Maintaining eye contact. Positive outlook.', nextSteps: 'Introduce metacognitive beliefs work. Continue activity scheduling.' },
  ]);
  console.log('✅ Progress notes created');

  /* ══════════════════════════════════════════
     FOLLOW-UP NOTES
  ══════════════════════════════════════════ */
  await FollowUpNote.insertMany([
    /* Maya */
    {
      patientId: maya._id, practitionerId: sId,
      title: 'Post-Session 2 Follow-Up',
      summary: 'Patient completing thought records as agreed. Reports 1-2 panic episodes this week, down from 5-6 in intake week.',
      recommendations: 'Continue current CBT protocol. Ensure sleep hygiene maintained.',
      actionItems: ['Complete thought record for every anxious episode', 'Morning walk 20 mins daily', 'Review Sertraline side effects at next appointment', 'Contact clinic if panic attacks increase above 3/day'],
      followUpDate: daysFromNow(7),
    },
    {
      patientId: maya._id, practitionerId: sId,
      title: 'Mid-Treatment Review',
      summary: 'Significant improvement across PHQ-9 and GAD-7. Patient successfully completing exposure exercises. Family support good.',
      recommendations: 'Increase Sertraline to 100mg if next session shows plateau. Introduce relapse prevention planning.',
      actionItems: ['Continue weekly exposures', 'Share mood diary with treating psychiatrist', 'Book 3-month medication review'],
      followUpDate: daysFromNow(21),
    },

    /* Rahul */
    {
      patientId: rahul._id, practitionerId: sId,
      title: 'Post-EMDR Session 2 Follow-Up',
      summary: 'Patient reports improved sleep after starting Prazosin. Nightmares reduced from 5-7 nights/week to 2-3 nights/week.',
      recommendations: 'Monitor Prazosin response. Ensure patient has grounding toolkit available.',
      actionItems: ['Practice 5-4-3-2-1 grounding daily', 'Use EMDR safe place before sleep', 'Track dream content and frequency', 'Avoid news coverage of accidents temporarily'],
      followUpDate: daysFromNow(3),
    },
    {
      patientId: rahul._id, practitionerId: sId,
      title: 'EMDR Completion — Relapse Prevention',
      summary: 'PCL-5 below clinical threshold. Patient functionally improved. Returned to work part-time. Driving independently.',
      recommendations: 'Monthly maintenance sessions for 3 months. Brief PCL-5 check at each visit.',
      actionItems: ['Attend monthly maintenance session', 'Call if PCL-5 symptoms return above 33', 'Continue Paroxetine for minimum 12 months post-remission', 'Share progress with GP'],
      followUpDate: daysFromNow(30),
    },

    /* Priya */
    {
      patientId: priya._id, practitionerId: sId,
      title: 'Post-Psychoeducation Follow-Up',
      summary: 'Patient completing mood charts consistently. Identified early warning signs: decreased sleep need, racing thoughts, increased spending.',
      recommendations: 'Share mood charts with Dr Patel. Trigger avoidance plan in place.',
      actionItems: ['Complete daily mood chart', 'Contact psychiatrist if sleep drops below 5 hours for 2 consecutive nights', 'Implement social rhythm therapy techniques', 'Limit alcohol'],
      followUpDate: daysFromNow(14),
    },

    /* Arjun */
    {
      patientId: arjun._id, practitionerId: sId,
      title: 'ERP Mid-Treatment Check-In',
      summary: 'Y-BOCS improved 32%. Patient maintaining ERP practice between sessions. Hand washing reduced significantly.',
      recommendations: 'Continue up the hierarchy. Introduce response prevention for mental rituals.',
      actionItems: ['Complete 3 exposure exercises daily', 'Record anxiety SUDS before, peak, and after each exposure', 'No reassurance-seeking from family', 'Review medication response with Dr Patel'],
      followUpDate: daysFromNow(4),
    },

    /* Aisha */
    {
      patientId: aisha._id, practitionerId: sId,
      title: 'Exposure Homework Review',
      summary: 'Patient completing homework exposures independently. Self-efficacy increasing. SPIN dropped 11 points.',
      recommendations: 'Continue dropping safety behaviours systematically. Expose to higher SUDS situations.',
      actionItems: ['Restaurant exposure with a new person this week', 'Drop 2 remaining safety behaviours', 'Attend social event without leaving early', 'Continue Escitalopram as prescribed'],
      followUpDate: daysFromNow(1),
    },

    /* Vikram */
    {
      patientId: vikram._id, practitionerId: jId,
      title: 'Monthly Medication Review Follow-Up',
      summary: 'Clozapine levels therapeutic. CBC normal. Metabolic parameters stable. Patient engaged in day programme.',
      recommendations: 'Continue current regimen. Consider vocational rehabilitation referral.',
      actionItems: ['CBC blood draw in 2 weeks', 'Weigh weekly and record', 'Attend day programme minimum 3x/week', 'Call clinic if voices become distressing or commanding'],
      followUpDate: daysFromNow(5),
    },
  ]);
  console.log('✅ Follow-up notes created');

  /* ══════════════════════════════════════════
     TREATMENT PLANS
  ══════════════════════════════════════════ */
  await TreatmentPlan.insertMany([
    /* Maya — CBT for MDD + GAD */
    {
      patientId: maya._id, practitionerId: sId,
      title: 'CBT for Major Depression and Generalised Anxiety',
      startDate: daysAgo(60), endDate: daysFromNow(60),
      status: 'active',
      goals: [
        { goal: 'Reduce PHQ-9 score from 19 to below 10', status: 'in-progress' },
        { goal: 'Reduce GAD-7 score from 18 to below 8', status: 'in-progress' },
        { goal: 'Re-engage in 3 meaningful social activities per week', status: 'in-progress' },
        { goal: 'Establish regular sleep routine (10pm–6am)', status: 'achieved' },
        { goal: 'Complete exposure hierarchy (8 situations)', status: 'pending' },
      ],
      interventions: ['Weekly CBT sessions (16 sessions total)', 'Thought records and cognitive restructuring', 'Behavioural activation scheduling', 'Graded exposure therapy (social situations)', 'Sleep hygiene psychoeducation', 'Pharmacotherapy: Sertraline 100mg + Buspirone'],
      notes: 'Good progress. Mid-treatment review at session 8 showed 45% symptom reduction.',
    },

    /* Rahul — EMDR for PTSD */
    {
      patientId: rahul._id, practitionerId: sId,
      title: 'EMDR Trauma Processing Protocol',
      startDate: daysAgo(90), endDate: daysAgo(10),
      status: 'completed',
      goals: [
        { goal: 'Reduce PCL-5 score below diagnostic threshold (33)', status: 'achieved' },
        { goal: 'Process primary trauma memory to SUDS <2', status: 'achieved' },
        { goal: 'Return to driving independently', status: 'achieved' },
        { goal: 'Reduce nightmares to <1/week', status: 'achieved' },
        { goal: 'Return to work', status: 'achieved' },
      ],
      interventions: ['EMDR desensitisation and reprocessing (8 sessions)', 'Pharmacotherapy: Prazosin + Paroxetine', 'Psychoeducation on trauma and PTSD', 'Grounding and stabilisation techniques', 'Graduated driving exposure programme'],
      notes: 'Treatment highly successful. PCL-5 at discharge: 28. Monthly maintenance planned.',
    },

    /* Priya — Bipolar management */
    {
      patientId: priya._id, practitionerId: jId,
      title: 'Bipolar Disorder Maintenance & Relapse Prevention',
      startDate: daysAgo(45), endDate: daysFromNow(180),
      status: 'active',
      goals: [
        { goal: 'Maintain euthymic mood for 6 consecutive months', status: 'in-progress' },
        { goal: 'Establish consistent sleep-wake schedule', status: 'achieved' },
        { goal: 'Complete mood charting daily for 3 months', status: 'in-progress' },
        { goal: 'Identify all personal relapse warning signs', status: 'achieved' },
        { goal: 'Build social rhythm therapy skills', status: 'pending' },
      ],
      interventions: ['Fortnightly mood monitoring sessions', 'Pharmacotherapy: Lamotrigine 100mg', 'Psychoeducation (patient and carer)', 'Mood charting and early warning sign identification', 'Interpersonal and Social Rhythm Therapy (IPSRT)', 'Sleep regularity protocol'],
      notes: 'Currently in longest stable period in 3 years. Good medication adherence.',
    },

    /* Arjun — ERP for OCD */
    {
      patientId: arjun._id, practitionerId: sId,
      title: 'Exposure and Response Prevention for OCD',
      startDate: daysAgo(55), endDate: daysFromNow(30),
      status: 'active',
      goals: [
        { goal: 'Reduce Y-BOCS from 28 to below 16', status: 'in-progress' },
        { goal: 'Reduce hand washing to <5 times daily', status: 'in-progress' },
        { goal: 'Eliminate lock and gas checking compulsion', status: 'pending' },
        { goal: 'Complete full ERP hierarchy (10 items)', status: 'in-progress' },
        { goal: 'Engage in social situations without protective gloves', status: 'achieved' },
      ],
      interventions: ['Weekly ERP sessions (20 sessions planned)', 'Daily home ERP practice', 'Pharmacotherapy: Fluvoxamine 150mg', 'Family involvement — carer guidance on accommodation', 'Mental ritual response prevention', 'Cognitive restructuring for OCD beliefs'],
      notes: 'Excellent adherence to home ERP practice. Y-BOCS reduced by 32% at midpoint.',
    },

    /* Vikram — Schizophrenia maintenance */
    {
      patientId: vikram._id, practitionerId: jId,
      title: 'Schizophrenia Maintenance Care Plan',
      startDate: daysAgo(365), endDate: daysFromNow(365),
      status: 'active',
      goals: [
        { goal: 'Maintain PANSS total below 60', status: 'achieved' },
        { goal: 'Attend day programme minimum 3 days/week', status: 'in-progress' },
        { goal: 'Complete vocational rehabilitation assessment', status: 'pending' },
        { goal: 'Maintain WBC within normal range on clozapine', status: 'achieved' },
        { goal: 'Achieve metabolic risk reduction (weight, glucose)', status: 'in-progress' },
      ],
      interventions: ['Monthly psychiatric review', 'Pharmacotherapy: Clozapine 200mg (treatment-resistant)', 'Metabolic monitoring protocol', 'Day programme attendance', 'Carer support and psychoeducation', 'Vocational rehabilitation referral'],
      notes: 'Stable on current regimen for 18 months. Longest period without hospitalisation.',
    },

    /* Aisha — CBT for Social Anxiety */
    {
      patientId: aisha._id, practitionerId: sId,
      title: 'CBT for Social Anxiety Disorder and Panic',
      startDate: daysAgo(40), endDate: daysFromNow(50),
      status: 'active',
      goals: [
        { goal: 'Reduce SPIN from 42 to below 20', status: 'in-progress' },
        { goal: 'Eliminate all 7 identified safety behaviours', status: 'in-progress' },
        { goal: 'Attend and complete a social event without leaving early', status: 'in-progress' },
        { goal: 'Reduce panic attack frequency to zero', status: 'pending' },
        { goal: 'Deliver a short presentation at work', status: 'pending' },
      ],
      interventions: ['Weekly CBT sessions (16 planned)', 'Graded exposure to feared social situations', 'Safety behaviour elimination protocol', 'Video feedback to challenge appearance-related beliefs', 'Pharmacotherapy: Escitalopram 10mg', 'Panic management: breathing and interoceptive exposure'],
      notes: 'Strong therapeutic alliance. Patient highly motivated. SPIN already down 26% from baseline.',
    },
  ]);
  console.log('✅ Treatment plans created');

  /* ══════════════════════════════════════════
     DOCUMENTS
  ══════════════════════════════════════════ */
  await MedicalDocument.insertMany([
    {
      type: 'initial-evaluation', date: daysAgo(60), doctor: sId, patient: maya._id,
      status: 'signed', signedAt: daysAgo(59),
      content: {
        presentingProblems: 'Persistent low mood, anhedonia, insomnia, and generalised worry for 4 months.',
        mentalStatusExam: 'Alert and oriented. Depressed affect. Tearful at times. No psychosis. Denies active SI.',
        diagnosis: 'Major Depressive Disorder, Moderate (F32.1); Generalised Anxiety Disorder (F41.1)',
        treatmentPlan: 'CBT x 16 sessions + pharmacotherapy referral to Dr Patel.',
        riskAssessment: 'Low risk. No SI/HI. Supportive family network.',
      },
    },
    {
      type: 'progress-note-soap', date: daysAgo(7), doctor: sId, patient: maya._id,
      status: 'finalized',
      content: {
        S: 'Patient reports completing exposure to café situation. Anxiety manageable. Sleep improved to 6.5 hours.',
        O: 'Alert, euthymic affect, good eye contact. PHQ-9: 10, GAD-7: 11.',
        A: 'MDD: improving. GAD: partial remission. Exposure therapy progressing well.',
        P: 'Continue CBT. Proceed to SUDS-5 exposure next session. Review medication with Dr Patel.',
      },
    },
    {
      type: 'initial-evaluation', date: daysAgo(90), doctor: sId, patient: rahul._id,
      status: 'signed', signedAt: daysAgo(89),
      content: {
        presentingProblems: 'Flashbacks, nightmares, hypervigilance, and avoidance following road traffic accident 18 months ago.',
        mentalStatusExam: 'Alert. Anxious affect. Hyperstartle observed. Thought process logical. No psychosis.',
        diagnosis: 'Post-Traumatic Stress Disorder (F43.1)',
        treatmentPlan: 'EMDR x 8 sessions. Medication consult for nightmares.',
        riskAssessment: 'Moderate risk (passive SI mentioned, no plan or intent). Safety plan in place.',
      },
    },
    {
      type: 'medication-review', date: daysAgo(3), doctor: jId, patient: priya._id,
      status: 'finalized',
      content: {
        currentMedications: 'Lamotrigine 100mg OD, Quetiapine 25mg PRN',
        response: 'Good response. YMRS: 2, PHQ-9: 5. Euthymic for 6 weeks.',
        sideEffects: 'None reported. No rash.',
        plan: 'Maintain Lamotrigine 100mg. Continue PRN Quetiapine. Review in 6 weeks.',
      },
    },
    {
      type: 'psych-testing-report', date: daysAgo(54), doctor: sId, patient: arjun._id,
      status: 'signed', signedAt: daysAgo(53),
      content: {
        testsAdministered: "Yale-Brown Obsessive Compulsive Scale (Y-BOCS), Beck Anxiety Inventory (BAI)",
        scores: { 'Y-BOCS Total': 28, 'Y-BOCS Obsessions': 14, 'Y-BOCS Compulsions': 14, 'BAI': 32 },
        interpretation: 'Y-BOCS 28 indicates moderate-severe OCD. BAI indicates severe anxiety.',
        recommendations: 'ERP therapy (first-line). Pharmacotherapy: SSRI at OCD doses.',
      },
    },
    {
      type: 'individual-therapy', date: daysAgo(1), doctor: sId, patient: aisha._id,
      status: 'finalized',
      content: {
        sessionFocus: 'Review of restaurant exposure and social event attendance.',
        techniquesUsed: 'Exposure review, cognitive restructuring, safety behaviour elimination',
        progress: 'SPIN: 31. Significant reduction in safety behaviours. Self-efficacy improved.',
        homework: 'Restaurant with new person. Drop 2 remaining safety behaviours.',
      },
    },
  ]);
  console.log('✅ Documents created');

  /* ══════════════════════════════════════════
     CONVERSATIONS + MESSAGES
  ══════════════════════════════════════════ */
  const conversationPairs: { patient: typeof maya; practitioner: typeof sarah; msgs: { senderRole: 'patient'|'practitioner'; text: string }[] }[] = [
    {
      patient: maya, practitioner: sarah,
      msgs: [
        { senderRole: 'practitioner', text: 'Hi Maya, just a quick note to check in after our session yesterday. How are you feeling today?' },
        { senderRole: 'patient', text: 'Hi Dr Mitchell! I actually feel a bit lighter. Completed the café exposure this morning like we discussed.' },
        { senderRole: 'practitioner', text: 'That\'s wonderful to hear! How was your anxiety during it?' },
        { senderRole: 'patient', text: 'It peaked around 6 out of 10 but then came down to about 2. I stayed for 25 minutes.' },
        { senderRole: 'practitioner', text: 'You should be really proud of yourself. That\'s exactly how exposure works. See you next Thursday!' },
        { senderRole: 'patient', text: 'Thank you so much. This is the first time in months I\'ve felt like things are actually changing.' },
      ],
    },
    {
      patient: rahul, practitioner: sarah,
      msgs: [
        { senderRole: 'patient', text: 'Hello Dr Mitchell, I drove to the supermarket today on my own.' },
        { senderRole: 'practitioner', text: 'Rahul! That is a huge milestone. How did it go?' },
        { senderRole: 'patient', text: 'Hands were shaking a little but I did it. Used the grounding technique at a red light and it really helped.' },
        { senderRole: 'practitioner', text: 'I\'m so proud of you. This is what all the hard work in EMDR was building toward. How are the nightmares?' },
        { senderRole: 'patient', text: 'Down to maybe once or twice a week now. The Prazosin is helping.' },
        { senderRole: 'practitioner', text: 'That\'s excellent progress. See you for our maintenance session in a few weeks.' },
      ],
    },
    {
      patient: priya, practitioner: james,
      msgs: [
        { senderRole: 'practitioner', text: 'Hi Priya, just checking — have you been able to maintain your sleep routine this week?' },
        { senderRole: 'patient', text: 'Yes! In bed by 10:30 every night. Mood chart looks stable, mostly 5-6/10.' },
        { senderRole: 'practitioner', text: 'That\'s great. No signs of hypomanic symptoms? Racing thoughts, reduced sleep need, increased energy?' },
        { senderRole: 'patient', text: 'None of those. Feeling genuinely balanced for once.' },
        { senderRole: 'practitioner', text: 'Keep filling in the mood chart. I\'ll review it at our next appointment. Well done on the consistency.' },
      ],
    },
    {
      patient: arjun, practitioner: sarah,
      msgs: [
        { senderRole: 'patient', text: 'Dr Mitchell, I didn\'t wash my hands after touching the door handle at work today. First time ever.' },
        { senderRole: 'practitioner', text: 'Arjun, that\'s incredible! How long did you manage before the urge passed?' },
        { senderRole: 'patient', text: 'About 15 minutes of really strong urge, then it just... faded. I kept reminding myself the anxiety would pass.' },
        { senderRole: 'practitioner', text: 'You are applying everything we\'ve worked on so well. The anxiety does pass — and you\'ve now proved it to yourself.' },
        { senderRole: 'patient', text: 'I didn\'t believe it would work when we started. Thank you.' },
        { senderRole: 'practitioner', text: 'You did the hard work. See you Thursday for our next session.' },
      ],
    },
    {
      patient: aisha, practitioner: sarah,
      msgs: [
        { senderRole: 'patient', text: 'I went to my colleague\'s birthday dinner last night. I almost cancelled but I didn\'t.' },
        { senderRole: 'practitioner', text: 'Aisha! Tell me everything. How long did you stay?' },
        { senderRole: 'patient', text: 'Two and a half hours! I was anxious at first but after about 20 minutes it actually got easier.' },
        { senderRole: 'practitioner', text: 'That is a breakthrough moment. And you did it without leaving early — just like we planned.' },
        { senderRole: 'patient', text: 'I even made conversation with someone I hadn\'t met before. My heart was racing but I did it.' },
        { senderRole: 'practitioner', text: 'I want you to write this down in your diary tonight — exactly what you did and how it turned out. This is evidence against your predictions.' },
      ],
    },
    {
      patient: vikram, practitioner: james,
      msgs: [
        { senderRole: 'practitioner', text: 'Hi Vikram, reminder that your blood draw for clozapine monitoring is due this week. Have you been able to book it?' },
        { senderRole: 'patient', text: 'Yes, booked for Thursday morning at the path lab.' },
        { senderRole: 'practitioner', text: 'Perfect. How have you been feeling this week? Any changes in the voices?' },
        { senderRole: 'patient', text: 'Same as usual. Background noise, not saying anything bad. I can ignore them most of the time.' },
        { senderRole: 'practitioner', text: 'That\'s a great sign of your progress. Make sure to eat before the blood draw. See you soon.' },
      ],
    },
    {
      patient: dev, practitioner: sarah,
      msgs: [
        { senderRole: 'practitioner', text: 'Hi Dev, how did the worry postponement exercise go this week?' },
        { senderRole: 'patient', text: 'Actually worked better than I expected. I wrote down my worries and saved them for the "worry window" at 6pm.' },
        { senderRole: 'practitioner', text: 'And when 6pm arrived, did the worries feel as urgent?' },
        { senderRole: 'patient', text: 'Most of them felt silly by then honestly. A few still felt real but they didn\'t spiral the way they used to.' },
        { senderRole: 'practitioner', text: 'That\'s the key insight — worries feel more catastrophic in the moment. Great work. See you next week!' },
      ],
    },
  ];

  for (const pair of conversationPairs) {
    const conv = await Conversation.create({
      patientId: pair.patient._id.toString(),
      practitionerId: pair.practitioner!._id.toString(),
      unreadForPatient: 0,
      unreadForPractitioner: 0,
    });

    const convId = conv._id.toString();
    await Message.insertMany(
      pair.msgs.map((m) => ({
        conversationId: convId,
        senderId: m.senderRole === 'patient' ? pair.patient._id.toString() : pair.practitioner!._id.toString(),
        text: m.text,
        status: 'seen',
      })),
    );
  }
  console.log(`✅ ${conversationPairs.length} conversations + messages created`);

  /* ══════════════════════════════════════════
     SUMMARY
  ══════════════════════════════════════════ */
  console.log('\n📋 Seed complete!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('👩‍⚕️  PRACTITIONER (single)');
  console.log('   dr.sarah@betteryou.com   — Clinical Psychology');
  console.log('');
  console.log('🧑  PATIENTS (8)');
  console.log('   maya.sharma@gmail.com    — MDD + GAD');
  console.log('   rahul.mehta@outlook.com  — PTSD');
  console.log('   priya.nair@gmail.com     — Bipolar I');
  console.log('   arjun.kapoor@yahoo.com   — OCD');
  console.log('   neha.singh@gmail.com     — Anorexia + Depression');
  console.log('   vikram.joshi@rediffmail.com — Schizophrenia');
  console.log('   aisha.khan@gmail.com     — Social Anxiety + Panic');
  console.log('   dev.patient@betteryou.com — GAD (demo patient)');
  console.log('');
  console.log('   🔑  Password (all accounts): Admin@123');
  console.log('');
  console.log('📊 Data seeded:');
  console.log('   30  Appointments  (past, upcoming, no-show, cancelled)');
  console.log('   8   Prescriptions (active + historical)');
  console.log('   23  Progress Notes (4-5 per patient)');
  console.log('   7   Follow-Up Notes');
  console.log('   6   Treatment Plans (active + completed)');
  console.log('   6   Clinical Documents');
  console.log('   7   Conversations + 37 Messages');
  console.log('═══════════════════════════════════════════════════════');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
