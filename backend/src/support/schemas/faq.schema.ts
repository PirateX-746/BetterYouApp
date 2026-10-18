import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/** Platform-wide help article, managed by the Super Admin. */
@Schema({ timestamps: true })
export class Faq extends Document {
  @Prop({ required: true, trim: true })
  question: string;

  /** Plain text; line breaks are preserved when displayed. */
  @Prop({ required: true })
  answer: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: true })
  isPublished: boolean;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
FaqSchema.index({ isPublished: 1, category: 1, sortOrder: 1 });
