import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/role.enum';
import {
  Invitation,
  InvitationDocument,
  InvitationStatus,
} from './schemas/invitation.schema';
import { Practitioner } from '../practitioners/schemas/practitioner.schema';
import { Practice, PracticeDocument } from '../practices/schemas/practice.schema';

const TTL_DAYS = 7;
const SALT_ROUNDS = 10;

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectModel(Invitation.name)
    private readonly inviteModel: Model<InvitationDocument>,
    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<any>,
    @InjectModel(Practice.name)
    private readonly practiceModel: Model<PracticeDocument>,
  ) {}

  /**
   * Issues an invitation and returns the raw token ONCE. Nothing stores it,
   * so it cannot be recovered — reissue instead.
   */
  async invite(params: {
    practiceId: string;
    email: string;
    name: string;
    role: Role;
    invitedBy?: string;
  }) {
    const email = params.email.toLowerCase().trim();

    const alreadyStaff = await this.practitionerModel
      .findOne({ email, practiceId: new Types.ObjectId(params.practiceId) })
      .lean()
      .exec();
    if (alreadyStaff) {
      throw new ConflictException('That email already belongs to this practice');
    }

    // Supersede any outstanding invitation for the same address.
    await this.inviteModel
      .updateMany(
        {
          practiceId: new Types.ObjectId(params.practiceId),
          email,
          status: InvitationStatus.PENDING,
        },
        { status: InvitationStatus.REVOKED },
      )
      .exec();

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TTL_DAYS);

    const invite = await this.inviteModel.create({
      practiceId: new Types.ObjectId(params.practiceId),
      email,
      name: params.name.trim(),
      role: params.role,
      tokenHash: hashToken(rawToken),
      status: InvitationStatus.PENDING,
      expiresAt,
      invitedBy: params.invitedBy
        ? new Types.ObjectId(params.invitedBy)
        : null,
    });

    this.logger.log(`Invitation issued for ${email} (${params.role})`);

    return { invitation: invite, rawToken, expiresAt };
  }

  /** Look up a pending invitation by its raw token. */
  async lookup(rawToken: string) {
    const invite = await this.inviteModel
      .findOne({ tokenHash: hashToken(rawToken) })
      .exec();

    if (!invite) throw new BadRequestException('This invitation link is not valid');
    if (invite.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('This invitation has already been used');
    }
    if (invite.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('This invitation has been revoked');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      invite.status = InvitationStatus.EXPIRED;
      await invite.save();
      throw new BadRequestException('This invitation has expired');
    }

    const practice = await this.practiceModel.findById(invite.practiceId).exec();

    return {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      practiceName: practice?.name ?? null,
      practiceSubdomain: practice?.subdomain ?? null,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Accepts an invitation, creating the practitioner account with the
   * password the invitee chooses. No password is ever generated, emailed or
   * returned by the platform.
   */
  async accept(rawToken: string, password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const invite = await this.inviteModel
      .findOne({ tokenHash: hashToken(rawToken), status: InvitationStatus.PENDING })
      .exec();

    if (!invite) throw new BadRequestException('This invitation link is not valid');
    if (invite.expiresAt.getTime() < Date.now()) {
      invite.status = InvitationStatus.EXPIRED;
      await invite.save();
      throw new BadRequestException('This invitation has expired');
    }

    const [firstName, ...rest] = invite.name.split(' ');

    const practitioner = await this.practitionerModel.create({
      firstName,
      lastName: rest.join(' ') || '',
      email: invite.email,
      password: await bcrypt.hash(password, SALT_ROUNDS),
      role: invite.role,
      practiceId: invite.practiceId,
      isActive: true,
      mustChangePassword: false,
    });

    invite.status = InvitationStatus.ACCEPTED;
    invite.acceptedAt = new Date();
    await invite.save();

    // If the practice has no owner yet, the first admin to accept becomes it.
    if (invite.role === Role.PRACTICE_ADMIN) {
      await this.practiceModel
        // `$eq: null` matches both an explicit null and a missing field,
        // so this only claims ownership when nobody holds it.
        .updateOne(
          { _id: invite.practiceId, ownerId: null },
          { ownerId: practitioner._id },
        )
        .exec();
    }

    this.logger.log(`Invitation accepted by ${invite.email}`);
    return { id: String(practitioner._id), email: invite.email };
  }

  listForPractice(practiceId: string) {
    return this.inviteModel
      .find({ practiceId: new Types.ObjectId(practiceId) })
      .select('-tokenHash')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async revoke(id: string) {
    return this.inviteModel
      .findByIdAndUpdate(id, { status: InvitationStatus.REVOKED }, { new: true })
      .select('-tokenHash')
      .exec();
  }
}
