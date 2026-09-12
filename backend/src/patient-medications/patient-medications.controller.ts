import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PatientMedicationsService } from './patient-medications.service';
import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CLINICAL_ROLES } from '../common/role.enum';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(...CLINICAL_ROLES)
@Controller('patient-medications')
export class PatientMedicationsController {
  constructor(
    private readonly patientMedicationsService: PatientMedicationsService,
  ) {}

  @Post()
  create(@Body() dto: CreatePatientMedicationDto) {
    return this.patientMedicationsService.create(dto);
  }

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('practitionerId') practitionerId?: string,
  ) {
    if (patientId)
      return this.patientMedicationsService.findByPatient(patientId);
    if (practitionerId)
      return this.patientMedicationsService.findByPractitioner(practitionerId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientMedicationsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientMedicationDto) {
    return this.patientMedicationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientMedicationsService.remove(id);
  }
}
