import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

const GoalSchema = {
  goal: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'achieved'], default: 'pending' },
};

@Schema({ timestamps: true })
export class TreatmentPlan extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Practitioner', required: true })
  practitionerId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ type: [GoalSchema], default: [] })
  goals: { goal: string; status: 'pending' | 'in-progress' | 'achieved' }[];

  @Prop({ type: [String], default: [] })
  interventions: string[];

  @Prop({ enum: ['active', 'completed', 'paused'], default: 'active' })
  status: string;

  @Prop()
  notes?: string;
}

export const TreatmentPlanSchema = SchemaFactory.createForClass(TreatmentPlan);
