import {
  Controller,
  Get,
  Post,
  Put,
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.appointmentsService.deleteById(id);
  }
}
