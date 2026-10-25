import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlockSlotDto } from './dto/block-slot.dto';
import { AvailabilityService } from './availability.service';

import { Roles } from '../auth/decorators/roles.decorator';
import { CLINICAL_ROLES } from '../common/role.enum';
import { assertSelf, type AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule). A practitioner's blocked-out
// time is theirs alone, so every route is additionally scoped to the
// caller's own id — otherwise any clinician could view, create or delete
// another practitioner's calendar blocks.
@Roles(...CLINICAL_ROLES)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':practitionerId')
  fetchBlockedSlots(
    @Param('practitionerId') practitionerId: string,
    @Req() req: AuthedRequest,
  ) {
    assertSelf(req.user, practitionerId);
    return this.availabilityService.fetchBlockedSlots(practitionerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  blockSlot(@Body() dto: BlockSlotDto, @Req() req: AuthedRequest) {
    // The block always belongs to the caller — never a client-supplied id.
    return this.availabilityService.blockSlot(req.user.userId, dto);
  }

  @Delete(':blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBlock(@Param('blockId') blockId: string, @Req() req: AuthedRequest) {
    return this.availabilityService.deleteBlock(blockId, req.user.userId);
  }
}
