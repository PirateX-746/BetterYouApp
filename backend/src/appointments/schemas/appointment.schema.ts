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
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
