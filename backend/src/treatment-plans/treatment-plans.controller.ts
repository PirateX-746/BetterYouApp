import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { TreatmentPlansService } from './treatment-plans.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/role.enum';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(Role.PRACTITIONER)
@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly treatmentPlansService: TreatmentPlansService) {}

  @Post()
  create(@Body() dto: CreateTreatmentPlanDto) {
    return this.treatmentPlansService.create(dto);
  }

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('practitionerId') practitionerId?: string,
  ) {
    if (patientId) return this.treatmentPlansService.findByPatient(patientId);
    if (practitionerId) return this.treatmentPlansService.findByPractitioner(practitionerId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.treatmentPlansService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTreatmentPlanDto) {
    return this.treatmentPlansService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.treatmentPlansService.remove(id);
  }
}
