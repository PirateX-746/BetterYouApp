import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';
import { PracticeStatus } from '../practices/schemas/practice.schema';
import {
  ChangePlanDto,
  CreatePracticeDto,
  InvitePractitionerDto,
  SetPracticeStatusDto,
  SetPractitionerStatusDto,
  UpdatePracticeDto,
} from './dto/create-practice.dto';

/**
 * Platform console API.
 *
 * `@Roles(Role.SUPER_ADMIN)` on the class means every route here is closed
 * to practice users, including practice admins — cross-tenant test 7. It is
 * enforced by RolesGuard against the role loaded from the database, not from
 * anything the client sends.
 */
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  private ip(req: Request): string | undefined {
    return req.ip ?? undefined;
  }

  @Get('metrics')
  metrics() {
    return this.admin.platformMetrics();
  }

  /* --------------------------- practices --------------------------- */

  @Get('practices')
  listPractices() {
    return this.admin.listPractices();
  }

  @Get('practices/:id')
  getPractice(@Param('id') id: string) {
    return this.admin.getPractice(id);
  }

  @Post('practices')
  createPractice(
    @Body() dto: CreatePracticeDto,
    @Req() req: AuthedRequest & Request,
  ) {
    return this.admin.createPractice(dto, req.user, this.ip(req));
  }

  @Patch('practices/:id')
  updatePractice(
    @Param('id') id: string,
    @Body() dto: UpdatePracticeDto,
    @Req() req: AuthedRequest & Request,
  ) {
    return this.admin.updatePractice(id, dto, req.user, this.ip(req));
  }

  @Patch('practices/:id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetPracticeStatusDto,
    @Req() req: AuthedRequest & Request,
  ) {
    return this.admin.setStatus(id, dto.status, req.user, this.ip(req));
  }

  @Post('practices/:id/suspend')
  suspend(@Param('id') id: string, @Req() req: AuthedRequest & Request) {
    return this.admin.setStatus(
      id,
      PracticeStatus.SUSPENDED,
      req.user,
      this.ip(req),
    );
  }

  @Post('practices/:id/reactivate')
  reactivate(@Param('id') id: string, @Req() req: AuthedRequest & Request) {
    return this.admin.setStatus(
      id,
      PracticeStatus.ACTIVE,
      req.user,
      this.ip(req),
    );
  }

  /** Soft delete — records are retained and recoverable. */
  @Delete('practices/:id')
  archive(@Param('id') id: string, @Req() req: AuthedRequest & Request) {
    return this.admin.archivePractice(id, req.user, this.ip(req));
  }

  /* ------------------------- subscriptions ------------------------- */

  @Get('subscriptions')
  subscriptions() {
    return this.admin.subscriptionOverview();
  }

  @Patch('practices/:id/plan')
  changePlan(
    @Param('id') id: string,
    @Body() dto: ChangePlanDto,
    @Req() req: AuthedRequest & Request,
  ) {
    return this.admin.changePlan(id, dto.plan, req.user, this.ip(req));
  }

  /* -------------------------- invitations -------------------------- */

  @Get('practices/:id/invitations')
  listInvitations(@Param('id') id: string) {
    return this.admin.listInvitations(id);
  }

  @Post('practices/:id/invitations')
  invite(
    @Param('id') id: string,
    @Body() dto: InvitePractitionerDto,
    @Req() req: AuthedRequest & Request,
  ) {
    return this.admin.invitePractitioner(id, dto, req.user, this.ip(req));
  }

  @Post('practices/:id/invitations/:inviteId/revoke')
  revokeInvitation(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
    @Req() req: AuthedRequest & Request,
  ) {
    return this.admin.revokeInvitation(id, inviteId, req.user, this.ip(req));
  }

  /* ------------------------- practitioners ------------------------- */

  @Get('practitioners')
  listPractitioners() {
    return this.admin.listPractitioners();
  }

  @Patch('practitioners/:id/status')
  setPractitionerStatus(
    @Param('id') id: string,
    @Body() dto: SetPractitionerStatusDto,
    @Req() req: AuthedRequest & Request,
  ) {
    return this.admin.setPractitionerStatus(
      id,
      dto.status,
      req.user,
      this.ip(req),
    );
  }

  /* --------------------------- audit log --------------------------- */

  @Get('audit-logs')
  auditLogs(@Query('limit') limit?: string) {
    const n = Math.min(Number(limit) || 100, 500);
    return this.audit.listPlatform(n);
  }
}
