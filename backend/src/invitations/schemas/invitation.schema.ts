import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../common/role.enum';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

/**
 * A pending invitation to join a practice.
 *
 * Only a SHA-256 hash of the token is stored — the raw token is returned
 * once, at creation, and never again. A leaked database therefore cannot be
 * used to accept invitations, exactly as with a password.
 *
 * No email is sent: the platform has no mail provider wired up. The console
 * shows the link once so it can be delivered out of band. When a provider
 * is added, send it from here and stop returning it to the caller.
 */
@Schema({ timestamps: true, collection: 'invitations' })
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'Practice', required: true, index: true })
  practiceId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: Object.values(Role), required: true })
  role: Role;

  /** SHA-256 of the raw token. The raw value is never persisted. */
  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.PENDING,
    index: true,
  })
  status: InvitationStatus;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  invitedBy: Types.ObjectId | null;
}

export type InvitationDocument = HydratedDocument<Invitation>;
export const InvitationSchema = SchemaFactory.createForClass(Invitation);

InvitationSchema.index({ practiceId: 1, email: 1, status: 1 });
