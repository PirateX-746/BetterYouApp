import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import { PractitionersService } from './practitioners.service';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';
import { assertSelf, type AuthedRequest } from '../common/auth-user';

@Controller('practitioners')
export class PractitionersController {
  constructor(private readonly practitionersService: PractitionersService) {}

  // Readable by any signed-in user: patients need the practitioner list and
  // profile to book an appointment. Still scoped to the caller's own
  // practice — otherwise a signed-in user could enumerate every
  // practitioner (name, email, hours) across every practice on the
  // platform, not just their own.
  @Get()
  findAll(@Req() req: AuthedRequest) {
    return this.practitionersService.findAll(req.user.practiceId ?? null);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.practitionersService.findById(id, req.user.practiceId ?? null);
  }

  // A practitioner may only edit their own profile.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerDto,
    @Req() req: AuthedRequest,
  ) {
    assertSelf(req.user, id);
    return this.practitionersService.update(id, dto, req.user.practiceId ?? null);
  }
}
