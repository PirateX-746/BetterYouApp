import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export class BlockSlotDto {
  /** Accepted for older clients but ignored; the block is always the caller's. */
  @IsOptional()
  @IsString()
  practitionerId?: string;

  @IsIn(['day', 'slot'], { message: 'blockType must be "day" or "slot"' })
  blockType: 'day' | 'slot';

  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date: string;

  // Required for "slot" blocks; checked in the service. A "day" block sends null.
  @IsOptional()
  @Matches(TIME, { message: 'startTime must be HH:mm' })
  startTime?: string | null;

  @IsOptional()
  @Matches(TIME, { message: 'endTime must be HH:mm' })
  endTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
