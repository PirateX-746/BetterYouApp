import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/role.enum';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(Role.PRACTITIONER)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':practitionerId')
  fetchBlockedSlots(@Param('practitionerId') practitionerId: string) {
    return this.availabilityService.fetchBlockedSlots(practitionerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  blockSlot(@Body() body: any) {
    return this.availabilityService.blockSlot(body);
  }

  @Delete(':blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBlock(@Param('blockId') blockId: string) {
    return this.availabilityService.deleteBlock(blockId);
  }
}
