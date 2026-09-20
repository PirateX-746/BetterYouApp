import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { FollowUpNotesService } from './follow-up-notes.service';
import { CreateFollowUpNoteDto } from './dto/create-follow-up-note.dto';
import { UpdateFollowUpNoteDto } from './dto/update-follow-up-note.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CLINICAL_ROLES } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(...CLINICAL_ROLES)
@Controller('follow-up-notes')
export class FollowUpNotesController {
  constructor(private readonly followUpNotesService: FollowUpNotesService) {}

  @Post()
  create(@Body() dto: CreateFollowUpNoteDto, @Req() req: AuthedRequest) {
    return this.followUpNotesService.create(dto, req.user.practiceId ?? null);
  }

  @Get()
  findAll(
    @Query('patientId') patientId: string | undefined,
    @Query('practitionerId') practitionerId: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    const practiceId = req.user.practiceId ?? null;
    if (patientId) return this.followUpNotesService.findByPatient(patientId, practiceId);
    if (practitionerId) return this.followUpNotesService.findByPractitioner(practitionerId, practiceId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.followUpNotesService.findById(id, req.user.practiceId ?? null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFollowUpNoteDto, @Req() req: AuthedRequest) {
    return this.followUpNotesService.update(id, dto, req.user.practiceId ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.followUpNotesService.remove(id, req.user.practiceId ?? null);
  }
}
