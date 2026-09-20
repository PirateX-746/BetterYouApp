import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ProgressNotesService } from './progress-notes.service';
import { CreateProgressNoteDto } from './dto/create-progress-note.dto';
import { UpdateProgressNoteDto } from './dto/update-progress-note.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CLINICAL_ROLES } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(...CLINICAL_ROLES)
@Controller('progress-notes')
export class ProgressNotesController {
  constructor(private readonly progressNotesService: ProgressNotesService) {}

  @Post()
  create(@Body() dto: CreateProgressNoteDto, @Req() req: AuthedRequest) {
    return this.progressNotesService.create(dto, req.user.practiceId ?? null);
  }

  @Get()
  findAll(
    @Query('patientId') patientId: string | undefined,
    @Query('practitionerId') practitionerId: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    const practiceId = req.user.practiceId ?? null;
    if (patientId) return this.progressNotesService.findByPatient(patientId, practiceId);
    if (practitionerId) return this.progressNotesService.findByPractitioner(practitionerId, practiceId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.progressNotesService.findById(id, req.user.practiceId ?? null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProgressNoteDto, @Req() req: AuthedRequest) {
    return this.progressNotesService.update(id, dto, req.user.practiceId ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.progressNotesService.remove(id, req.user.practiceId ?? null);
  }
}
