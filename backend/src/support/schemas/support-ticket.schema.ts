import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TicketCategory {
  TECHNICAL = 'technical',
  ACCOUNT = 'account',
  BILLING = 'billing',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * A practitioner's request to the platform team. Requester and practice
 * names are snapshotted at creation so the console can list and search
 * tickets without joining across collections.
 */
@Schema({ timestamps: true })
export class SupportTicket extends Document {
  /** Human-facing number, e.g. SUP-1042. */
  @Prop({ required: true, unique: true })
  ticketNo: string;

  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Practitioner',
    required: true,
    index: true,
  })
  requesterId: Types.ObjectId;

  @Prop({ required: true })
  requesterName: string;

  @Prop({ required: true })
  requesterEmail: string;

  @Prop()
  practiceName?: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ type: String, enum: TicketCategory, required: true })
  category: TicketCategory;

  @Prop({ type: String, enum: TicketPriority, default: TicketPriority.NORMAL })
  priority: TicketPriority;

  @Prop({
    type: String,
    enum: TicketStatus,
    default: TicketStatus.OPEN,
    index: true,
  })
  status: TicketStatus;

  @Prop({ type: Date, required: true })
  lastMessageAt: Date;

  /** Set when the other side replies; cleared when this side opens the ticket. */
  @Prop({ default: false })
  unreadForRequester: boolean;

  @Prop({ default: true })
  unreadForAdmin: boolean;

  @Prop({ default: 0 })
  messageCount: number;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ status: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ requesterId: 1, lastMessageAt: -1 });
