import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class SupportAttachment {
  _id: Types.ObjectId;
  fileName: string;
  contentType: string;
  size: number;
  /** Never sent to clients — see SupportService.toMessage. */
  storageKey: string;
}

/** One entry in a ticket's thread, from either side. */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class SupportMessage extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'SupportTicket',
    required: true,
    index: true,
  })
  ticketId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  authorId: Types.ObjectId;

  /** 'requester' (the practice side) or 'support' (platform admin). */
  @Prop({ type: String, enum: ['requester', 'support'], required: true })
  authorSide: 'requester' | 'support';

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true })
  body: string;

  @Prop({
    type: [
      {
        _id: { type: Types.ObjectId, required: true },
        fileName: String,
        contentType: String,
        size: Number,
        storageKey: String,
      },
    ],
    default: [],
  })
  attachments: SupportAttachment[];

  createdAt: Date;
}

export const SupportMessageSchema =
  SchemaFactory.createForClass(SupportMessage);
SupportMessageSchema.index({ ticketId: 1, createdAt: 1 });
