import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScaleDirection = 'higher-is-better' | 'higher-is-more';

export interface TemplateItem {
  id: string;
  label: string;
  type: 'scale' | 'text';
  help?: string;
  scale?: { min: number; max: number; lowLabel: string; highLabel: string; direction: ScaleDirection };
}

export interface TemplateSection {
  id: string;
  title: string;
  items: TemplateItem[];
}

/**
 * A versioned questionnaire for session assessments, per practice. Editing a
 * template creates a new version; each assessment records the version it was
 * filled against, so old assessments always render with their own questions.
 */
@Schema({ timestamps: true, collection: 'assessmenttemplates' })
export class AssessmentTemplate extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  version: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Array, required: true })
  sections: TemplateSection[];

  @Prop({ default: true })
  isActive: boolean;
}

export const AssessmentTemplateSchema = SchemaFactory.createForClass(AssessmentTemplate);
AssessmentTemplateSchema.index({ practiceId: 1, key: 1, version: 1 }, { unique: true });
