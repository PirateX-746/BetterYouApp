import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportService } from './support.service';
import { attachmentsInterceptor } from './support.controller';
import {
  AdminUpdateTicketDto,
  ListTicketsQuery,
  ReplyDto,
} from './dto/ticket.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';
import { AuditService } from '../audit/audit.service';
import { PlatformAdmin } from '../platform-admins/schemas/platform-admin.schema';

/** The platform team's side of Help & Support: every ticket, plus FAQ management. */
@Roles(Role.SUPER_ADMIN)
@Controller('admin/support')
export class SupportAdminController {
  constructor(
    private readonly support: SupportService,
    private readonly audit: AuditService,
    @InjectModel(PlatformAdmin.name)
    private readonly adminModel: Model<PlatformAdmin>,
  ) {}

  @Get('tickets')
  list(@Query() query: ListTicketsQuery) {
    return this.support.listAll(query);
  }

  @Get('tickets/:id')
  get(@Param('id') id: string) {
    return this.support.getAny(id);
  }

  @Post('tickets/:id/messages')
  @UseInterceptors(attachmentsInterceptor())
  async reply(
    @Param('id') id: string,
    @Body() dto: ReplyDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Req() req: AuthedRequest,
  ) {
    const admin = await this.adminModel
      .findById(req.user.userId)
      .select('name')
      .lean();
    return this.support.replyAny(
      id,
      dto,
      files ?? [],
      req.user,
      admin?.name ?? 'BetterYou Support',
    );
  }

  @Patch('tickets/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateTicketDto,
    @Req() req: AuthedRequest & Request,
  ) {
    const { before, after } = await this.support.updateAny(id, dto);
    await this.audit.record({
      practiceId: null,
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'support.ticket.update',
      entityType: 'SupportTicket',
      entityId: id,
      metadata: {
        ticketNo: before.ticketNo,
        ...(dto.status
          ? { status: { from: before.status, to: dto.status } }
          : {}),
        ...(dto.priority
          ? { priority: { from: before.priority, to: dto.priority } }
          : {}),
      },
      ipAddress: req.ip ?? undefined,
    });
    return after;
  }

  @Get('faqs')
  faqs() {
    return this.support.allFaqs();
  }

  @Post('faqs')
  async createFaq(
    @Body() dto: CreateFaqDto,
    @Req() req: AuthedRequest & Request,
  ) {
    const faq = await this.support.createFaq(dto);
    await this.auditFaq(req, 'support.faq.create', String(faq._id), {
      question: faq.question,
    });
    return faq;
  }

  @Patch('faqs/:id')
  async updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
    @Req() req: AuthedRequest & Request,
  ) {
    const faq = await this.support.updateFaq(id, dto);
    await this.auditFaq(req, 'support.faq.update', id, {
      fields: Object.keys(dto),
    });
    return faq;
  }

  @Delete('faqs/:id')
  async deleteFaq(
    @Param('id') id: string,
    @Req() req: AuthedRequest & Request,
  ) {
    const res = await this.support.deleteFaq(id);
    await this.auditFaq(req, 'support.faq.delete', id);
    return res;
  }

  private auditFaq(
    req: AuthedRequest & Request,
    action: string,
    id: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.audit.record({
      practiceId: null,
      actorId: req.user.userId,
      actorRole: req.user.role,
      action,
      entityType: 'Faq',
      entityId: id,
      metadata,
      ipAddress: req.ip ?? undefined,
    });
  }
}
