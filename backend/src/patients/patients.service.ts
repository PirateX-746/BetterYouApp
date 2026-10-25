// src/patients/patients.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { Patient, PatientDocument } from './schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Role } from '../common/role.enum';
import {
  practiceScopeFilter,
  practiceStamp,
} from '../common/tenancy/practice-scope';
import { generateTempPassword } from '../common/temp-password';

/**
 * How long a practitioner-issued temporary password stays valid. Longer than
 * a self-service reset (1 h) because it's handed to the patient in person and
 * may not be used the same day. Login refuses it after this.
 */
const NEW_PATIENT_TEMP_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

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
    // 🔹 Check duplicate email or phone
    const existing = await this.patientModel.findOne({
      $or: [{ email: dto.email }, { phoneNo: dto.phoneNo }],
    });

    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      if (existing.phoneNo === dto.phoneNo) {
        throw new ConflictException('Phone number already registered');
      }
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

    // Returned exactly once, so the practitioner can hand it over (there is
    // no email provider yet). Only the bcrypt hash is stored.
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
    return { temporaryPassword, temporaryPasswordExpiresAt: expiresAt };
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
  async update(id: string, dto: UpdatePatientDto, practiceId: string | null) {
    // Email is immutable — silently strip it if sent
    const { email: _email, ...safeDto } = dto as UpdatePatientDto & {
      email?: string;
    };
    dto = safeDto as UpdatePatientDto;

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
