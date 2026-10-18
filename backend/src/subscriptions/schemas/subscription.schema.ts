import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PlanKey } from './plan.schema';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
}

/**
 * One practice's current subscription.
 *
 * Not tenant-scoped by the plugin: the platform console reads these across
 * practices, and a practice never queries its own billing through the
 * tenant-scoped path.
 *
 * No payment provider is assumed. `externalCustomerId` /
 * `externalSubscriptionId` are deliberately provider-agnostic so Stripe,
 * Razorpay or another processor can be attached later without reshaping
 * these records.
 */
@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Practice', required: true, unique: true })
  practiceId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(PlanKey), required: true })
  plan: PlanKey;

  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.TRIALING,
    index: true,
  })
  status: SubscriptionStatus;

  @Prop({ required: true, default: 0 })
  monthlyPrice: number;

  @Prop({ type: Date, default: () => new Date() })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  renewsAt: Date | null;

  @Prop({ type: Date, default: null })
  trialEndsAt: Date | null;

  @Prop({ type: String, default: null })
  externalCustomerId: string | null;

  @Prop({ type: String, default: null })
  externalSubscriptionId: string | null;
}

export type SubscriptionDocument = HydratedDocument<Subscription>;
export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ practiceId: 1 }, { unique: true });
