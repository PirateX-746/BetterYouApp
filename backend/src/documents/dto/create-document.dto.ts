import {
  IsEnum,
  IsMongoId,
  IsDateString,
  IsObject,
  IsOptional,
} from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';

export class CreateDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsDateString()
  date: string;

  /** Ignored: the controller always sets the signed-in clinician as author. */
  @IsOptional()
  @IsMongoId()
  doctor?: string;

  @IsMongoId()
  patient: string;

  @IsObject()
  content: Record<string, any>;
}
