import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../schemas/support-ticket.schema';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const BODY_MAX = 5000;

/** Multipart body for POST /support/tickets (files arrive separately). */
export class CreateTicketDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Subject must be at least 3 characters' })
  @MaxLength(120, { message: 'Subject must be 120 characters or fewer' })
  subject: string;

  @IsEnum(TicketCategory, { message: 'Choose a category' })
  category: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority, { message: 'Choose a priority' })
  priority?: TicketPriority;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Describe the problem or question' })
  @MaxLength(BODY_MAX, {
    message: `Message must be ${BODY_MAX} characters or fewer`,
  })
  body: string;
}

export class ReplyDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Reply cannot be empty' })
  @MaxLength(BODY_MAX, {
    message: `Reply must be ${BODY_MAX} characters or fewer`,
  })
  body: string;
}

export class AdminUpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class ListTicketsQuery {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}
