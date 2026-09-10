import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import { PractitionersService } from './practitioners.service';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';
import { assertSelf, type AuthedRequest } from '../common/auth-user';

@Controller('practitioners')
export class PractitionersController {
  constructor(private readonly practitionersService: PractitionersService) {}

  // Readable by any signed-in user: patients need the practitioner list and
  // profile to book an appointment.
  @Get()
  findAll() {
    return this.practitionersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practitionersService.findById(id);
  }

  // A practitioner may only edit their own profile.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerDto,
    @Req() req: AuthedRequest,
  ) {
    assertSelf(req.user, id);
    return this.practitionersService.update(id, dto);
  }
}
