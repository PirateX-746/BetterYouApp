import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * A session note. Since migration 003 this is the only clinical note type:
 * the former follow-up note became its optional "Follow-up" section
 * (recommendations, action items, follow-up date, linked appointment).
 */
@Schema({ timestamps: true })
export class ProgressNote extends Document {
  // Backfilled by migration 001; scoped explicitly in ProgressNotesService.
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Practitioner', required: true })
  practitionerId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  sessionDate: Date;

  @Prop()
  content?: string;

  @Prop({ min: 1, max: 10 })
  progressScore?: number;

  @Prop()
  mood?: string;

  @Prop({ type: [String], default: [] })
  symptoms: string[];

  @Prop()
  observations?: string;

  @Prop()
  nextSteps?: string;

  /* ---- Follow-up section (merged in from follow-up notes) ---- */

  /** The session this note documents, when it was written from one. */
  @Prop({ type: Types.ObjectId, ref: 'Appointment' })
  appointmentId?: Types.ObjectId;

  @Prop()
  recommendations?: string;

  @Prop({ type: [String], default: [] })
  actionItems: string[];

  /** When the patient should next be seen / checked on. */
  @Prop()
  followUpDate?: Date;

  /** Set by migration 003 on notes copied from a follow-up note; makes the
      migration idempotent. Never set by the API. */
  @Prop({ type: Types.ObjectId, index: true, sparse: true })
  migratedFromFollowUpId?: Types.ObjectId;
}

export const ProgressNoteSchema = SchemaFactory.createForClass(ProgressNote);
