import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

import { Practitioner } from '../../practitioners/schemas/practitioner.schema';
import { Patient } from '../../patients/schemas/patient.schema';

export type DocumentDocument = MedicalDocument & MongooseDocument;

export enum DocumentType {
    INITIAL_EVALUATION = 'initial-evaluation',
    RISK_ASSESSMENT = 'risk-assessment',
    FOLLOW_UP_NOTE = 'follow-up-note',
    INDIVIDUAL_THERAPY = 'individual-therapy-session',
    CRISIS_INTERVENTION = 'crisis-intervention',
    MEDICATION_REVIEW = 'medication-review',
    DISCHARGE_SUMMARY = 'discharge-summary',
    PROGRESS_NOTE_SOAP = 'progress-note-soap',
    PSYCH_TESTING_REPORT = 'psych-testing-report',
}

export enum DocumentStatus {
    DRAFT = 'draft',
    FINALIZED = 'finalized',
    SIGNED = 'signed',
}

@Schema({ timestamps: true })
export class MedicalDocument {

    @Prop({ required: true, enum: DocumentType })
    type: DocumentType;

    @Prop({ required: true })
    date: Date;

    // ✅ FIXED REF
    @Prop({ type: Types.ObjectId, ref: Practitioner.name, required: true })
    doctor: Types.ObjectId;

    // ✅ FIXED REF
    @Prop({ type: Types.ObjectId, ref: Patient.name, required: true })
    patient: Types.ObjectId;

    @Prop({ enum: DocumentStatus, default: DocumentStatus.DRAFT })
    status: DocumentStatus;

    // 🔥 Structured content
    @Prop({ type: Object, required: true })
    content: Record<string, any>;

    @Prop()
    pdfUrl?: string;

    @Prop()
    signedAt?: Date;
}

export const DocumentSchema = SchemaFactory.createForClass(MedicalDocument);

// 🚀 Indexing for performance
DocumentSchema.index({ patient: 1, date: -1 });
DocumentSchema.index({ doctor: 1 });
DocumentSchema.index({ type: 1 });
