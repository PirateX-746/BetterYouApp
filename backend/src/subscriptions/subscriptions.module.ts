import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { Plan, PlanSchema } from './schemas/plan.schema';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';

/** Global: the admin module and practice onboarding both need it. */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
