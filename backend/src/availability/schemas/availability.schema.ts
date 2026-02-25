import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AvailabilityDocument = Availability & Document;

@Schema({ timestamps: true })
export class Availability {
    @Prop({ type: Types.ObjectId, required: true, ref: 'Practitioner' })
    practitionerId: Types.ObjectId;

    @Prop({ required: true, enum: ['day', 'slot'] })
    blockType: string;

    @Prop({ required: true })
    date: string; // YYYY-MM-DD

    @Prop()
    startTime?: string; // HH:mm for "slot" blocks

    @Prop()
    endTime?: string; // HH:mm for "slot" blocks

    @Prop()
    reason?: string;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);
