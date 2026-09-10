import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { PractitionersService } from './practitioners.service';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';

@Controller('practitioners')
export class PractitionersController {
  constructor(private readonly practitionersService: PractitionersService) {}

  @Get()
  findAll() {
    return this.practitionersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practitionersService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePractitionerDto) {
    return this.practitionersService.update(id, dto);
  }
}
