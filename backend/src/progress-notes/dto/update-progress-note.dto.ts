import { PartialType } from '@nestjs/mapped-types';
import { CreateProgressNoteDto } from './create-progress-note.dto';

export class UpdateProgressNoteDto extends PartialType(CreateProgressNoteDto) {}
