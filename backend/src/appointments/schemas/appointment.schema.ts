import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  CANCELLED = 'cancelled',
}

/** Statuses a patient is still expected to turn up for (reminders, cancellation notices). */
export const LIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];

/**
 * Patients can cancel online until this many hours before the start; after
 * that they have to contact the practice. Quoted in the reminder email.
 */
export const PATIENT_CANCEL_CUTOFF_HOURS = 4;

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  // Backfilled by migration 001; scoped explicitly in AppointmentsService.
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  /** Copied from the appointment type when one is chosen, so history survives renames. */
  @Prop({ required: true })
  title: string;

  // Optional: appointments booked before types existed have only a title.
  @Prop({ type: Types.ObjectId, ref: 'AppointmentType' })
  appointmentTypeId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Patient' })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Practitioner' })
  practitionerId: Types.ObjectId;

  @Prop({ required: true })
  start: Date;

  @Prop({ required: true })
  end: Date;

  @Prop({
    type: String,
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Prop()
  notes?: string;

  @Prop({ type: Date })
  checkedInAt?: Date;

  /**
   * When the current time was booked: creation, or the last reschedule.
   * Reminders whose window had already opened by then are skipped, since the
   * patient just got a confirmation. Older appointments fall back to createdAt.
   */
  @Prop({ type: Date })
  bookedAt?: Date;

  /** Reminder emails handled for the current time (see reminders.ts). Reset on reschedule. */
  @Prop({ type: [String], default: [] })
  remindersSent: string[];

  createdAt?: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// The reminder job's scan: live appointments starting in the next 24h.
AppointmentSchema.index({ status: 1, start: 1 });
