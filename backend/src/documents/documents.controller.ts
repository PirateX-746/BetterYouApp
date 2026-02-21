import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
} from '@nestjs/common';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
export class DocumentsController {

    constructor(private readonly documentsService: DocumentsService) { }

    @Post()
    create(@Body() dto: CreateDocumentDto) {
        return this.documentsService.create(dto);
    }

    // 🔥 Clean patient route
    @Get('patient/:patientId')
    findByPatient(@Param('patientId') patientId: string) {
        return this.documentsService.findByPatient(patientId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.documentsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
        return this.documentsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.documentsService.remove(id);
    }
}
