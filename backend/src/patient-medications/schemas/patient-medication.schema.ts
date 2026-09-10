import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PatientMedication extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Practitioner', required: true })
  practitionerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Medication', required: true })
  medicationId: Types.ObjectId;

  @Prop({ required: true })
  dosage: string;

  @Prop({ required: true })
  frequency: string;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop()
  diagnosis?: string;

  @Prop()
  notes?: string;

  @Prop({ enum: ['active', 'discontinued', 'completed'], default: 'active' })
  status: string;
}

export const PatientMedicationSchema =
  SchemaFactory.createForClass(PatientMedication);
