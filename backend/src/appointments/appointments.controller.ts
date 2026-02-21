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
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) { }

  @Get('practitioner/:id')
  getByPractitioner(@Param('id') id: string) {
    return this.appointmentsService.findByPractitioner(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    return this.appointmentsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.appointmentsService.updateById(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.appointmentsService.deleteById(id);
  }

  @Get('patient/:id')
  getByPatient(@Param('id') id: string) {
    return this.appointmentsService.findByPatient(id);
  }
}
