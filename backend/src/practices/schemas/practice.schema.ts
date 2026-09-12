import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum PracticeStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

/** Statuses whose users may still sign in and use the app. */
export const USABLE_PRACTICE_STATUSES: readonly PracticeStatus[] = [
  PracticeStatus.TRIAL,
  PracticeStatus.ACTIVE,
];

/**
 * Subdomains that can never belong to a practice, because they are (or may
 * become) platform infrastructure. Rejected at creation time.
 */
export const RESERVED_SUBDOMAINS: readonly string[] = [
  'www', 'api', 'admin', 'app', 'mail', 'static', 'assets',
];

/** Lowercase, 3–30 chars, alphanumeric and hyphens, no leading/trailing hyphen. */
export const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

@Schema({ timestamps: true, collection: 'practices' })
export class Practice {
  @Prop({ required: true, trim: true })
  name: string;

  /**
   * Immutable after creation — changing it breaks every bookmark, saved link
   * and active session a practice has.
   */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  subdomain: string;

  @Prop({
    type: String,
    enum: Object.values(PracticeStatus),
    default: PracticeStatus.TRIAL,
    index: true,
  })
  status: PracticeStatus;

  @Prop() logo?: string;
  @Prop({ lowercase: true, trim: true }) email?: string;
  @Prop({ trim: true }) phone?: string;

  @Prop({ default: 'Asia/Kolkata' })
  timezone: string;

  /** The practitioner who owns this practice (its PRACTICE_ADMIN). */
  @Prop({ type: Types.ObjectId, ref: 'Practitioner' })
  ownerId?: Types.ObjectId;

  /**
   * Soft deletion. Nothing in the platform console hard-deletes a practice —
   * suspension and archival cover the real cases while keeping clinical
   * records recoverable.
   */
  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export type PracticeDocument = HydratedDocument<Practice>;
export const PracticeSchema = SchemaFactory.createForClass(Practice);

// Hot path: resolved on effectively every request.
PracticeSchema.index({ subdomain: 1 }, { unique: true });
