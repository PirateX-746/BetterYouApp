import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { PatientMedicationsService } from './patient-medications.service';
import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CLINICAL_ROLES } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(...CLINICAL_ROLES)
@Controller('patient-medications')
export class PatientMedicationsController {
  constructor(
    private readonly patientMedicationsService: PatientMedicationsService,
  ) {}

  @Post()
  create(@Body() dto: CreatePatientMedicationDto, @Req() req: AuthedRequest) {
    return this.patientMedicationsService.create(dto, req.user.practiceId ?? null);
  }

  @Get()
  findAll(
    @Query('patientId') patientId: string | undefined,
    @Query('practitionerId') practitionerId: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    const practiceId = req.user.practiceId ?? null;
    if (patientId)
      return this.patientMedicationsService.findByPatient(patientId, practiceId);
    if (practitionerId)
      return this.patientMedicationsService.findByPractitioner(practitionerId, practiceId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.patientMedicationsService.findById(id, req.user.practiceId ?? null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientMedicationDto, @Req() req: AuthedRequest) {
    return this.patientMedicationsService.update(id, dto, req.user.practiceId ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.patientMedicationsService.remove(id, req.user.practiceId ?? null);
  }
}
