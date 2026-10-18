import { Type } from 'class-transformer';
import {
  IsEnum,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DocumentCategory,
  DocumentSource,
} from '../schemas/document.schema';
import { UPLOAD_LIMITS } from '../document-file';

/**
 * Text fields of the multipart upload. The file itself is validated
 * separately (see document-file.ts) since class-validator never sees it.
 *
 * Deliberately has no doctor / patient / practice fields: the uploader comes
 * from the session and the patient from the route.
 */
export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  date: string;

  @IsEnum(DocumentSource)
  source: DocumentSource;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(UPLOAD_LIMITS.maxPages)
  pageCount: number;

  /** Client idempotency key (UUID-ish). */
  @IsString()
  @Matches(/^[A-Za-z0-9-]{16,64}$/)
  uploadKey: string;
}
