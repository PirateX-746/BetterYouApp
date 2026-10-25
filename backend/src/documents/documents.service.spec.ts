// Referenced schemas are irrelevant here (models are stubbed) and their
// decorator metadata does not resolve under ts-jest's isolated transpile.
jest.mock('../practitioners/schemas/practitioner.schema', () => ({
  Practitioner: class Practitioner {},
  PractitionerSchema: {},
}));
jest.mock('../patients/schemas/patient.schema', () => ({
  Patient: class Patient {},
  PatientSchema: {},
}));

import { Types } from 'mongoose';
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import { DocumentsService } from './documents.service';
import { Role } from '../common/role.enum';
import type { AuthUser } from '../common/auth-user';
import {
  DocumentCategory,
  DocumentSource,
  DocumentType,
} from './schemas/document.schema';
import { UploadDocumentDto } from './dto/upload-document.dto';

const PRACTICE = new Types.ObjectId().toHexString();
const OTHER_PRACTICE = new Types.ObjectId().toHexString();
const PATIENT = new Types.ObjectId().toHexString();
const USER = new Types.ObjectId().toHexString();

const user: AuthUser = {
  userId: USER,
  role: Role.PRACTITIONER,
  practiceId: PRACTICE,
};

const pdfBuffer = Buffer.from(
  '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n' +
    'x'.repeat(100) +
    '\n%%EOF\n',
  'latin1',
);
const file = { buffer: pdfBuffer, size: pdfBuffer.length };

const dto = (): UploadDocumentDto => ({
  title: 'Lab Results',
  category: DocumentCategory.LAB_RESULT,
  date: '2026-10-12',
  source: DocumentSource.CAMERA_SCAN,
  pageCount: 2,
  uploadKey: 'abcdef0123456789abcd',
});

/** Chainable query stub resolving to `value`. */
const q = (value: unknown) => {
  const chain: Record<string, unknown> = {};
  for (const m of ['populate', 'select', 'sort']) chain[m] = () => chain;
  chain.lean = () => Promise.resolve(value);
  return chain;
};

/** The fields of the record DocumentsService.upload creates that tests read. */
interface CreatedDocument {
  _id: Types.ObjectId;
  type: DocumentType;
  doctor: Types.ObjectId;
  patient: Types.ObjectId;
  practiceId: Types.ObjectId;
  file: unknown;
}

