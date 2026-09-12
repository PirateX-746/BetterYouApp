import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DEFAULT_PLANS,
  Plan,
  PlanDocument,
  PlanKey,
} from './schemas/plan.schema';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscription.schema';

const TRIAL_DAYS = 30;

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  /** Seeds the plan catalogue once so the console is never empty. */
  async onModuleInit() {
    const count = await this.planModel.countDocuments();
    if (count > 0) return;

    await this.planModel.insertMany(DEFAULT_PLANS);
    this.logger.log(`Seeded ${DEFAULT_PLANS.length} plans`);
  }

  listPlans() {
    return this.planModel.find().sort({ sortOrder: 1 }).lean().exec();
  }

  async planFor(key: PlanKey): Promise<PlanDocument> {
    const plan = await this.planModel.findOne({ key }).exec();
    if (!plan) throw new BadRequestException(`Unknown plan "${key}"`);
    return plan;
  }

  listAll() {
    return this.subscriptionModel.find().lean().exec();
  }

  forPractice(practiceId: string) {
    return this.subscriptionModel
      .findOne({ practiceId: new Types.ObjectId(practiceId) })
      .lean()
      .exec();
  }

  /**
   * Creates the subscription a newly onboarded practice starts on.
   * Idempotent — a practice has at most one subscription.
   */
  async startTrial(practiceId: string, plan: PlanKey = PlanKey.TRIAL) {
    const existing = await this.forPractice(practiceId);
    if (existing) return existing;

    const planDoc = await this.planFor(plan);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return this.subscriptionModel.create({
      practiceId: new Types.ObjectId(practiceId),
      plan,
      status: SubscriptionStatus.TRIALING,
      monthlyPrice: planDoc.monthlyPrice,
      startedAt: new Date(),
      trialEndsAt,
      renewsAt: null,
    });
  }

  async changePlan(practiceId: string, plan: PlanKey) {
    const planDoc = await this.planFor(plan);

    const renewsAt = new Date();
    renewsAt.setMonth(renewsAt.getMonth() + 1);

    const updated = await this.subscriptionModel
      .findOneAndUpdate(
        { practiceId: new Types.ObjectId(practiceId) },
        {
          plan,
          monthlyPrice: planDoc.monthlyPrice,
          status:
            planDoc.monthlyPrice > 0
              ? SubscriptionStatus.ACTIVE
              : SubscriptionStatus.TRIALING,
          renewsAt: planDoc.monthlyPrice > 0 ? renewsAt : null,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Subscription not found');
    return updated;
  }

  async setStatus(practiceId: string, status: SubscriptionStatus) {
    const updated = await this.subscriptionModel
      .findOneAndUpdate(
        { practiceId: new Types.ObjectId(practiceId) },
        { status },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Subscription not found');
    return updated;
  }

  /** Monthly recurring revenue from subscriptions that are actually billing. */
  async mrr(): Promise<number> {
    const rows = await this.subscriptionModel.aggregate<{ total: number }>([
      { $match: { status: SubscriptionStatus.ACTIVE } },
      { $group: { _id: null, total: { $sum: '$monthlyPrice' } } },
    ]);
    return rows[0]?.total ?? 0;
  }

  /**
   * Whether a practice may add another practitioner / patient under its
   * plan. Centralised so limit checks are not scattered through the app.
   */
  async withinLimits(
    practiceId: string,
    current: { practitioners: number; patients: number },
  ): Promise<{ ok: boolean; reason?: string }> {
    const sub = await this.forPractice(practiceId);
    if (!sub) return { ok: true };

    const plan = await this.planFor(sub.plan);

    if (
      plan.maxPractitioners !== null &&
      current.practitioners > plan.maxPractitioners
    ) {
      return {
        ok: false,
        reason: `Plan "${plan.name}" allows ${plan.maxPractitioners} practitioners`,
      };
    }

    if (plan.maxPatients !== null && current.patients > plan.maxPatients) {
      return {
        ok: false,
        reason: `Plan "${plan.name}" allows ${plan.maxPatients} patients`,
      };
    }

    return { ok: true };
  }
}
