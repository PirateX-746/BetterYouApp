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
} from '@nestjs/common';
import { AppointmentsService, AppointmentData } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('practitioner/:id')
  getByPractitioner(@Param('id') id: string) {
    return this.appointmentsService.findByPractitioner(id);
  }

  @Get('patient/:id')
  getByPatient(@Param('id') id: string) {
    return this.appointmentsService.findByPatient(id);
  }

  @Get('waiting-room/:practitionerId')
  getWaitingRoom(@Param('practitionerId') practitionerId: string) {
    return this.appointmentsService.getWaitingRoom(practitionerId);
  }

  @Get('availability')
  getAvailability(
    @Query('practitionerId') practitionerId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailability(date, practitionerId);
  }

  @Post()
  async create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto as unknown as AppointmentData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.appointmentsService.updateById(
      id,
      body as unknown as AppointmentData,
    );
  }

  @Patch(':id/check-in')
  checkIn(
    @Param('id') id: string,
    @Body('patientId') patientId: string,
  ) {
    return this.appointmentsService.checkIn(id, patientId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.appointmentsService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.appointmentsService.deleteById(id);
  }
}
