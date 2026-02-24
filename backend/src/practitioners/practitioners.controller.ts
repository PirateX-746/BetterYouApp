import { Controller, Get, Param } from '@nestjs/common';
import { PractitionersService } from './practitioners.service';

@Controller('practitioners')
export class PractitionersController {
    constructor(private readonly practitionersService: PractitionersService) { }

    @Get()
    findAll() {
        return this.practitionersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.practitionersService.findById(id);
    }
}
