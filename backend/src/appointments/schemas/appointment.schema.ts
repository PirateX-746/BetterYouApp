import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ✅ ADD THIS ENUM
export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Patient' })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Practitioner' })
  practitionerId: Types.ObjectId;

  @Prop({ required: true })
  start: Date;

  @Prop({ required: true })
  end: Date;

  // ✅ USE ENUM IN SCHEMA
  @Prop({
    type: String,
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Prop()
  notes?: string;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
