import { IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';
import { SignatureStatus } from '../enums/signature-status.enum';

export class QueryDocumentDto {

    @IsOptional()
    @IsEnum(DocumentType)
    type?: DocumentType;

    @IsOptional()
    @IsEnum(SignatureStatus)
    status?: SignatureStatus;

    @IsOptional()
    @IsMongoId()
    patient?: string;

    @IsOptional()
    @IsMongoId()
    doctor?: string;
}
