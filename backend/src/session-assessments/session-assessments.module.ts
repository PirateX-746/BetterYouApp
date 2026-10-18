import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionAssessment, SessionAssessmentSchema } from './schemas/session-assessment.schema';
import { AssessmentTemplate, AssessmentTemplateSchema } from './schemas/assessment-template.schema';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema';
import { MedicalDocument, DocumentSchema } from '../documents/schemas/document.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { AuditModule } from '../audit/audit.module';
import { SessionAssessmentsService } from './session-assessments.service';
import { SessionAssessmentsController } from './session-assessments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionAssessment.name, schema: SessionAssessmentSchema },
      { name: AssessmentTemplate.name, schema: AssessmentTemplateSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: MedicalDocument.name, schema: DocumentSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
    AuditModule,
  ],
  controllers: [SessionAssessmentsController],
  providers: [SessionAssessmentsService],
  exports: [SessionAssessmentsService],
})
export class SessionAssessmentsModule {}
