import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PracticesService } from '../practices/practices.service';
import {
  Practice,
  PracticeDocument,
  PracticeStatus,
  RESERVED_SUBDOMAINS,
} from '../practices/schemas/practice.schema';
import { Patient } from '../patients/schemas/patient.schema';
import { Practitioner } from '../practitioners/schemas/practitioner.schema';
import { Appointment } from '../appointments/schemas/appointment.schema';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/role.enum';
import type { AuthUser } from '../common/auth-user';
import {
  CreatePracticeDto,
  UpdatePracticeDto,
} from './dto/create-practice.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InvitationsService } from '../invitations/invitations.service';
import { PlanKey } from '../subscriptions/schemas/plan.schema';

/**
 * Platform-console data access.
 *
 * Everything here is COUNTS AND METADATA ONLY. No method returns patient
 * names, notes, documents or diagnoses — a platform operator has no clinical
 * need, and keeping PHI out of this surface is what keeps the console
 * low-risk. If a future ticket asks for clinical data here, it needs its own
 * design and audit trail, not an extra field on one of these queries.
 */

/** One row of a `$group` by practice. */
type PracticeCount = { _id: unknown; n: number };
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(Practice.name)
    private readonly practiceModel: Model<PracticeDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<Patient>,
    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<Appointment>,
    private readonly practices: PracticesService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionsService,
    private readonly invitations: InvitationsService,
  ) {}

  /* ============================ metrics ============================ */

  async platformMetrics() {
    const [
      practicesTotal,
      practicesActive,
      practicesTrial,
      practicesSuspended,
      practitionersTotal,
      patientsTotal,
      appointmentsTotal,
    ] = await Promise.all([
      this.practiceModel.countDocuments({ deletedAt: null }),
      this.practiceModel.countDocuments({
        deletedAt: null,
        status: PracticeStatus.ACTIVE,
      }),
      this.practiceModel.countDocuments({
        deletedAt: null,
        status: PracticeStatus.TRIAL,
      }),
      this.practiceModel.countDocuments({
        deletedAt: null,
        status: PracticeStatus.SUSPENDED,
      }),
      this.practitionerModel.countDocuments({}),
      this.patientModel.countDocuments({}),
      this.appointmentModel.countDocuments({}),
    ]);

    return {
      practicesTotal,
      practicesActive,
      practicesTrial,
      practicesSuspended,
      practitionersTotal,
      patientsTotal,
      appointmentsTotal,
      signupsByMonth: await this.signupsByMonth(),
    };
  }

  /** New practices per month for the last six months. */
  private async signupsByMonth() {
    const start = new Date();
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const rows = await this.practiceModel.aggregate<{
      _id: { y: number; m: number };
      count: number;
    }>([
      { $match: { createdAt: { $gte: start }, deletedAt: null } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const byKey = new Map(rows.map((r) => [`${r._id.y}-${r._id.m}`, r.count]));
    const months: { month: string; count: number }[] = [];

    for (let i = 0; i < 6; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      months.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        count: byKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`) ?? 0,
      });
    }
    return months;
  }

  /* =========================== practices =========================== */

  /** Per-practice counts in one pass, rather than a query per row. */
  private async countsByPractice() {
    const [practitioners, patients, appointments] = await Promise.all([
      this.practitionerModel.aggregate<PracticeCount>([
        { $group: { _id: '$practiceId', n: { $sum: 1 } } },
      ]),
      this.patientModel.aggregate<PracticeCount>([
        { $group: { _id: '$practiceId', n: { $sum: 1 } } },
      ]),
      this.appointmentModel.aggregate<PracticeCount>([
        { $group: { _id: '$practiceId', n: { $sum: 1 } } },
      ]),
    ]);

    const toMap = (rows: PracticeCount[]) =>
      new Map(rows.map((r) => [String(r._id), r.n]));

    return {
      practitioners: toMap(practitioners),
      patients: toMap(patients),
      appointments: toMap(appointments),
    };
  }

  private shape(
    p: PracticeDocument,
    counts: Awaited<ReturnType<AdminService['countsByPractice']>>,
  ) {
    const key = String(p._id);
    return {
      id: key,
      name: p.name,
      subdomain: p.subdomain,
      status: p.status,
      email: p.email ?? null,
      phone: p.phone ?? null,
      timezone: p.timezone,
      logo: p.logo ?? null,
      practitioners: counts.practitioners.get(key) ?? 0,
      patients: counts.patients.get(key) ?? 0,
      appointments: counts.appointments.get(key) ?? 0,
      createdAt: (p as unknown as { createdAt: Date }).createdAt,
      updatedAt: (p as unknown as { updatedAt: Date }).updatedAt,
    };
  }

  async listPractices() {
    const [practices, counts, subs] = await Promise.all([
      this.practiceModel
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .exec(),
      this.countsByPractice(),
      this.subscriptions.listAll(),
    ]);

    const byPractice = new Map(subs.map((s) => [String(s.practiceId), s]));

    return practices.map((p) => {
      const sub = byPractice.get(String(p._id));
      return {
        ...this.shape(p, counts),
        plan: sub?.plan ?? null,
        subscriptionStatus: sub?.status ?? null,
        monthlyPrice: sub?.monthlyPrice ?? 0,
        renewsAt: sub?.renewsAt ?? null,
        trialEndsAt: sub?.trialEndsAt ?? null,
      };
    });
  }

  /** Platform revenue + plan catalogue for the subscriptions screen. */
  async subscriptionOverview() {
    const [plans, subs, practices, mrr] = await Promise.all([
      this.subscriptions.listPlans(),
      this.subscriptions.listAll(),
      this.practiceModel
        .find({ deletedAt: null })
        .select('_id name subdomain')
        .lean()
        .exec(),
      this.subscriptions.mrr(),
    ]);

    const byId = new Map(practices.map((p) => [String(p._id), p]));

    return {
      mrr,
      plans,
      subscriptions: subs.map((s) => {
        const practice = byId.get(String(s.practiceId));
        return {
          id: String(s._id),
          practiceId: String(s.practiceId),
          practiceName: practice?.name ?? null,
          plan: s.plan,
          status: s.status,
          monthlyPrice: s.monthlyPrice,
          startedAt: s.startedAt,
          renewsAt: s.renewsAt,
          trialEndsAt: s.trialEndsAt,
        };
      }),
    };
  }

  async changePlan(
    practiceId: string,
    plan: PlanKey,
    actor: AuthUser,
    ip?: string,
  ) {
    const updated = await this.subscriptions.changePlan(practiceId, plan);

    await this.audit.record({
      practiceId,
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'subscription.plan_changed',
      entityType: 'Subscription',
      entityId: String(updated._id),
      metadata: { plan },
      ipAddress: ip,
    });

    return updated;
  }

  /** Invite a practitioner or admin into a practice. */
  async invitePractitioner(
    practiceId: string,
    body: { email: string; name: string; role: Role },
    actor: AuthUser,
    ip?: string,
  ) {
    // Accepting creates an account in this practice, so it must be real.
    const practice = Types.ObjectId.isValid(practiceId)
      ? await this.practiceModel.exists({ _id: practiceId, deletedAt: null })
      : null;
    if (!practice) throw new NotFoundException('Practice not found');

    const { rawToken, expiresAt, invitation } = await this.invitations.invite({
      practiceId,
      email: body.email,
      name: body.name,
      role: body.role,
      invitedBy: actor.userId,
    });

    await this.audit.record({
      practiceId,
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'practitioner.invited',
      entityType: 'Invitation',
      entityId: String(invitation._id),
      metadata: { role: body.role },
      ipAddress: ip,
    });

    // The raw token is returned exactly once, for out-of-band delivery.
    return { email: invitation.email, token: rawToken, expiresAt };
  }

  listInvitations(practiceId: string) {
    return this.invitations.listForPractice(practiceId);
  }

  /** Revoke a pending invitation so its link can no longer be accepted. */
  async revokeInvitation(
    practiceId: string,
    inviteId: string,
    actor: AuthUser,
    ip?: string,
  ) {
    if (
      !Types.ObjectId.isValid(practiceId) ||
      !Types.ObjectId.isValid(inviteId)
    ) {
      throw new NotFoundException('Invitation not found');
    }
    const invitation = await this.invitations.revoke(inviteId, practiceId);
    if (!invitation) {
      throw new NotFoundException('No pending invitation found');
    }

    await this.audit.record({
      practiceId,
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'practitioner.invite_revoked',
      entityType: 'Invitation',
      entityId: inviteId,
      ipAddress: ip,
    });

    return invitation;
  }

  async getPractice(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid practice id');
    }

    const practice = await this.practiceModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
    if (!practice) throw new NotFoundException('TENANT_NOT_FOUND');

    const [counts, sub] = await Promise.all([
      this.countsByPractice(),
      this.subscriptions.forPractice(id),
    ]);

    // Team list is name/role/status only — no clinical association detail.
    const team = await this.practitionerModel
      .find({ practiceId: practice._id })
      .select('_id firstName lastName email role isActive createdAt')
      .lean()
      .exec();

    return {
      ...this.shape(practice, counts),
      plan: sub?.plan ?? null,
      subscriptionStatus: sub?.status ?? null,
      monthlyPrice: sub?.monthlyPrice ?? 0,
      renewsAt: sub?.renewsAt ?? null,
      trialEndsAt: sub?.trialEndsAt ?? null,
      team: team.map((t) => ({
        id: String(t._id),
        name: [t.firstName, t.lastName].filter(Boolean).join(' '),
        email: t.email,
        role: t.role,
        status: t.isActive === false ? 'DISABLED' : 'ACTIVE',
        joinedAt: t.createdAt,
      })),
    };
  }

  async createPractice(dto: CreatePracticeDto, actor: AuthUser, ip?: string) {
    const subdomain = dto.subdomain.toLowerCase().trim();

    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      throw new ConflictException(
        `"${subdomain}" is reserved for platform infrastructure`,
      );
    }

    const clash = await this.practiceModel.findOne({ subdomain }).exec();
    if (clash) {
      throw new ConflictException(`Subdomain "${subdomain}" is already taken`);
    }

    const practice = await this.practiceModel.create({
      name: dto.name.trim(),
      subdomain,
      status: dto.status ?? PracticeStatus.TRIAL,
      email: dto.ownerEmail.toLowerCase().trim(),
      phone: dto.phone,
      timezone: dto.timezone ?? 'Asia/Kolkata',
      deletedAt: null,
    });

    this.practices.invalidate(subdomain);

    await this.audit.record({
      practiceId: String(practice._id),
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'practice.created',
      entityType: 'Practice',
      entityId: String(practice._id),
      metadata: { subdomain, status: practice.status },
      ipAddress: ip,
    });

    await this.subscriptions.startTrial(String(practice._id), PlanKey.TRIAL);

    // Issue the owner's invitation. No password is created or emailed —
    // the raw token is returned ONCE so the console can show the link for
    // out-of-band delivery until a mail provider exists.
    const { rawToken, expiresAt } = await this.invitations.invite({
      practiceId: String(practice._id),
      email: dto.ownerEmail,
      name: dto.ownerName,
      role: Role.PRACTICE_ADMIN,
      invitedBy: actor.userId,
    });

    this.logger.log(`Practice created: ${subdomain}`);

    return {
      ...this.shape(practice, await this.countsByPractice()),
      invitation: {
        email: dto.ownerEmail.toLowerCase().trim(),
        token: rawToken,
        expiresAt,
        delivered: false,
      },
    };
  }

  async updatePractice(
    id: string,
    dto: UpdatePracticeDto,
    actor: AuthUser,
    ip?: string,
  ) {
    const practice = await this.practiceModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, dto, { new: true })
      .exec();
    if (!practice) throw new NotFoundException('TENANT_NOT_FOUND');

    this.practices.invalidate(practice.subdomain);

    await this.audit.record({
      practiceId: String(practice._id),
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'practice.updated',
      entityType: 'Practice',
      entityId: String(practice._id),
      metadata: { fields: Object.keys(dto) },
      ipAddress: ip,
    });

    return this.shape(practice, await this.countsByPractice());
  }

  async setStatus(
    id: string,
    status: PracticeStatus,
    actor: AuthUser,
    ip?: string,
  ) {
    const practice = await this.practices.setStatus(id, status);
    if (!practice) throw new NotFoundException('TENANT_NOT_FOUND');

    await this.audit.record({
      practiceId: String(practice._id),
      actorId: actor.userId,
      actorRole: actor.role,
      action: `practice.${status}`,
      entityType: 'Practice',
      entityId: String(practice._id),
      metadata: { status },
      ipAddress: ip,
    });

    this.logger.log(`Practice ${practice.subdomain} → ${status}`);
    return this.shape(practice, await this.countsByPractice());
  }

  /** Soft delete. Nothing here ever removes clinical records. */
  async archivePractice(id: string, actor: AuthUser, ip?: string) {
    const practice = await this.practiceModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date(), status: PracticeStatus.CANCELLED },
        { new: true },
      )
      .exec();
    if (!practice) throw new NotFoundException('TENANT_NOT_FOUND');

    this.practices.invalidate(practice.subdomain);

    await this.audit.record({
      practiceId: String(practice._id),
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'practice.archived',
      entityType: 'Practice',
      entityId: String(practice._id),
      metadata: { softDelete: true },
      ipAddress: ip,
    });

    return { id: String(practice._id), archived: true };
  }

  /* ========================= practitioners ========================= */

  /**
   * Disable or re-enable a practice member's account. A disabled account
   * can't sign in, and JwtStrategy / WsAuthService reject its existing
   * tokens on the next request or socket connect. Nothing is deleted.
   */
  async setPractitionerStatus(
    id: string,
    status: 'ACTIVE' | 'DISABLED',
    actor: AuthUser,
    ip?: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Practitioner not found');
    }
    const user = await this.practitionerModel
      .findByIdAndUpdate(id, { isActive: status === 'ACTIVE' }, { new: true })
      .select('_id practiceId isActive')
      .lean()
      .exec();
    if (!user) throw new NotFoundException('Practitioner not found');

    await this.audit.record({
      practiceId: user.practiceId ? String(user.practiceId) : undefined,
      actorId: actor.userId,
      actorRole: actor.role,
      action:
        status === 'ACTIVE' ? 'practitioner.enabled' : 'practitioner.disabled',
      entityType: 'Practitioner',
      entityId: id,
      ipAddress: ip,
    });

    return { id, status };
  }

  async listPractitioners() {
    const [rows, practices] = await Promise.all([
      this.practitionerModel
        .find({})
        .select(
          '_id firstName lastName email role isActive practiceId createdAt',
        )
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.practiceModel.find({}).select('_id name subdomain').lean().exec(),
    ]);

    const byId = new Map(practices.map((p) => [String(p._id), p]));

    const patientCounts = new Map(
      (
        await this.patientModel.aggregate<PracticeCount>([
          { $group: { _id: '$practiceId', n: { $sum: 1 } } },
        ])
      ).map((r) => [String(r._id), r.n]),
    );

    return rows.map((u) => {
      const practice = byId.get(String(u.practiceId));
      return {
        id: String(u._id),
        name: [u.firstName, u.lastName].filter(Boolean).join(' '),
        email: u.email,
        role: u.role,
        practiceName: practice?.name ?? null,
        practiceId: u.practiceId ? String(u.practiceId) : null,
        practiceSubdomain: practice?.subdomain ?? null,
        // Practice-level count; a per-practitioner caseload would need a
        // clinical association we do not model yet.
        patients: patientCounts.get(String(u.practiceId)) ?? 0,
        status: u.isActive === false ? 'DISABLED' : 'ACTIVE',
        joinedAt: u.createdAt,
      };
    });
  }
}
