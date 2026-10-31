import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from 'src/common/role.enum';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Practitioner extends Document {
  // Backfilled by migration 001; also stamped directly on invite-accept.
  // Scoped explicitly wherever practitioner data is queried.
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  // Not required: an invited practitioner's account is created with just a
  // name/email/password (see InvitationsService.accept) — they fill in the
  // rest of their profile afterward from Settings.
  @Prop()
  dateOfBirth?: Date;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  specialization?: string;

  @Prop()
  experienceYears?: number;

  @Prop()
  avatarBase64?: string;

  @Prop({ type: Object })
  practiceHours?: Record<
    string,
    { isOpen: boolean; openTime: string; closeTime: string }
  >;

  /** Set once the default appointment types were given; see AppointmentTypesService. */
  @Prop({ type: Date })
  appointmentTypesSeededAt?: Date;

  @Prop({ default: Role.PRACTITIONER })
  role: Role;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ type: Date })
  tempPasswordExpiresAt?: Date;

  /**
   * A pending self-service reset (forgot password). Kept apart from
   * `password` so a reset request can't lock anyone out: the current
   * password keeps working until this one is actually used. Never selected
   * by default — only the login flow reads it.
   */
  @Prop({ select: false })
  resetPasswordHash?: string;

  @Prop({ type: Date, select: false })
  resetPasswordExpiresAt?: Date;

  // Read by JwtStrategy and the admin console. Was missing from the schema,
  // so strict mode dropped it on create; only seeded records carried it.
  @Prop({ default: true })
  isActive: boolean;

  // Maintained by `timestamps: true`.
  createdAt?: Date;
  updatedAt?: Date;
}

export const PractitionerSchema = SchemaFactory.createForClass(Practitioner);
