import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class OpenAssessmentDto {
  @IsMongoId()
  appointmentId: string;
}

export class ResponseDto {
  @IsString()
  @MaxLength(60)
  itemId: string;

  @IsIn(['scored', 'not_observed', 'not_applicable', 'blank'])
  state: 'scored' | 'not_observed' | 'not_applicable' | 'blank';

  // Required only when scored; null/absent otherwise.
  // Text items carry `text` instead (the service checks per item type).
  @ValidateIf((o: ResponseDto) => o.state === 'scored' && o.text === undefined)
  @IsInt({ message: 'Scores are whole numbers from 0 to 10' })
  @Min(0)
  @Max(10)
  score?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Autosave / explicit save of a draft. `revision` is the optimistic lock. */
export class SaveDraftDto {
  @IsInt()
  @Min(1)
  revision: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ResponseDto)
  responses?: ResponseDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Session notes must be 5000 characters or fewer',
  })
  notes?: string;

  /** Practitioner edits to the generated summary. */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summaryText?: string;

  @IsOptional()
  @IsBoolean()
  summaryApproved?: boolean;

  /** draft ⇄ ready_for_review only — submission has its own endpoint. */
  @IsOptional()
  @IsIn(['draft', 'ready_for_review'])
  status?: 'draft' | 'ready_for_review';
}

export class SubmitAssessmentDto {
  @IsInt()
  @Min(1)
  revision: number;
}

export class AmendAssessmentDto extends SaveDraftDto {
  @IsString()
  @MinLength(5, { message: 'Give a short reason for the amendment' })
  @MaxLength(500)
  reason: string;
}

/** Unsaved edits to summarise (amend mode). */
export class PreviewSummaryDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ResponseDto)
  responses?: ResponseDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
