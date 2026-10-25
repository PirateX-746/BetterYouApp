import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { SupportService } from './support.service';
import { CreateTicketDto, ReplyDto } from './dto/ticket.dto';
import { ATTACHMENT_LIMITS } from './support-attachment';
import { Roles } from '../auth/decorators/roles.decorator';
import { PRACTICE_MEMBER_ROLES, Role } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';

/**
 * Memory storage (nothing touches the server's disk) with multer aborting
 * as soon as a file crosses the size cap. Content type is checked from the
 * bytes in SupportService, never from the browser's claim.
 */
export const attachmentsInterceptor = () =>
  FilesInterceptor('files', ATTACHMENT_LIMITS.maxFiles, {
    storage: memoryStorage(),
    limits: {
      fileSize: ATTACHMENT_LIMITS.maxBytes,
      files: ATTACHMENT_LIMITS.maxFiles,
      fields: 10,
    },
  });

/** Help & Support for practice staff: FAQs and their own tickets only. */
@Roles(...PRACTICE_MEMBER_ROLES)
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('faqs')
  faqs() {
    return this.support.publishedFaqs();
  }

  @Get('tickets')
  list(@Req() req: AuthedRequest) {
    return this.support.listOwn(req.user);
  }

  @Post('tickets')
  @UseInterceptors(attachmentsInterceptor())
  create(
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.support.createTicket(dto, files ?? [], req.user);
  }

  @Get('tickets/:id')
  get(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.support.getOwn(id, req.user);
  }

  @Post('tickets/:id/messages')
  @UseInterceptors(attachmentsInterceptor())
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.support.replyOwn(id, dto, files ?? [], req.user);
  }

  @Patch('tickets/:id/close')
  close(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.support.closeOwn(id, req.user);
  }

  /**
   * Shared by both sides; SupportService checks the caller is the ticket's
   * requester or a platform admin. Always a download, never rendered inline.
   */
  @Roles(...PRACTICE_MEMBER_ROLES, Role.SUPER_ADMIN)
  @Get('attachments/:messageId/:attachmentId')
  async attachment(
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.support.openAttachment(
      messageId,
      attachmentId,
      req.user,
    );
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(file.stream);
  }
}
