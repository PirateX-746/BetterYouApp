import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from 'src/common/role.enum';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Practitioner extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  specialization: string;

  @Prop()
  experienceYears?: number;

  @Prop({ default: Role.PRACTITIONER })
  role: Role;
}

export const PractitionerSchema = SchemaFactory.createForClass(Practitioner);
