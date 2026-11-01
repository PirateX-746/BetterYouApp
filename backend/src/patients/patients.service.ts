// src/patients/patients.service.ts

import { patientEmailsAllowed } from '../practices/patient-email-policy';
import {
  OnModuleInit,
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  PATIENT_EMAIL_INDEX,
  Patient,
  PatientDocument,
} from './schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Role } from '../common/role.enum';
import {
  practiceScopeFilter,
  practiceStamp,
} from '../common/tenancy/practice-scope';
import { generateTempPassword } from '../common/temp-password';
import { EmailService } from '../email/email.service';
import { phoneVariants } from '../common/phone';
import { renderWelcomeEmail } from './welcome-email';
import {
  portalSignInUrl,
  renderTempPasswordEmail,
} from '../auth/password-reset-email';

/**
 * How long a practitioner-issued temporary password stays valid. Longer than
 * a self-service reset (1 h) because it's handed to the patient in person and
 * may not be used the same day. Login refuses it after this.
 */
const NEW_PATIENT_TEMP_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PatientsService implements OnModuleInit {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    private readonly email: EmailService,
  ) {}

  /**
   * Email became optional: the old plain-unique email index would let only
   * one patient have no email. Swap it for the partial index declared on
   * the schema. Idempotent; dropping an index never touches documents.
   */
  async onModuleInit() {
    try {
      const coll = this.patientModel.collection;
      const legacy = (await coll.indexes()).find(
        (i) =>
          i.name !== PATIENT_EMAIL_INDEX &&
          Object.keys(i.key).length === 1 &&
          i.key.email !== undefined,
      );
      if (legacy?.name) {
        await coll.dropIndex(legacy.name);
        this.logger.log(`Dropped legacy patient email index ${legacy.name}`);
      }
      await this.patientModel.createIndexes();
    } catch (err) {
      this.logger.error(
        `Patient email index migration failed: ${(err as Error).message}`,
      );
    }
  }

  /* ===============================
     GENERATE MRN (Better Version)
     =============================== */
  private async generateMRN(): Promise<string> {
    const year = new Date().getFullYear();

    // Count only patients created this year
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year + 1}-01-01`);

    const count = await this.patientModel.countDocuments({
      createdAt: { $gte: startOfYear, $lt: endOfYear },
    });

    const padded = String(count + 1).padStart(4, '0');

    return `MRN-${year}-${padded}`;
  }

  /* ===============================
     CREATE PATIENT
     =============================== */
  async create(dto: CreatePatientDto, practiceId: string | null) {
    // Duplicate email (when given) or phone. The phone is matched in every
    // stored form: older records hold bare 10-digit Indian numbers.
    const phones = phoneVariants(dto.phoneNo);
    const existing = await this.patientModel.findOne({
      $or: [
        ...(dto.email ? [{ email: dto.email }] : []),
        { phoneNo: { $in: phones } },
      ],
    });

    if (existing) {
      if (dto.email && existing.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Phone number already registered');
    }

    // 🔹 Generate MRN
    const mrn = await this.generateMRN();

    // A unique one-time password per patient, never a shared default. The
    // patient must replace it at first sign-in, and it expires unused.
    const temporaryPassword = generateTempPassword();

    const patient = await this.patientModel.create({
      ...dto,
      mrn,
      password: await bcrypt.hash(temporaryPassword, 10),
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(
        Date.now() + NEW_PATIENT_TEMP_PASSWORD_TTL_MS,
      ),
      dateOfBirth: new Date(dto.dateOfBirth),
      lastVisit: dto.lastVisit ? new Date(dto.lastVisit) : undefined,
      role: Role.PATIENT,
      isActive: true,
      practiceId: practiceStamp(practiceId),
    });

    // Welcome email. Not awaited: an email outage mustn't fail registration.
    if (this.email.enabled && patient.email) {
      void this.emailWelcome(patient);
    }

    // Returned exactly once, so the practitioner can hand it over. Only the
    // bcrypt hash is stored; the welcome email does not include it.
    return {
      ...(await this.findById(patient._id.toString(), practiceId)),
      temporaryPassword,
      temporaryPasswordExpiresAt: patient.tempPasswordExpiresAt,
    };
  }

  /**
   * Issues a fresh temporary password for a patient in the caller's practice
   * (lost or expired). Invalidates the old password immediately.
   */
  async issueTemporaryPassword(id: string, practiceId: string | null) {
    const temporaryPassword = generateTempPassword();
    const expiresAt = new Date(Date.now() + NEW_PATIENT_TEMP_PASSWORD_TTL_MS);
    const updated = await this.patientModel.findOneAndUpdate(
      { _id: id, ...practiceScopeFilter(practiceId) },
      {
        $set: {
          password: await bcrypt.hash(temporaryPassword, 10),
          mustChangePassword: true,
          tempPasswordExpiresAt: expiresAt,
        },
      },
    );
    if (!updated) throw new NotFoundException('Patient not found');

    // Also email it, so the patient isn't relying on the practitioner to pass
    // it on. Not awaited: an email outage mustn't fail the reset itself.
    const emailed = this.email.enabled && !!updated.email;
    if (emailed) {
      void this.emailTemporaryPassword(updated, temporaryPassword);
    }
    return {
      temporaryPassword,
      temporaryPasswordExpiresAt: expiresAt,
      emailed,
    };
  }

  private async emailWelcome(patient: {
    _id: unknown;
    firstName: string;
    email?: string;
    practiceId?: unknown;
  }) {
    try {
      if (
        !(await patientEmailsAllowed(this.patientModel.db, patient.practiceId))
      ) {
        this.logger.log(
          `Skipped welcome email for patient ${String(patient._id)}: patient emails are off for the practice`,
        );
        return;
      }
      const practice = patient.practiceId
        ? await this.patientModel.db
            .model<{ name: string; email?: string; phone?: string }>('Practice')
            .findById(patient.practiceId, { name: 1, email: 1, phone: 1 })
            .lean()
        : null;
      await this.email.send({
        to: patient.email!,
        replyTo: practice?.email,
        idempotencyKey: `welcome-${String(patient._id)}`,
        ...renderWelcomeEmail({
          firstName: patient.firstName,
          practiceName: practice?.name ?? 'Your practice',
          practicePhone: practice?.phone,
          practiceEmail: practice?.email,
        }),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send welcome email to patient ${String(patient._id)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private async emailTemporaryPassword(
    patient: {
      _id: unknown;
      firstName: string;
      email?: string;
      practiceId?: unknown;
    },
    temporaryPassword: string,
  ) {
    try {
      if (
        !(await patientEmailsAllowed(this.patientModel.db, patient.practiceId))
      ) {
        this.logger.log(
          `Skipped temporary-password email for patient ${String(patient._id)}: patient emails are off for the practice`,
        );
        return;
      }
      const practice = patient.practiceId
        ? await this.patientModel.db
            .model<{ name: string; email?: string }>('Practice')
            .findById(patient.practiceId, { name: 1, email: 1 })
            .lean()
        : null;
      if (!patient.email) return;
      await this.email.send({
        to: patient.email,
        replyTo: practice?.email,
        ...renderTempPasswordEmail({
          firstName: patient.firstName,
          tempPassword: temporaryPassword,
          validForMinutes: NEW_PATIENT_TEMP_PASSWORD_TTL_MS / 60_000,
          signInUrl: portalSignInUrl('patient'),
          issuedByPractice: practice?.name ?? 'Your practice',
        }),
      });
    } catch (err) {
      this.logger.error(
        `Failed to email temporary password to patient ${String(patient._id)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /* ===============================
     GET ALL ACTIVE PATIENTS
     =============================== */
  async findAll(practiceId: string | null) {
    return this.patientModel
      .find({ isActive: true, ...practiceScopeFilter(practiceId) })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
  }

  /* ===============================
     GET PATIENT BY ID
     =============================== */
  async findById(id: string, practiceId: string | null) {
    const patient = await this.patientModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .select('-password')
      .lean();

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  /* ===============================
     UPDATE PATIENT
     =============================== */
  async update(
    id: string,
    dto: UpdatePatientDto,
    practiceId: string | null,
    { allowEmailChange = false }: { allowEmailChange?: boolean } = {},
  ) {
    // Email is the patient's sign-in and where appointment emails go. The
    // practice can add or correct it (patients may be added without one);
    // a patient can't change it from their own profile. Blank = no change.
    const { email: requestedEmail, ...safeDto } = dto as UpdatePatientDto & {
      email?: string;
    };
    dto = safeDto as UpdatePatientDto;
    const newEmail = allowEmailChange ? requestedEmail || undefined : undefined;

    const before = await this.patientModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) }, { email: 1 })
      .lean();
    if (!before) throw new NotFoundException('Patient not found');

    if (newEmail && newEmail !== before.email) {
      const taken = await this.patientModel.exists({
        _id: { $ne: id },
        email: newEmail,
      });
      if (taken) throw new ConflictException('Email already registered');
    }

    if (dto.phoneNo) {
      const existing = await this.patientModel.findOne({
        _id: { $ne: id },
        phoneNo: dto.phoneNo,
      });
      if (existing) {
        throw new ConflictException('Phone number already in use');
      }
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (newEmail) updateData.email = newEmail;
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.lastVisit) updateData.lastVisit = new Date(dto.lastVisit);

    // Defence in depth behind UpdatePatientDto: identity and credential
    // fields are never writable through a profile update.
    for (const k of [
      'role',
      'password',
      'mrn',
      'practiceId',
      'mustChangePassword',
      'tempPasswordExpiresAt',
    ]) {
      delete updateData[k];
    }

    const updated = await this.patientModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: updateData },
        { new: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Patient not found');
    }

    // First email address on file: same welcome email as adding the
    // patient with one. Not awaited — an outage mustn't fail the save.
    if (newEmail && !before.email && this.email.enabled) {
      void this.emailWelcome(updated);
    }

    return this.findById(id, practiceId);
  }

  /* ===============================
     CHANGE PASSWORD
     =============================== */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    practiceId: string | null,
  ) {
    const patient = await this.patientModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .select('+password');
    if (!patient) throw new NotFoundException('Patient not found');

    const valid = await bcrypt.compare(currentPassword, patient.password);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    patient.password = await bcrypt.hash(newPassword, 10);
    await patient.save();

    return { message: 'Password updated successfully' };
  }
}
