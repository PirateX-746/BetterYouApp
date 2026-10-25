import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Fixed vocabulary for the legacy "Quick Observations" chips. Kept so
 * assessments saved by the original dialog still validate and render.
 */
export const QUICK_OBSERVATION_TAGS = [
  'Calm',
  'Anxious',
  'Engaged',
  'Withdrawn',
  'Cooperative',
  'Distracted',
  'Positive',
  'Low Mood',
  'Improved',
  'Needs Follow-up',
] as const;
export type QuickObservationTag = (typeof QUICK_OBSERVATION_TAGS)[number];

/**
 * Lifecycle, enforced in SessionAssessmentsService:
 *   draft ⇄ ready_for_review → submitted → amended (→ amended …)
 * "Not started" is simply the absence of a record. A submitted assessment
 * never goes back to draft; corrections are amendments with history.
 */
export enum AssessmentStatus {
  DRAFT = 'draft',
  READY_FOR_REVIEW = 'ready_for_review',
  SUBMITTED = 'submitted',
  AMENDED = 'amended',
}

/** How an item was answered. Missing or unobserved is never treated as 0. */
export type ResponseState =
  | 'scored'
  | 'not_observed'
  | 'not_applicable'
  | 'blank';

export class AssessmentResponse {
  itemId: string;
  state: ResponseState;
  score?: number | null;
  /** Free text for `text` items (e.g. follow-up points). */
  text?: string;
  /** Optional short observation note on any item. */
  note?: string;
}

export class AssessmentSummary {
  text: string;
  /** "template" today; "ai" once a provider is configured. */
  generatedBy: 'template' | 'ai';
  generatedAt: Date;
  /** The practitioner changed the generated text. */
  edited: boolean;
  approved: boolean;
  approvedAt?: Date;
}

export class AssessmentAmendment {
  version: number;
  at: Date;
  by: Types.ObjectId;
  reason: string;
  /** What the record held before this amendment. */
  previous: {
    responses: AssessmentResponse[];
    notes?: string;
    summary?: AssessmentSummary | null;
  };
}

/**
 * A practitioner's observations of one appointment — one per appointment
 * (unique index). Written only by that appointment's practitioner; read
 * across the practice once submitted.
 *
 * Two shapes live here:
 *  - format "v2" (the assessment workspace): template-driven `responses`,
 *    drafts with optimistic locking, summary, submission into a patient
 *    document, amendments with history.
 *  - legacy (no `format`): the original fixed 10-score dialog. Read-only now.
 */
@Schema({ timestamps: true })
export class SessionAssessment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Appointment',
    required: true,
    unique: true,
  })
  appointmentId: Types.ObjectId;

  // Derived server-side from the appointment — never trusted from the client.
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Practitioner',
    required: true,
    index: true,
  })
  practitionerId: Types.ObjectId;

  /* ───── v2 (workspace) ───── */

  @Prop()
  format?: 'v2';

  @Prop()
  templateKey?: string;

  @Prop()
  templateVersion?: number;

  @Prop({
    type: String,
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
    index: true,
  })
  status: AssessmentStatus;

  /** Optimistic-lock counter: every accepted write must quote the current value. */
  @Prop({ default: 1 })
  revision: number;

  @Prop({
    type: [
      {
        _id: false,
        itemId: { type: String, required: true },
        state: {
          type: String,
          enum: ['scored', 'not_observed', 'not_applicable', 'blank'],
          required: true,
        },
        score: { type: Number, min: 0, max: 10, default: null },
        text: { type: String, maxlength: 2000 },
        note: { type: String, maxlength: 500 },
      },
    ],
    default: [],
  })
  responses: AssessmentResponse[];

  @Prop({ maxlength: 5000 })
  notes?: string;

  @Prop({ type: Object, default: null })
  summary?: AssessmentSummary | null;

  @Prop({ type: Types.ObjectId, ref: 'MedicalDocument' })
  documentId?: Types.ObjectId;

  @Prop({ type: Date })
  submittedAt?: Date;

  @Prop({ type: Date })
  lastSavedAt?: Date;

  @Prop({ type: Array, default: [] })
  amendments: AssessmentAmendment[];

  /* ───── legacy (original dialog) — optional now, kept for old records ───── */

  @Prop({ min: 0, max: 10 }) overallBehaviour?: number;
  @Prop({ min: 0, max: 10 }) anxiety?: number;
  @Prop({ min: 0, max: 10 }) mood?: number;
  @Prop({ min: 0, max: 10 }) engagement?: number;
  @Prop({ min: 0, max: 10 }) communication?: number;
  @Prop({ min: 0, max: 10 }) cooperation?: number;
  @Prop({ min: 0, max: 10 }) emotionalRegulation?: number;
  @Prop({ min: 0, max: 10 }) focus?: number;
  @Prop({ min: 0, max: 10 }) insight?: number;
  @Prop({ min: 0, max: 10 }) progress?: number;
  @Prop({ type: [String], default: undefined }) observations?: string[];
  @Prop({ maxlength: 1000 }) feedback?: string;
  @Prop() followUpRequired?: boolean;
  @Prop({ maxlength: 300 }) followUpReason?: string;
}

export const SessionAssessmentSchema =
  SchemaFactory.createForClass(SessionAssessment);
SessionAssessmentSchema.index({ appointmentId: 1 }, { unique: true });
SessionAssessmentSchema.index({ patientId: 1, createdAt: -1 });
