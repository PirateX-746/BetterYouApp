import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/role.enum';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    required: true,
    unique: true,
    index: true
  })
  mrn: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    unique: true,
    sparse: true,
    minlength: 10,
    maxlength: 15,
  })
  phoneNo?: string;

  @Prop({ required: true })
  gender: string;

  @Prop({ required: true })
  bloodGroup: string;

  @Prop({ type: Date })
  lastVisit?: Date;

  @Prop()
  healthCondition?: string;

  @Prop()
  allergies?: string;

  @Prop({ default: Role.PATIENT })
  role: Role;

  // ✅ IMPORTANT: this fixes empty fetch
  @Prop({ default: true })
  isActive: boolean;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
