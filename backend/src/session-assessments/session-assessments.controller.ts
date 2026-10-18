import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { SessionAssessmentsService } from './session-assessments.service';
import { AmendAssessmentDto, OpenAssessmentDto, PreviewSummaryDto, SaveDraftDto, SubmitAssessmentDto } from './dto/assessment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CLINICAL_ROLES } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

class RevisionDto {
  @IsInt()
  @Min(1)
  revision: number;
}

/**
 * Session assessment workspace. Clinical data — practitioners only. Writes
 * (open, save, summary, submit, amend) are limited to the appointment's own
 * practitioner; submitted assessments are readable across the practice.
 */
@Roles(...CLINICAL_ROLES)
@Controller('session-assessments')
export class SessionAssessmentsController {
  constructor(private readonly service: SessionAssessmentsService) {}

  /** The practice's active questionnaire. */
  @Get('template')
  template(@Req() req: AuthedRequest) {
    return this.service.activeTemplate(req.user.practiceId ?? null);
  }

  @Get('mine/drafts')
  myDrafts(@Req() req: AuthedRequest) {
    return this.service.myDrafts(req.user);
  }

  /** Recent started sessions with their assessment status. */
  @Get('mine/sessions')
  mySessions(@Req() req: AuthedRequest) {
    return this.service.mySessions(req.user);
  }

  @Get('appointment/:appointmentId')
  findByAppointment(@Param('appointmentId') appointmentId: string, @Req() req: AuthedRequest) {
    return this.service.findByAppointment(appointmentId, req.user);
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string, @Req() req: AuthedRequest) {
    return this.service.findByPatient(patientId, req.user);
  }

  /** Open (or create the draft for) an appointment's assessment. Idempotent. */
  @Post('open')
  open(@Body() dto: OpenAssessmentDto, @Req() req: AuthedRequest) {
    return this.service.open(dto.appointmentId, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.service.findOne(id, req.user);
  }

  /** Autosave / save draft. 409 if `revision` is stale. */
  @Patch(':id')
  save(@Param('id') id: string, @Body() dto: SaveDraftDto, @Req() req: AuthedRequest) {
    return this.service.saveDraft(id, dto, req.user);
  }

  @Post(':id/summary')
  summary(@Param('id') id: string, @Body() dto: RevisionDto, @Req() req: AuthedRequest) {
    return this.service.generateSummary(id, dto.revision, req.user);
  }

  @Post(':id/summary/preview')
  previewSummary(@Param('id') id: string, @Body() dto: PreviewSummaryDto, @Req() req: AuthedRequest) {
    return this.service.previewSummary(id, dto, req.user);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitAssessmentDto, @Req() req: AuthedRequest) {
    return this.service.submit(id, dto, req.user);
  }

  @Post(':id/amend')
  amend(@Param('id') id: string, @Body() dto: AmendAssessmentDto, @Req() req: AuthedRequest) {
    return this.service.amend(id, dto, req.user);
  }
}
