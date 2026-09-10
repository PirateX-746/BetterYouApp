import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressNote, ProgressNoteSchema } from './schemas/progress-note.schema';
import { ProgressNotesService } from './progress-notes.service';
import { ProgressNotesController } from './progress-notes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProgressNote.name, schema: ProgressNoteSchema }]),
  ],
  controllers: [ProgressNotesController],
  providers: [ProgressNotesService],
  exports: [ProgressNotesService],
})
export class ProgressNotesModule {}
