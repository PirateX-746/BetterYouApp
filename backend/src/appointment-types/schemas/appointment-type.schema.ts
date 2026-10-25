import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * A kind of session a practitioner offers (e.g. "CBT Session", 45 min).
 *
 * Personal to one practitioner, like their medication library: each
 * clinician configures their own list. Booking an appointment copies the
 * type's name onto Appointment.title, so renaming or deleting a type never
 * rewrites appointment history.
 */
@Schema({ timestamps: true })
export class AppointmentType extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Practitioner', required: true })
  practitionerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  /** Lower-cased name, so uniqueness per practitioner ignores case. */
  @Prop({ required: true, select: false })
  nameKey: string;

  /** Default length in minutes; the booking form prefills it but may override. */
  @Prop({ required: true, min: 5, max: 480 })
  durationMinutes: number;

  /** "#rrggbb", shown as the event's accent on the calendar. */
  @Prop({ required: true })
  color: string;

  /** Inactive types stay on past appointments but can't be newly booked. */
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const AppointmentTypeSchema =
  SchemaFactory.createForClass(AppointmentType);

AppointmentTypeSchema.index(
  { practitionerId: 1, nameKey: 1 },
  { unique: true },
);
AppointmentTypeSchema.index({ practitionerId: 1, sortOrder: 1 });
