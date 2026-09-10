import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientMedicationDto } from './create-patient-medication.dto';

export class UpdatePatientMedicationDto extends PartialType(
  CreatePatientMedicationDto,
) {}
