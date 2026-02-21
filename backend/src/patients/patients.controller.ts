import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) { }

  @Get()
  async getAllPatients() {
    return this.patientsService.findAll();
  }

  @Get(':id')
  async getPatientById(@Param('id') id: string) {
    return this.patientsService.findById(id);
  }

  @Post()
  async createPatient(@Body() body: CreatePatientDto) {
    return this.patientsService.create(body);
  }
}
