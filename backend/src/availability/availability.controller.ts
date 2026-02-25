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

@Controller('availability')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) { }

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
