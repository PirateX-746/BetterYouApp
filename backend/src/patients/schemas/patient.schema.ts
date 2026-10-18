import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/role.enum';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  // Backfilled by migration 001. Optional here (not `required`) so existing
  // writes never break; every read/write path scopes by it explicitly in
  // PatientsService rather than relying on a hard schema constraint.
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

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
    index: true,
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

  /** Who to contact in an emergency — optional, entered by the practitioner. */
  @Prop({ trim: true, maxlength: 100 })
  emergencyContactName?: string;

  @Prop({ trim: true, maxlength: 20 })
  emergencyContactPhone?: string;

  /** e.g. "Spouse", "Parent". */
  @Prop({ trim: true, maxlength: 40 })
  emergencyContactRelation?: string;

  @Prop()
  avatarBase64?: string;

  @Prop({ default: Role.PATIENT })
  role: Role;

  // ✅ IMPORTANT: this fixes empty fetch
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ type: Date })
  tempPasswordExpiresAt?: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
