import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UPLOAD_LIMITS } from './document-file';

import { Roles } from '../auth/decorators/roles.decorator';
import { CLINICAL_ROLES } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

// Clinical data — practitioner-only. Authentication itself is enforced
// globally by JwtAuthGuard (see AppModule).
@Roles(...CLINICAL_ROLES)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() dto: CreateDocumentDto, @Req() req: AuthedRequest) {
    // The author is always the signed-in clinician.
    return this.documentsService.create(
      { ...dto, doctor: req.user.userId },
      req.user.practiceId ?? null,
    );
  }

  // 🔥 Clean patient route
  @Get('patient/:patientId')
  findByPatient(
    @Param('patientId') patientId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.documentsService.findByPatient(
      patientId,
      req.user.practiceId ?? null,
    );
  }

  /**
   * Scanned / uploaded PDF for a patient (multipart: `file` + metadata).
   * Patient comes from the route, uploader and practice from the session.
   * Memory storage: nothing is written to the server's disk, and multer
   * aborts as soon as the size limit is crossed.
   */
  @Post('patient/:patientId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.maxBytes, files: 1, fields: 20 },
    }),
  )
  async upload(
    @Param('patientId') patientId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.documentsService.upload(patientId, dto, file, req.user);
  }

  /** Streams the stored PDF after the same practice-scoped check as reads. */
  @Get(':id/file')
  async file(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.documentsService.openFile(id, req.user);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.size),
      'Content-Disposition': `inline; filename="${file.fileName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(file.stream);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.documentsService.findOne(id, req.user.practiceId ?? null);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.documentsService.update(id, dto, req.user.practiceId ?? null);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.documentsService.remove(id, req.user.practiceId ?? null);
  }
}
