import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ProgressNotesService } from './progress-notes.service';
import { CreateProgressNoteDto } from './dto/create-progress-note.dto';
import { UpdateProgressNoteDto } from './dto/update-progress-note.dto';

@Controller('progress-notes')
export class ProgressNotesController {
  constructor(private readonly progressNotesService: ProgressNotesService) {}

  @Post()
  create(@Body() dto: CreateProgressNoteDto) {
    return this.progressNotesService.create(dto);
  }

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('practitionerId') practitionerId?: string,
  ) {
    if (patientId) return this.progressNotesService.findByPatient(patientId);
    if (practitionerId) return this.progressNotesService.findByPractitioner(practitionerId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.progressNotesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProgressNoteDto) {
    return this.progressNotesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.progressNotesService.remove(id);
  }
}
