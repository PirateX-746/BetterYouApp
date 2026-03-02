import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Availability extends Document {
    @Prop({ required: true })
    practitionerId: string;

    @Prop({ required: true })
    start: Date;

    @Prop({ required: true })
    end: Date;

    @Prop({ default: false })
    isBooked: boolean;
}

export const AvailabilitySchema =
    SchemaFactory.createForClass(Availability);