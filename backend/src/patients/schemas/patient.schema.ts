import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/role.enum';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  // Backfilled by migration 001. Optional here (not `required`) so existing
  // writes never break; every read/write path scopes by it explicitly in
  // PatientsService rather than relying on a hard schema constraint.
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  /**
   * Optional. Unique only when present — see the partial index below (a
   * plain unique index would let just one patient have no email).
   */
  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  mrn: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    unique: true,
    sparse: true,
    // E.164 ("+919876543210", up to 16 chars); older records hold bare
    // 10-digit Indian numbers.
    minlength: 7,
    maxlength: 16,
  })
  phoneNo?: string;

  @Prop({ required: true })
  gender: string;

  /** Optional — not every patient knows it. */
  @Prop()
  bloodGroup?: string;

  @Prop({ type: Date })
  lastVisit?: Date;

  @Prop()
  healthCondition?: string;

  @Prop()
  allergies?: string;

  /** Who to contact in an emergency — optional, entered by the practitioner. */
  @Prop({ trim: true, maxlength: 100 })
  emergencyContactName?: string;

  @Prop({ trim: true, maxlength: 20 })
  emergencyContactPhone?: string;

  /** e.g. "Spouse", "Parent". */
  @Prop({ trim: true, maxlength: 40 })
  emergencyContactRelation?: string;

  @Prop()
  avatarBase64?: string;

  @Prop({ default: Role.PATIENT })
  role: Role;

  // ✅ IMPORTANT: this fixes empty fetch
  @Prop({ default: true })
  isActive: boolean;

  /** Appointment confirmations and reminders by email. Patients can opt out. */
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ type: Date })
  tempPasswordExpiresAt?: Date;

  /**
   * A pending self-service reset (forgot password). Kept apart from
   * `password` so a reset request can't lock anyone out: the current
   * password keeps working until this one is actually used. Never selected
   * by default — only the login flow reads it.
   */
  @Prop({ select: false })
  resetPasswordHash?: string;

  @Prop({ type: Date, select: false })
  resetPasswordExpiresAt?: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

/** Email unique when present; any number of patients may have none. */
export const PATIENT_EMAIL_INDEX = 'email_unique_when_present';
PatientSchema.index(
  { email: 1 },
  {
    unique: true,
    name: PATIENT_EMAIL_INDEX,
    partialFilterExpression: { email: { $type: 'string' } },
  },
);
