import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AppointmentTypesService } from './appointment-types.service';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CLINICAL_ROLES, Role } from '../common/role.enum';
import { isPractitioner, type AuthedRequest } from '../common/auth-user';

// Each practitioner configures their own list, so every write is scoped to
// the caller — the owner always comes from the token, never the body.
@Controller('appointment-types')
export class AppointmentTypesController {
  constructor(private readonly service: AppointmentTypesService) {}

  /**
   * Practitioners get their full list (inactive included, for Settings).
   * Patients pass ?practitionerId= and get that practitioner's bookable
   * types — active only, same practice only.
   */
  @Roles(...CLINICAL_ROLES, Role.PATIENT)
  @Get()
  findAll(
    @Req() req: AuthedRequest,
    @Query('practitionerId') practitionerId?: string,
  ) {
    if (isPractitioner(req.user)) {
      return this.service.findOwn(req.user.userId);
    }
    return this.service.findBookable(
      practitionerId ?? '',
      req.user.practiceId ?? null,
    );
  }

  @Roles(...CLINICAL_ROLES)
  @Post()
  create(@Body() dto: CreateAppointmentTypeDto, @Req() req: AuthedRequest) {
    return this.service.create(dto, req.user.userId);
  }

  @Roles(...CLINICAL_ROLES)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentTypeDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  @Roles(...CLINICAL_ROLES)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.service.remove(id, req.user.userId);
  }
}
