import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CLINICAL_ROLES } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(...CLINICAL_ROLES)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() dto: CreateDocumentDto, @Req() req: AuthedRequest) {
    return this.documentsService.create(dto, req.user.practiceId ?? null);
  }

  // 🔥 Clean patient route
  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string, @Req() req: AuthedRequest) {
    return this.documentsService.findByPatient(patientId, req.user.practiceId ?? null);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.documentsService.findOne(id, req.user.practiceId ?? null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Req() req: AuthedRequest) {
    return this.documentsService.update(id, dto, req.user.practiceId ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.documentsService.remove(id, req.user.practiceId ?? null);
  }
}
