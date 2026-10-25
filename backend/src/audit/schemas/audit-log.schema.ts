import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../common/role.enum';

/**
 * Record of a consequential action.
 *
 * IMPORTANT — never store clinical content here. An entry names WHAT changed
 * (entity type and id), never the value: "updated progress note pn_8841" is
 * auditable, the note's text, a diagnosis or a medication name is not. An
 * audit trail that duplicates the record it audits doubles the blast radius
 * of any leak. `metadata` is for things like a status transition, not
 * patient data.
 *
 * Deliberately NOT tenant-scoped via the plugin: practiceId is nullable
 * because platform-level actions belong to no practice, and the log must
 * stay writable from platform context.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'auditlogs',
})
export class AuditLog {
  /** Null for platform-level actions (e.g. creating a practice). */
  @Prop({ type: Types.ObjectId, ref: 'Practice', default: null, index: true })
  practiceId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, required: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(Role), required: true })
  actorRole: Role;

  /** Dotted verb, e.g. "practice.suspended", "practitioner.invited". */
  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true })
  entityId: string;

  /** Non-clinical detail only — status transitions, plan changes, counts. */
  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  @Prop() ipAddress?: string;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ practiceId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
