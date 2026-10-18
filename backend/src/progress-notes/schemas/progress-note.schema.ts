import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
}

export const ProgressNoteSchema = SchemaFactory.createForClass(ProgressNote);
