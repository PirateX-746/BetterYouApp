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
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CLINICAL_ROLES } from '../common/role.enum';
import { assertSelf, type AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
//
// Each practitioner's medication library is personal to them (see the
// frontend's "Your medication library" copy) rather than practice-shared,
// so every route below is additionally scoped to the caller's own records —
// otherwise any signed-in clinician could read, edit or delete any other
// practitioner's library across any practice just by guessing an id.
@Roles(...CLINICAL_ROLES)
@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  create(@Body() dto: CreateMedicationDto, @Req() req: AuthedRequest) {
    // The owner is always the caller, never a client-supplied id — otherwise
    // a practitioner could plant an entry in someone else's library.
    return this.medicationsService.create({ ...dto, practitionerId: req.user.userId });
  }

  @Get()
  findAll(
    @Req() req: AuthedRequest,
    @Query('practitionerId') practitionerId?: string,
    @Query('search') search?: string,
  ) {
    if (!practitionerId) return [];
    assertSelf(req.user, practitionerId);
    return this.medicationsService.findByPractitioner(practitionerId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.medicationsService.findById(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
    @Req() req: AuthedRequest,
  ) {
    return this.medicationsService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.medicationsService.remove(id, req.user.userId);
  }
}
