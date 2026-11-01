import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Patch,
  Req,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IsBoolean, IsOptional } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PRACTICE_MEMBER_ROLES, Role } from '../common/role.enum';
import type { AuthedRequest } from '../common/auth-user';
import { Practice } from './schemas/practice.schema';

export class UpdatePracticeSettingsDto {
  @IsOptional()
  @IsBoolean()
  patientEmailsEnabled?: boolean;
}

/**
 * Practice-wide settings a practice member can see and a clinician can
 * change from the practitioner Settings page.
 */
@Controller('practice/settings')
export class PracticeSettingsController {
  private readonly logger = new Logger(PracticeSettingsController.name);

  constructor(
    @InjectModel(Practice.name) private readonly practiceModel: Model<Practice>,
  ) {}

  /** The caller's practice, or the only practice in single-practice setups. */
  private async practiceFor(req: AuthedRequest) {
    const id = req.user.practiceId;
    const practice = id
      ? await this.practiceModel.findById(id)
      : await this.practiceModel
          .findOne({ deletedAt: null })
          .sort({ createdAt: 1 });
    if (!practice) throw new NotFoundException('Practice not found');
    return practice;
  }

  @Roles(...PRACTICE_MEMBER_ROLES)
  @Get()
  async get(@Req() req: AuthedRequest) {
    const p = await this.practiceFor(req);
    return {
      name: p.name,
      patientEmailsEnabled: p.patientEmailsEnabled !== false,
    };
  }

  @Roles(Role.PRACTICE_ADMIN, Role.PRACTITIONER)
  @Patch()
  async update(
    @Req() req: AuthedRequest,
    @Body() dto: UpdatePracticeSettingsDto,
  ) {
    if (dto.patientEmailsEnabled === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    const p = await this.practiceFor(req);
    p.patientEmailsEnabled = dto.patientEmailsEnabled;
    await p.save();
    this.logger.log(
      `Patient emails ${dto.patientEmailsEnabled ? 'enabled' : 'DISABLED'} for practice ${String(p._id)} by ${req.user.userId}`,
    );
    return {
      name: p.name,
      patientEmailsEnabled: p.patientEmailsEnabled !== false,
    };
  }
}
