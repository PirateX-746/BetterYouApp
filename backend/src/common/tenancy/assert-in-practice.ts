import { BadRequestException } from '@nestjs/common';
import { Connection, Types } from 'mongoose';
import { practiceScopeFilter } from './practice-scope';

/**
 * Throws unless the patient exists in the caller's practice. Clinical
 * records (notes, plans, prescriptions) take the patient id from the request
 * body, so without this a known id from another practice could be written
 * against. Pass any model's `.db` connection.
 */
export async function assertPatientInPractice(
  db: Connection,
  patientId: string,
  practiceId: string | null,
): Promise<void> {
  if (!Types.ObjectId.isValid(patientId)) {
    throw new BadRequestException('Invalid patient ID');
  }
  const exists = await db.model('Patient').exists({
    _id: new Types.ObjectId(patientId),
    ...practiceScopeFilter(practiceId),
  });
  if (!exists) throw new BadRequestException('Patient not found');
}
