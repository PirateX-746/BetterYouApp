import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {

    @Prop({ required: true, type: String, ref: 'Patient' })
    patientId: string;

    @Prop({ required: true, type: String, ref: 'Practitioner' })
    practitionerId: string;

    @Prop({ default: 0 })
    unreadForPatient: number;

    @Prop({ default: 0 })
    unreadForPractitioner: number;
}

export const ConversationSchema =
    SchemaFactory.createForClass(Conversation);

// Ensure index for faster lookups
ConversationSchema.index({ patientId: 1, practitionerId: 1 }, { unique: true });