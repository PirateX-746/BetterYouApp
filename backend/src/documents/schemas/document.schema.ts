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
  /** Scanned or uploaded file (PDF) rather than a structured form. */
  CUSTOM = 'custom-document',
  /**
   * Filed by the session assessment workspace on submit. Not creatable,
   * editable or deletable through the generic document routes — corrections
   * go through amendments (SessionAssessmentsService.amend).
   */
  SESSION_ASSESSMENT = 'session-assessment',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  SIGNED = 'signed',
}

export enum DocumentCategory {
  MEDICAL_REPORT = 'medical-report',
  PRESCRIPTION = 'prescription',
  LAB_RESULT = 'lab-result',
  REFERRAL_LETTER = 'referral-letter',
  CONSENT_FORM = 'consent-form',
  INSURANCE = 'insurance',
  IDENTIFICATION = 'identification',
  OTHER = 'other',
}

export enum DocumentSource {
  CAMERA_SCAN = 'camera_scan',
  DEVICE_UPLOAD = 'device_upload',
}

@Schema({ _id: false })
export class StoredFile {
  @Prop({ required: true })
  storageKey: string;

  @Prop({ required: true, enum: ['r2', 'gridfs'] })
  driver: 'r2' | 'gridfs';

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  pageCount: number;

  /** Sanitized display filename — never used to build the storage key. */
  @Prop({ required: true })
  fileName: string;
}

export const StoredFileSchema = SchemaFactory.createForClass(StoredFile);

@Schema({ timestamps: true })
export class MedicalDocument {
  // Backfilled by migration 001; scoped explicitly in DocumentsService.
  @Prop({ type: Types.ObjectId, ref: 'Practice', index: true })
  practiceId?: Types.ObjectId;

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

  /* ---- Custom (scanned / uploaded) documents only ---- */

  @Prop({ trim: true, maxlength: 120 })
  title?: string;

  @Prop({ enum: DocumentCategory })
  category?: DocumentCategory;

  @Prop({ trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ enum: DocumentSource })
  source?: DocumentSource;

  /**
   * The stored binary. Only the object key lives here — the bytes are in
   * private storage (R2 or GridFS) and are served exclusively through the
   * authorized GET /documents/:id/file stream.
   */
  @Prop({ type: StoredFileSchema })
  file?: StoredFile;

  /**
   * Client-generated idempotency key for an upload. A retried request with
   * the same key returns the existing document instead of a duplicate.
   */
  @Prop()
  uploadKey?: string;
}

export const DocumentSchema = SchemaFactory.createForClass(MedicalDocument);

DocumentSchema.index(
  { practiceId: 1, uploadKey: 1 },
  { unique: true, partialFilterExpression: { uploadKey: { $type: 'string' } } },
);

// 🚀 Indexing for performance
DocumentSchema.index({ patient: 1, date: -1 });
DocumentSchema.index({ doctor: 1 });
DocumentSchema.index({ type: 1 });
