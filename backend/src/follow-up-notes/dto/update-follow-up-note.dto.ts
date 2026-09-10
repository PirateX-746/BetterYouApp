import { PartialType } from '@nestjs/mapped-types';
import { CreateFollowUpNoteDto } from './create-follow-up-note.dto';

export class UpdateFollowUpNoteDto extends PartialType(CreateFollowUpNoteDto) {}
