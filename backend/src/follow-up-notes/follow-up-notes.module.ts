import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowUpNote, FollowUpNoteSchema } from './schemas/follow-up-note.schema';
import { FollowUpNotesService } from './follow-up-notes.service';
import { FollowUpNotesController } from './follow-up-notes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FollowUpNote.name, schema: FollowUpNoteSchema }]),
  ],
  controllers: [FollowUpNotesController],
  providers: [FollowUpNotesService],
  exports: [FollowUpNotesService],
})
export class FollowUpNotesModule {}
