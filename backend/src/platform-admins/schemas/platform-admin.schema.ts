import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/role.enum';

/**
 * Platform operators — the people who onboard and manage practices.
 *
 * This collection deliberately has NO practiceId field. A platform admin
 * cannot belong to a practice, and no practice-scoped record can reference
 * one: the separation between Super Admin and practice membership is
 * structural rather than a runtime check that could be missed.
 *
 * It is also why platform accounts are not merged into `practitioners`:
 * keeping clinic staff and platform operators in separate collections means
 * a scoping bug cannot conflate them.
 */
@Schema({ timestamps: true, collection: 'platformadmins' })
export class PlatformAdmin {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  /** Fixed. Present so the JWT payload and guards read uniformly. */
  @Prop({ type: String, enum: [Role.SUPER_ADMIN], default: Role.SUPER_ADMIN })
  role: Role;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;
}

export type PlatformAdminDocument = HydratedDocument<PlatformAdmin>;
export const PlatformAdminSchema = SchemaFactory.createForClass(PlatformAdmin);
