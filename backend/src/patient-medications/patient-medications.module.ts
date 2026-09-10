import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PatientMedication,
  PatientMedicationSchema,
} from './schemas/patient-medication.schema';
import { PatientMedicationsController } from './patient-medications.controller';
import { PatientMedicationsService } from './patient-medications.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientMedication.name, schema: PatientMedicationSchema },
    ]),
  ],
  controllers: [PatientMedicationsController],
  providers: [PatientMedicationsService],
  exports: [PatientMedicationsService],
})
export class PatientMedicationsModule {}
