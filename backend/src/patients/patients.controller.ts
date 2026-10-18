// src/patients/patients.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CLINICAL_ROLES } from '../common/role.enum';
import {
  assertSelfOrPractitioner,
  isPractitioner,
  type AuthedRequest,
} from '../common/auth-user';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Roles(...CLINICAL_ROLES)
  @Post()
  create(@Body() dto: CreatePatientDto, @Req() req: AuthedRequest) {
    return this.patientsService.create(dto, req.user.practiceId ?? null);
  }

  // The full roster is practitioner-only; a patient must never be able to
  // enumerate other patients.
  @Roles(...CLINICAL_ROLES)
  @Get()
  findAll(@Req() req: AuthedRequest) {
    return this.patientsService.findAll(req.user.practiceId ?? null);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: AuthedRequest) {
    assertSelfOrPractitioner(req.user, id);
    return this.patientsService.findById(id, req.user.practiceId ?? null);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req: AuthedRequest,
  ) {
    assertSelfOrPractitioner(req.user, id);
    // Deactivation is the practice's decision; a patient can't reactivate
    // (or deactivate) their own record.
    if (!isPractitioner(req.user)) delete dto.isActive;
    return this.patientsService.update(id, dto, req.user.practiceId ?? null);
  }

  /** Lost or expired temporary password: issue a new one to hand over. */
  @Roles(...CLINICAL_ROLES)
  @Post(':id/temporary-password')
  issueTemporaryPassword(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.patientsService.issueTemporaryPassword(
      id,
      req.user.practiceId ?? null,
    );
  }

  @Post(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: AuthedRequest,
  ) {
    assertSelfOrPractitioner(req.user, id);
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException(
        'currentPassword and newPassword are required',
      );
    }
    if (body.newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters',
      );
    }
    return this.patientsService.changePassword(
      id,
      body.currentPassword,
      body.newPassword,
      req.user.practiceId ?? null,
    );
  }
}
