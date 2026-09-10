import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { FollowUpNotesService } from './follow-up-notes.service';
import { CreateFollowUpNoteDto } from './dto/create-follow-up-note.dto';
import { UpdateFollowUpNoteDto } from './dto/update-follow-up-note.dto';

@Controller('follow-up-notes')
export class FollowUpNotesController {
  constructor(private readonly followUpNotesService: FollowUpNotesService) {}

  @Post()
  create(@Body() dto: CreateFollowUpNoteDto) {
    return this.followUpNotesService.create(dto);
  }

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('practitionerId') practitionerId?: string,
  ) {
    if (patientId) return this.followUpNotesService.findByPatient(patientId);
    if (practitionerId) return this.followUpNotesService.findByPractitioner(practitionerId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.followUpNotesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFollowUpNoteDto) {
    return this.followUpNotesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.followUpNotesService.remove(id);
  }
}
