import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../common/role.enum';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditInput {
  practiceId?: string | null;
  actorId: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Writes an audit entry.
   *
   * Never throws into the caller: failing to record an audit line must not
   * roll back the action the user actually asked for. A write failure is
   * logged loudly instead.
   *
   * Callers must pass non-clinical metadata only — see the schema comment.
   */
  async record(input: AuditInput): Promise<void> {
    try {
      await this.auditModel.create({
        practiceId: input.practiceId
          ? new Types.ObjectId(input.practiceId)
          : null,
        actorId: new Types.ObjectId(input.actorId),
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? {},
        ipAddress: input.ipAddress,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit entry "${input.action}": ${(err as Error).message}`,
      );
    }
  }

  async listForPractice(practiceId: string, limit = 100) {
    return this.auditModel
      .find({ practiceId: new Types.ObjectId(practiceId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async listPlatform(limit = 100) {
    return this.auditModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
