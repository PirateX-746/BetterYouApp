import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

import { MedicalDocument, DocumentSchema } from './schemas/document.schema';
import { Practitioner, PractitionerSchema } from '../practitioners/schemas/practitioner.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: MedicalDocument.name, schema: DocumentSchema },
            { name: Practitioner.name, schema: PractitionerSchema },
            { name: Patient.name, schema: PatientSchema },
        ]),
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
})
export class DocumentsModule { }
