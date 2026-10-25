import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum PlanKey {
  FREE = 'free',
  TRIAL = 'trial',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Platform-wide plan catalogue. Not tenant-owned — every practice picks
 * from the same list.
 *
 * `null` limits mean unlimited. Prices are whole rupees.
 */
@Schema({ timestamps: true, collection: 'plans' })
export class Plan {
  @Prop({
    type: String,
    enum: Object.values(PlanKey),
    required: true,
    unique: true,
  })
  key: PlanKey;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 0 })
  monthlyPrice: number;

  @Prop({ type: Number, default: null })
  maxPractitioners: number | null;

  @Prop({ type: Number, default: null })
  maxPatients: number | null;

  @Prop({ default: 0 })
  sortOrder: number;
}

export type PlanDocument = HydratedDocument<Plan>;
export const PlanSchema = SchemaFactory.createForClass(Plan);

/** Seeded by the subscriptions bootstrap so the catalogue is never empty. */
export const DEFAULT_PLANS: Array<Omit<Plan, never>> = [
  {
    key: PlanKey.FREE,
    name: 'Free',
    monthlyPrice: 0,
    maxPractitioners: 1,
    maxPatients: 100,
    sortOrder: 0,
  },
  {
    key: PlanKey.TRIAL,
    name: 'Trial',
    monthlyPrice: 0,
    maxPractitioners: 3,
    maxPatients: 250,
    sortOrder: 1,
  },
  {
    key: PlanKey.BASIC,
    name: 'Basic',
    monthlyPrice: 2999,
    maxPractitioners: 3,
    maxPatients: 500,
    sortOrder: 2,
  },
  {
    key: PlanKey.PRO,
    name: 'Pro',
    monthlyPrice: 8999,
    maxPractitioners: 10,
    maxPatients: 5000,
    sortOrder: 3,
  },
  {
    key: PlanKey.ENTERPRISE,
    name: 'Enterprise',
    monthlyPrice: 24999,
    maxPractitioners: null,
    maxPatients: null,
    sortOrder: 4,
  },
];
