import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFaqDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  @MaxLength(200, { message: 'Question must be 200 characters or fewer' })
  question: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Answer is required' })
  @MaxLength(5000, { message: 'Answer must be 5000 characters or fewer' })
  answer: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  @MaxLength(40, { message: 'Category must be 40 characters or fewer' })
  category: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
