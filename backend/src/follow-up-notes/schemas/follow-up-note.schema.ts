import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class FollowUpNote extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Practitioner', required: true })
  practitionerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment' })
  appointmentId?: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  summary?: string;

  @Prop()
  recommendations?: string;

  @Prop({ type: [String], default: [] })
  actionItems: string[];

  @Prop()
  followUpDate?: Date;
}

export const FollowUpNoteSchema = SchemaFactory.createForClass(FollowUpNote);