function setup() {
  const documentModel = {
    findOne: jest.fn(),
    create: jest.fn<Promise<unknown>, [CreatedDocument]>(),
    findOneAndDelete: jest.fn(),
  };
  const patientModel = { exists: jest.fn() };
  const storage = {
    driverName: 'gridfs',
    put: jest
      .fn<Promise<void>, [string, Buffer, string]>()
      .mockResolvedValue(undefined),
    get: jest.fn(),
    deleteQuietly: jest.fn().mockResolvedValue(true),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  const service = new DocumentsService(
    documentModel as never,
    patientModel as never,
    storage as never,
    audit as never,
  );
  return { service, documentModel, patientModel, storage, audit };
}

describe('DocumentsService.upload', () => {
  it('stores the file, persists metadata from the session, and audits', async () => {
    const { service, documentModel, patientModel, storage, audit } = setup();
    patientModel.exists.mockResolvedValue({ _id: PATIENT });
    const saved = { _id: 'x', title: 'Lab Results' };
    documentModel.findOne
      .mockReturnValueOnce(q(null)) // idempotency lookup
      .mockReturnValueOnce(q(saved)); // final findOne
    documentModel.create.mockResolvedValue({});

    const result = await service.upload(PATIENT, dto(), file, user);

    expect(result).toBe(saved);
    // Patient lookup is practice-scoped.
    expect(patientModel.exists).toHaveBeenCalledWith(
      expect.objectContaining({ practiceId: new Types.ObjectId(PRACTICE) }),
    );

    const [key, body, mime] = storage.put.mock.calls[0];
    expect(key).toMatch(
      new RegExp(
        `^documents/${PRACTICE}/patients/${PATIENT}/[a-f0-9]{24}/original\\.pdf$`,
      ),
    );
    expect(body).toBe(pdfBuffer);
    expect(mime).toBe('application/pdf');

    const created = documentModel.create.mock.calls[0][0];
    expect(created.type).toBe(DocumentType.CUSTOM);
    expect(created.doctor.toString()).toBe(USER);
    expect(created.patient.toString()).toBe(PATIENT);
    expect(created.practiceId.toString()).toBe(PRACTICE);
    expect(created.file).toMatchObject({
      storageKey: key,
      mimeType: 'application/pdf',
      pageCount: 2,
    });
    expect(created._id.toString()).toBe(key.split('/')[4]);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'document.upload', actorId: USER }),
    );
  });

  it('rejects a patient from another practice without touching storage', async () => {
    const { service, patientModel, storage } = setup();
    patientModel.exists.mockResolvedValue(null);

    await expect(
      service.upload(PATIENT, dto(), file, {
        ...user,
        practiceId: OTHER_PRACTICE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects a caller with no practice', async () => {
    const { service } = setup();
    await expect(
      service.upload(PATIENT, dto(), file, { ...user, practiceId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects non-PDF content regardless of declared type', async () => {
    const { service, documentModel, patientModel, storage } = setup();
    patientModel.exists.mockResolvedValue({ _id: PATIENT });
    documentModel.findOne.mockReturnValue(q(null));
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      Buffer.alloc(200),
    ]);

    await expect(
      service.upload(PATIENT, dto(), { buffer: png, size: png.length }, user),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('deletes the stored object when metadata persistence fails', async () => {
    const { service, documentModel, patientModel, storage } = setup();
    patientModel.exists.mockResolvedValue({ _id: PATIENT });
    documentModel.findOne.mockReturnValue(q(null));
    documentModel.create.mockRejectedValue(new Error('mongo down'));

    await expect(
      service.upload(PATIENT, dto(), file, user),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    const key = storage.put.mock.calls[0][0];
    expect(storage.deleteQuietly).toHaveBeenCalledWith(key);
  });

  it('writes no metadata when the storage write fails', async () => {
    const { service, documentModel, patientModel, storage } = setup();
    patientModel.exists.mockResolvedValue({ _id: PATIENT });
    documentModel.findOne.mockReturnValue(q(null));
    storage.put.mockRejectedValue(new Error('r2 down'));

    await expect(
      service.upload(PATIENT, dto(), file, user),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(documentModel.create).not.toHaveBeenCalled();
  });

  it('returns the existing document for a retried upload key', async () => {
    const { service, documentModel, patientModel, storage } = setup();
    patientModel.exists.mockResolvedValue({ _id: PATIENT });
    const existingId = new Types.ObjectId();
    const saved = { _id: existingId };
    documentModel.findOne
      .mockReturnValueOnce(
        q({ _id: existingId, patient: new Types.ObjectId(PATIENT) }),
      )
      .mockReturnValueOnce(q(saved));

    await expect(service.upload(PATIENT, dto(), file, user)).resolves.toBe(
      saved,
    );
    expect(storage.put).not.toHaveBeenCalled();
    expect(documentModel.create).not.toHaveBeenCalled();
  });

  it('refuses to reuse an upload key across patients', async () => {
    const { service, documentModel, patientModel } = setup();
    patientModel.exists.mockResolvedValue({ _id: PATIENT });
    documentModel.findOne.mockReturnValueOnce(
      q({ _id: new Types.ObjectId(), patient: new Types.ObjectId() }),
    );

    await expect(
      service.upload(PATIENT, dto(), file, user),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('resolves a concurrent duplicate (E11000) to the winning document', async () => {
    const { service, documentModel, patientModel, storage } = setup();
    patientModel.exists.mockResolvedValue({ _id: PATIENT });
    const winnerId = new Types.ObjectId();
    documentModel.findOne
      .mockReturnValueOnce(q(null))
      .mockReturnValueOnce(
        q({ _id: winnerId, patient: new Types.ObjectId(PATIENT) }),
      )
      .mockReturnValueOnce(q({ _id: winnerId }));
    documentModel.create.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 11000 }),
    );

    await expect(service.upload(PATIENT, dto(), file, user)).resolves.toEqual({
      _id: winnerId,
    });
    // Our own (losing) object is cleaned up.
    expect(storage.deleteQuietly).toHaveBeenCalledWith(
      storage.put.mock.calls[0][0],
    );
  });
});

describe('DocumentsService.openFile', () => {
  it('scopes the lookup to the caller practice', async () => {
    const { service, documentModel, storage } = setup();
    documentModel.findOne.mockReturnValue(q(null));

    await expect(
      service.openFile(new Types.ObjectId().toHexString(), {
        ...user,
        practiceId: OTHER_PRACTICE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(documentModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        practiceId: new Types.ObjectId(OTHER_PRACTICE),
      }),
    );
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('streams the stored object for an authorized caller', async () => {
    const { service, documentModel, storage } = setup();
    documentModel.findOne.mockReturnValue(
      q({
        file: {
          storageKey: 'k',
          mimeType: 'application/pdf',
          size: 10,
          fileName: 'a.pdf',
        },
      }),
    );
    const stream = {};
    storage.get.mockResolvedValue(stream);

    const res = await service.openFile(
      new Types.ObjectId().toHexString(),
      user,
    );
    expect(res).toMatchObject({
      stream,
      mimeType: 'application/pdf',
      fileName: 'a.pdf',
    });
    expect(storage.get).toHaveBeenCalledWith('k');
  });
});

describe('DocumentsService.remove', () => {
  it('deletes the stored object along with the metadata', async () => {
    const { service, documentModel, storage } = setup();
    documentModel.findOne.mockReturnValue(q({ type: 'custom-document' }));
    documentModel.findOneAndDelete.mockResolvedValue({
      file: { storageKey: 'k' },
    });

    await service.remove(new Types.ObjectId().toHexString(), PRACTICE);
    expect(storage.deleteQuietly).toHaveBeenCalledWith('k');
  });

  it('refuses to delete a filed session assessment', async () => {
    const { service, documentModel } = setup();
    documentModel.findOne.mockReturnValue(q({ type: 'session-assessment' }));

    await expect(
      service.remove(new Types.ObjectId().toHexString(), PRACTICE),
    ).rejects.toThrow(
      'Submitted session assessments can be amended but not deleted',
    );
    expect(documentModel.findOneAndDelete).not.toHaveBeenCalled();
  });
});
