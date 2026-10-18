import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/** Atomic sequence for ticket numbers (SUP-1001, SUP-1002, ...). */
@Schema({ collection: 'supportcounters' })
export class SupportCounter extends Document<string> {
  @Prop({ type: String })
  declare _id: string;

  @Prop({ default: 0 })
  seq: number;
}

export const SupportCounterSchema = SchemaFactory.createForClass(SupportCounter);
