import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Medication extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Practitioner', required: true })
  practitionerId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  category?: string;

  @Prop()
  description?: string;
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);
