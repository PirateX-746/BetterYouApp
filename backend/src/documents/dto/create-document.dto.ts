import {
    IsEnum,
    IsMongoId,
    IsDateString,
    IsObject,
} from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';

export class CreateDocumentDto {

    @IsEnum(DocumentType)
    type: DocumentType;

    @IsDateString()
    date: string;

    @IsMongoId()
    doctor: string;

    @IsMongoId()
    patient: string;

    @IsObject()
    content: Record<string, any>;
}
