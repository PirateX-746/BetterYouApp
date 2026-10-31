import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentsService, AppointmentData } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CLINICAL_ROLES } from '../common/role.enum';
import {
  assertSelf,
  assertSelfOrPractitioner,
  isPractitioner,
  type AuthedRequest,
} from '../common/auth-user';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * One-click confirm/cancel links from reminder emails (no sign-in; the
   * signed token is the credential). GET only describes — it never acts, so
   * link-scanning mail filters can't confirm or cancel; the page POSTs when
   * the patient taps.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('link/:token')
  previewLink(@Param('token') token: string) {
    return this.appointmentsService.previewLink(token);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('link/:token')
  @HttpCode(HttpStatus.OK)
  respondByLink(@Param('token') token: string) {
    return this.appointmentsService.respondByLink(token);
  }

  @Roles(...CLINICAL_ROLES)
  @Get('practitioner/:id')
  getByPractitioner(@Param('id') id: string, @Req() req: AuthedRequest) {
    assertSelf(req.user, id);
    return this.appointmentsService.findByPractitioner(id);
  }

  @Get('patient/:id')
  getByPatient(@Param('id') id: string, @Req() req: AuthedRequest) {
    assertSelfOrPractitioner(req.user, id);
    return this.appointmentsService.findByPatient(
      id,
      req.user.practiceId ?? null,
    );
  }

  @Roles(...CLINICAL_ROLES)
  @Get('waiting-room/:practitionerId')
  getWaitingRoom(
    @Param('practitionerId') practitionerId: string,
    @Req() req: AuthedRequest,
  ) {
    assertSelf(req.user, practitionerId);
    return this.appointmentsService.getWaitingRoom(practitionerId);
  }

  // Any signed-in user: patients need open slots in order to book.
  @Get('availability')
  getAvailability(
    @Query('practitionerId') practitionerId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailability(date, practitionerId);
  }

  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Req() req: AuthedRequest) {
    const data = dto as unknown as AppointmentData;

    // A patient may only book for themselves. The id is taken from the token,
    // so a tampered patientId in the body cannot book on someone else's behalf.
    if (!isPractitioner(req.user)) {
      data.patientId = req.user.userId;
    }

    return this.appointmentsService.create(data, req.user.practiceId ?? null);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ) {
    await this.appointmentsService.assertParticipant(id, req.user.userId);

    // Status is a clinical/scheduling determination (completed, no-show,
    // etc.) — a patient participant may reschedule their own appointment
    // through this route, but must not be able to set its status. That's
    // what @Patch(':id/status') is for, and it's practitioner-only.
    const data = { ...body } as Record<string, unknown>;
    if (!isPractitioner(req.user)) {
      delete data.status;
    }

    return this.appointmentsService.updateById(
      id,
      data as unknown as AppointmentData,
    );
  }

  @Patch(':id/check-in')
  async checkIn(
    @Param('id') id: string,
    @Body('patientId') patientId: string,
    @Req() req: AuthedRequest,
  ) {
    // A patient checks themselves in; a practitioner may check in the patient
    // named in the body. The service re-verifies the appointment belongs to
    // that patient.
    const subject = isPractitioner(req.user) ? patientId : req.user.userId;
    await this.appointmentsService.assertParticipant(id, req.user.userId);
    return this.appointmentsService.checkIn(id, subject);
  }

  /**
   * A patient confirming or cancelling their own appointment (the reminder
   * email sends them here). Practitioners use PATCH :id/status instead.
   */
  @Patch(':id/confirm')
  async confirm(@Param('id') id: string, @Req() req: AuthedRequest) {
    if (isPractitioner(req.user)) {
      throw new ForbiddenException('Use PATCH /appointments/:id/status');
    }
    return this.appointmentsService.respondAsPatient(
      id,
      req.user.userId,
      'confirm',
    );
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: AuthedRequest) {
    if (isPractitioner(req.user)) {
      throw new ForbiddenException('Use PATCH /appointments/:id/status');
    }
    return this.appointmentsService.respondAsPatient(
      id,
      req.user.userId,
      'cancel',
    );
  }

  @Roles(...CLINICAL_ROLES)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: AuthedRequest,
  ) {
    await this.appointmentsService.assertParticipant(id, req.user.userId);
    return this.appointmentsService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: AuthedRequest) {
    await this.appointmentsService.assertParticipant(id, req.user.userId);
    return this.appointmentsService.deleteById(id);
  }
}
