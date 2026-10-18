import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Readable } from 'stream';

import {
  MedicalDocument,
  DocumentDocument,
  DocumentStatus,
  DocumentType,
} from './schemas/document.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { practiceScopeFilter, practiceStamp } from '../common/tenancy/practice-scope';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import {
  PDF_MIME,
  UPLOAD_LIMITS,
  hasActivePdfContent,
  isPdf,
  safeFileName,
  storageKeyFor,
} from './document-file';

/** Never sent to clients: internal storage location and idempotency key. */
const HIDDEN_FIELDS = '-file.storageKey -file.driver -uploadKey';

export interface UploadedPdf {
  buffer: Buffer;
  size: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(MedicalDocument.name)
    private documentModel: Model<DocumentDocument>,
    @InjectModel(Patient.name)
    private patientModel: Model<PatientDocument>,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateDocumentDto, practiceId: string | null) {
    return this.documentModel.create({
      ...dto,
      date: new Date(dto.date),
      practiceId: practiceStamp(practiceId),
    });
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.documentModel
      .find({ patient: new Types.ObjectId(patientId), ...practiceScopeFilter(practiceId) })
      .populate('doctor', 'firstName lastName')
      .populate('patient', 'firstName lastName')
      .select(HIDDEN_FIELDS)
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async findOne(id: string, practiceId: string | null) {
    const doc = await this.documentModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .populate('doctor', 'firstName lastName')
      .populate('patient', 'firstName lastName')
      .select(HIDDEN_FIELDS)
      .lean();

    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto, practiceId: string | null) {
    const document = await this.documentModel.findOne({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });

    if (!document) throw new NotFoundException('Document not found');

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Cannot edit finalized or signed document');
    }

    Object.assign(document, dto);
    return document.save();
  }

  async remove(id: string, practiceId: string | null) {
    // A filed session assessment is part of the clinical record: corrections
    // are amendments with history, never deletion.
    const target = await this.documentModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .select('type')
      .lean();
    if (target?.type === DocumentType.SESSION_ASSESSMENT) {
      throw new ForbiddenException('Submitted session assessments can be amended but not deleted');
    }
    const deleted = await this.documentModel.findOneAndDelete({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });

    if (!deleted) throw new NotFoundException('Document not found');

    // Metadata is gone, so the object is unreachable either way; a failed
    // delete is logged by the storage service for manual cleanup.
    if (deleted.file?.storageKey) {
      await this.storage.deleteQuietly(deleted.file.storageKey);
    }

    return { message: 'Document deleted successfully' };
  }

  /* ===============================
     CUSTOM DOCUMENT (SCAN / UPLOAD)
     =============================== */

  /**
   * Stores a scanned or uploaded PDF for a patient.
   *
   * Order matters for consistency: the object is written first under a key
   * derived from a pre-generated document id, then the metadata. If the
   * metadata write fails the object is deleted, so storage never holds a file
   * the app cannot see. A file without metadata is the only possible leftover
   * (if that cleanup itself fails), and it is logged by key.
   */
  async upload(
    patientId: string,
    dto: UploadDocumentDto,
    file: UploadedPdf | undefined,
    user: AuthUser,
  ) {
    const practiceId = user.practiceId ?? null;
    if (!practiceId) {
      throw new ForbiddenException('No practice associated with this account');
    }
    if (!Types.ObjectId.isValid(patientId)) {
      throw new NotFoundException('Patient not found');
    }

    // Tenant + patient check: the patient must belong to the caller's practice.
    const patient = await this.patientModel.exists({
      _id: new Types.ObjectId(patientId),
      ...practiceScopeFilter(practiceId),
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // Idempotent retry: same key returns the document already saved.
    const existing = await this.findByUploadKey(practiceId, dto.uploadKey);
    if (existing) return this.resolveDuplicate(existing, patientId, practiceId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('A PDF file is required');
    }
    if (file.size > UPLOAD_LIMITS.maxBytes) {
      throw new PayloadTooLargeException('File is too large');
    }
    if (!isPdf(file.buffer)) {
      throw new UnsupportedMediaTypeException('Only valid PDF files are accepted');
    }
    if (hasActivePdfContent(file.buffer)) {
      throw new UnsupportedMediaTypeException(
        'PDFs containing scripts or embedded files are not accepted',
      );
    }

    const documentId = new Types.ObjectId();
    const storageKey = storageKeyFor(practiceId, patientId, documentId.toHexString());

    try {
      await this.storage.put(storageKey, file.buffer, PDF_MIME);
    } catch (err) {
      this.logger.error(`Storage write failed for document ${documentId.toHexString()}: ${(err as Error).message}`);
      // The write may have partially landed — don't leave it behind.
      await this.storage.deleteQuietly(storageKey);
      throw new InternalServerErrorException('Could not store the document. Please try again.');
    }

    try {
      await this.documentModel.create({
        _id: documentId,
        practiceId: practiceStamp(practiceId),
        type: DocumentType.CUSTOM,
        date: new Date(dto.date),
        doctor: new Types.ObjectId(user.userId),
        patient: new Types.ObjectId(patientId),
        status: DocumentStatus.FINALIZED,
        content: {},
        title: dto.title.trim(),
        category: dto.category,
        description: dto.description?.trim() || undefined,
        source: dto.source,
        uploadKey: dto.uploadKey,
        file: {
          storageKey,
          driver: this.storage.driverName,
          mimeType: PDF_MIME,
          size: file.size,
          pageCount: dto.pageCount,
          fileName: safeFileName(dto.title),
        },
      });
    } catch (err) {
      await this.storage.deleteQuietly(storageKey);

      // Lost a race with a concurrent retry carrying the same key.
      if ((err as { code?: number }).code === 11000) {
        const winner = await this.findByUploadKey(practiceId, dto.uploadKey);
        if (winner) return this.resolveDuplicate(winner, patientId, practiceId);
      }
      this.logger.error(`Metadata write failed for document ${documentId.toHexString()}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Could not save the document. Please try again.');
    }

    await this.audit.record({
      practiceId,
      actorId: user.userId,
      actorRole: user.role,
      action: 'document.upload',
      entityType: 'MedicalDocument',
      entityId: documentId.toHexString(),
      metadata: { source: dto.source, pageCount: dto.pageCount, size: file.size },
    });

    return this.findOne(documentId.toHexString(), practiceId);
  }

  /**
   * Opens the stored file for an authorized caller. Scoped by practice just
   * like every other read, so a document id from another practice 404s.
   */
  async openFile(id: string, user: AuthUser): Promise<{
    stream: Readable;
    mimeType: string;
    size: number;
    fileName: string;
  }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Document not found');

    const doc = await this.documentModel
      .findOne({ _id: new Types.ObjectId(id), ...practiceScopeFilter(user.practiceId) })
      .select('file')
      .lean();
    if (!doc?.file?.storageKey) throw new NotFoundException('Document file not found');

    let stream: Readable;
    try {
      stream = await this.storage.get(doc.file.storageKey);
    } catch (err) {
      this.logger.error(`Storage read failed for document ${id}: ${(err as Error).message}`);
      throw new NotFoundException('Document file is unavailable');
    }

    await this.audit.record({
      practiceId: user.practiceId,
      actorId: user.userId,
      actorRole: user.role,
      action: 'document.view_file',
      entityType: 'MedicalDocument',
      entityId: id,
    });

    return {
      stream,
      mimeType: doc.file.mimeType,
      size: doc.file.size,
      fileName: doc.file.fileName,
    };
  }

  private findByUploadKey(practiceId: string, uploadKey: string) {
    return this.documentModel
      .findOne({ uploadKey, ...practiceScopeFilter(practiceId) })
      .select('_id patient')
      .lean();
  }

  private resolveDuplicate(
    existing: { _id: Types.ObjectId; patient: Types.ObjectId },
    patientId: string,
    practiceId: string,
  ) {
    if (existing.patient.toString() !== patientId) {
      throw new ConflictException('Upload key already used');
    }
    return this.findOne(existing._id.toString(), practiceId);
  }
}
