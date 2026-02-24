import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {

    @Prop({ required: true })
    conversationId: string;

    @Prop({ required: true })
    senderId: string;

    @Prop()
    text: string;

    @Prop()
    image: string;

    @Prop()
    file: string;

    @Prop({
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent',
    })
    status: string;
}

export const MessageSchema =
    SchemaFactory.createForClass(Message);