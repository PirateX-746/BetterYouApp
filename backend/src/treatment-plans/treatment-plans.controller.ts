import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { TreatmentPlansService } from './treatment-plans.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CLINICAL_ROLES } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(...CLINICAL_ROLES)
@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly treatmentPlansService: TreatmentPlansService) {}

  @Post()
  create(@Body() dto: CreateTreatmentPlanDto, @Req() req: AuthedRequest) {
    return this.treatmentPlansService.create(dto, req.user.practiceId ?? null);
  }

  @Get()
  findAll(
    @Query('patientId') patientId: string | undefined,
    @Query('practitionerId') practitionerId: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    const practiceId = req.user.practiceId ?? null;
    if (patientId) return this.treatmentPlansService.findByPatient(patientId, practiceId);
    if (practitionerId) return this.treatmentPlansService.findByPractitioner(practitionerId, practiceId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.treatmentPlansService.findById(id, req.user.practiceId ?? null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTreatmentPlanDto, @Req() req: AuthedRequest) {
    return this.treatmentPlansService.update(id, dto, req.user.practiceId ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.treatmentPlansService.remove(id, req.user.practiceId ?? null);
  }
}
