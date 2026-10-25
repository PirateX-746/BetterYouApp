import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAppointmentTypeDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(60, { message: 'Name must be 60 characters or fewer' })
  name: string;

  @IsInt({ message: 'Duration must be a whole number of minutes' })
  @Min(5, { message: 'Duration must be at least 5 minutes' })
  @Max(480, { message: 'Duration cannot exceed 8 hours' })
  durationMinutes: number;

  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Color must be a hex value like #5b8def',
  })
  color: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
