import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Document, Model, Types } from 'mongoose';
import {
  AssessmentResponse,
  AssessmentStatus,
  AssessmentSummary,
  SessionAssessment,
} from './schemas/session-assessment.schema';
import {
  AssessmentTemplate,
  TemplateSection,
} from './schemas/assessment-template.schema';
import {
  AmendAssessmentDto,
  ResponseDto,
  SaveDraftDto,
  SubmitAssessmentDto,
} from './dto/assessment.dto';
import {
  DEFAULT_SECTIONS,
  DEFAULT_TEMPLATE_KEY,
  DEFAULT_TEMPLATE_NAME,
} from './assessment-template.defaults';
import { SummaryGenerator, TemplateSummaryGenerator } from './summary';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
} from '../appointments/schemas/appointment.schema';
import {
  DocumentStatus,
  DocumentType,
  MedicalDocument,
} from '../documents/schemas/document.schema';
import { Patient } from '../patients/schemas/patient.schema';
import { practiceScopeFilter } from '../common/tenancy/practice-scope';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';

const EDITABLE = [AssessmentStatus.DRAFT, AssessmentStatus.READY_FOR_REVIEW];
const FINAL = [AssessmentStatus.SUBMITTED, AssessmentStatus.AMENDED];
const isDup = (e: unknown) => (e as { code?: number })?.code === 11000;

/** A plain (lean) record: the schema's fields without Mongoose document methods. */
type Lean<T> = Omit<T, keyof Document> & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

/** What listRow reads; the three refs may be populated, so they pass through as-is. */
type AssessmentRow = Pick<
  Lean<SessionAssessment>,
  | '_id'
  | 'format'
  | 'status'
  | 'revision'
  | 'documentId'
  | 'summary'
  | 'submittedAt'
  | 'updatedAt'
  | 'amendments'
  | 'feedback'
  | 'followUpRequired'
> & { appointmentId: unknown; patientId: unknown; practitionerId: unknown };

@Injectable()
export class SessionAssessmentsService {
  private readonly logger = new Logger(SessionAssessmentsService.name);
  /** Swap for an AI-backed generator once one is configured and approved. */
  private readonly summaries: SummaryGenerator = new TemplateSummaryGenerator();

  constructor(
    @InjectModel(SessionAssessment.name)
    private readonly assessmentModel: Model<SessionAssessment>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(AssessmentTemplate.name)
    private readonly templateModel: Model<AssessmentTemplate>,
    @InjectModel(MedicalDocument.name)
    private readonly documentModel: Model<MedicalDocument>,
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
    @InjectConnection() private readonly connection: Connection,
    private readonly audit: AuditService,
  ) {}

  /* ═════════════ templates ═════════════ */

  /** The practice's active questionnaire, seeding the default the first time. */
  async activeTemplate(
    practiceId: string | null,
  ): Promise<Lean<AssessmentTemplate>> {
    const scope =
      practiceId && Types.ObjectId.isValid(practiceId)
        ? { practiceId: new Types.ObjectId(practiceId) }
        : { practiceId: null };
    const found = await this.templateModel
      .findOne({ ...scope, key: DEFAULT_TEMPLATE_KEY, isActive: true })
      .sort({ version: -1 })
      .lean();
    if (found) return found as Lean<AssessmentTemplate>;
    try {
      await this.templateModel.create({
        ...scope,
        key: DEFAULT_TEMPLATE_KEY,
        version: 1,
        name: DEFAULT_TEMPLATE_NAME,
        sections: DEFAULT_SECTIONS,
        isActive: true,
      } as never);
    } catch (e) {
      if (!isDup(e)) throw e; // another request seeded it first
    }
    return (await this.templateModel
      .findOne({ ...scope, key: DEFAULT_TEMPLATE_KEY, isActive: true })
      .sort({ version: -1 })
      .lean()) as Lean<AssessmentTemplate>;
  }

  /** The exact template version an assessment was filled against. */
  private async templateOf(
    a: Lean<SessionAssessment>,
  ): Promise<TemplateSection[]> {
    if (a.templateKey && a.templateVersion) {
      const t = await this.templateModel
        .findOne({
          practiceId: a.practiceId ?? null,
          key: a.templateKey,
          version: a.templateVersion,
        })
        .lean();
      if (t) return t.sections;
    }
    return (
      await this.activeTemplate(a.practiceId ? String(a.practiceId) : null)
    ).sections;
  }

  /* ═════════════ loading & authorization ═════════════ */

  /** Appointment in the caller's practice that the caller is the practitioner of. */
  private async ownAppointment(
    appointmentId: string,
    user: AuthUser,
  ): Promise<AppointmentDocument> {
    if (!Types.ObjectId.isValid(appointmentId))
      throw new BadRequestException('Invalid appointment ID');
    const appt = await this.appointmentModel.findOne({
      _id: new Types.ObjectId(appointmentId),
      ...practiceScopeFilter(user.practiceId ?? null),
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (String(appt.practitionerId) !== user.userId) {
      throw new ForbiddenException(
        'Only the practitioner of this appointment can assess it',
      );
    }
    return appt;
  }

  /** A v2 assessment the caller authored, in their practice. */
  private async ownAssessment(
    id: string,
    user: AuthUser,
  ): Promise<Lean<SessionAssessment>> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    const a = (await this.assessmentModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...practiceScopeFilter(user.practiceId ?? null),
      })
      .lean()) as Lean<SessionAssessment> | null;
    // 404 (not 403) for someone else's assessment, so ids can't be probed.
    if (!a || String(a.practitionerId) !== user.userId)
      throw new NotFoundException('Assessment not found');
    if (a.format !== 'v2')
      throw new ConflictException(
        'This assessment was recorded in the old format and is read-only',
      );
    return a;
  }

  /* ═════════════ open / read ═════════════ */

  /**
   * Opens the assessment for an appointment, creating the draft on first
   * open. Idempotent: two tabs (or two clicks) get the same record.
   */
  async open(appointmentId: string, user: AuthUser) {
    const appt = await this.ownAppointment(appointmentId, user);
    const existing = (await this.assessmentModel
      .findOne({ appointmentId: appt._id })
      .lean()) as Lean<SessionAssessment> | null;
    if (existing) return this.bundle(existing, user);

    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        `This appointment was ${appt.status === AppointmentStatus.NO_SHOW ? 'a no-show' : 'cancelled'}, so it can't be assessed`,
      );
    }
    if (appt.start.getTime() > Date.now()) {
      throw new BadRequestException(
        'Assessments open once the session has started',
      );
    }

    const tpl = await this.activeTemplate(user.practiceId ?? null);
    let created: Lean<SessionAssessment>;
    try {
      const doc = await this.assessmentModel.create({
        practiceId: appt.practiceId,
        appointmentId: appt._id,
        patientId: appt.patientId,
        practitionerId: appt.practitionerId,
        format: 'v2',
        templateKey: tpl.key,
        templateVersion: tpl.version,
        status: AssessmentStatus.DRAFT,
        revision: 1,
        responses: [],
        lastSavedAt: new Date(),
      });
      created = doc.toObject() as Lean<SessionAssessment>;
      void this.log(user, 'session_assessment.create', String(created._id));
    } catch (e) {
      if (!isDup(e)) throw e;
      created = (await this.assessmentModel
        .findOne({ appointmentId: appt._id })
        .lean()) as Lean<SessionAssessment>;
    }
    return this.bundle(created, user);
  }

  async findOne(id: string, user: AuthUser) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    const a = (await this.assessmentModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...practiceScopeFilter(user.practiceId ?? null),
      })
      .lean()) as Lean<SessionAssessment> | null;
    if (!a || !this.canRead(a, user))
      throw new NotFoundException('Assessment not found');
    if (FINAL.includes(a.status) && String(a.practitionerId) !== user.userId) {
      void this.log(user, 'session_assessment.view', id);
    }
    return this.bundle(a, user);
  }

  /** The caller's unfinished assessments, newest first. */
  async myDrafts(user: AuthUser) {
    const rows = await this.assessmentModel
      .find({
        practitionerId: new Types.ObjectId(user.userId),
        format: 'v2',
        status: { $in: EDITABLE },
        ...practiceScopeFilter(user.practiceId ?? null),
      })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('patientId', 'firstName lastName')
      .populate('appointmentId', 'title start end status')
      .lean();
    return rows.map((r) => this.listRow(r));
  }

  /**
   * The caller's sessions from the last `days` days that have started (so can
   * be assessed), newest first, each with its assessment status — the
   * workspace launcher's list.
   */
  async mySessions(user: AuthUser, days = 14) {
    const since = new Date(Date.now() - days * 86400000);
    const appts = await this.appointmentModel
      .find({
        practitionerId: new Types.ObjectId(user.userId),
        ...practiceScopeFilter(user.practiceId ?? null),
        start: { $gte: since, $lte: new Date() },
        status: {
          $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
      })
      .sort({ start: -1 })
      .limit(250) // the launcher pages client-side
      .populate('patientId', 'firstName lastName')
      .select('title start end status patientId')
      .lean();
    const assessed = await this.assessmentModel
      .find({ appointmentId: { $in: appts.map((x) => x._id) } })
      .select('appointmentId status format')
      .lean();
    const byAppt = new Map(assessed.map((x) => [String(x.appointmentId), x]));
    return appts.map((x) => {
      const as = byAppt.get(String(x._id));
      return {
        appointmentId: String(x._id),
        title: x.title,
        start: x.start,
        end: x.end,
        appointmentStatus: x.status,
        patient: x.patientId,
        assessmentId: as ? String(as._id) : null,
        assessmentStatus: as
          ? as.format === 'v2'
            ? as.status
            : 'submitted'
          : null,
      };
    });
  }

  async findByAppointment(appointmentId: string, user: AuthUser) {
    if (!Types.ObjectId.isValid(appointmentId))
      throw new BadRequestException('Invalid appointment ID');
    const a = (await this.assessmentModel
      .findOne({
        appointmentId: new Types.ObjectId(appointmentId),
        ...practiceScopeFilter(user.practiceId ?? null),
      })
      .lean()) as Lean<SessionAssessment> | null;
    if (!a || !this.canRead(a, user)) return null;
    return this.listRow(a);
  }

  async findByPatient(patientId: string, user: AuthUser) {
    if (!Types.ObjectId.isValid(patientId))
      throw new BadRequestException('Invalid patient ID');
    const rows = await this.assessmentModel
      .find({
        patientId: new Types.ObjectId(patientId),
        ...practiceScopeFilter(user.practiceId ?? null),
        // Others' drafts stay private to their author.
        $or: [
          { status: { $in: FINAL } },
          { format: { $ne: 'v2' } },
          { practitionerId: new Types.ObjectId(user.userId) },
        ],
      })
      .sort({ createdAt: -1 })
      .populate('practitionerId', 'firstName lastName')
      .populate('appointmentId', 'title start end status')
      .lean();
    return rows.map((r) => this.listRow(r));
  }

  /* ═════════════ write ═════════════ */

  async saveDraft(id: string, dto: SaveDraftDto, user: AuthUser) {
    const a = await this.ownAssessment(id, user);
    if (FINAL.includes(a.status)) {
      throw new ConflictException(
        'This assessment has been submitted. Use Amend to make a correction.',
      );
    }
    const set = await this.changes(a, dto);
    if (dto.status) set.status = dto.status;
    const updated = await this.assessmentModel
      .findOneAndUpdate(
        { _id: a._id, revision: dto.revision, status: { $in: EDITABLE } },
        { $set: set, $inc: { revision: 1 } },
        { new: true },
      )
      .lean();
    if (!updated) throw await this.conflict(a._id);
    return this.bundle(updated as Lean<SessionAssessment>, user);
  }

  /** Generates (and saves) a template summary of the current draft. */
  async generateSummary(id: string, revision: number, user: AuthUser) {
    const a = await this.ownAssessment(id, user);
    if (FINAL.includes(a.status))
      throw new ConflictException('Use Amend to change a submitted assessment');
    const text = await this.summaryText(a);
    const summary: AssessmentSummary = {
      text,
      generatedBy: this.summaries.kind,
      generatedAt: new Date(),
      edited: false,
      approved: false,
    };
    const updated = await this.assessmentModel
      .findOneAndUpdate(
        { _id: a._id, revision, status: { $in: EDITABLE } },
        { $set: { summary, lastSavedAt: new Date() }, $inc: { revision: 1 } },
        { new: true },
      )
      .lean();
    if (!updated) throw await this.conflict(a._id);
    return this.bundle(updated as Lean<SessionAssessment>, user);
  }

  /**
   * Summary text only, nothing saved — used while amending, from the edits
   * on screen (validated like a save) rather than the stored answers.
   */
  async previewSummary(
    id: string,
    dto: { responses?: ResponseDto[]; notes?: string },
    user: AuthUser,
  ) {
    const a = await this.ownAssessment(id, user);
    const draft = {
      ...a,
      responses: dto.responses
        ? this.cleanResponses(dto.responses, await this.templateOf(a))
        : a.responses,
      notes: dto.notes ?? a.notes,
    };
    return {
      text: await this.summaryText(draft),
      generatedBy: this.summaries.kind,
    };
  }

  /**
   * Submits: marks the assessment submitted and files it as a patient
   * document in one transaction. Idempotent — a repeat (double click,
   * retry after a timeout) returns the existing result, never a duplicate.
   */
  async submit(id: string, dto: SubmitAssessmentDto, user: AuthUser) {
    const a = await this.ownAssessment(id, user);
    if (FINAL.includes(a.status) && a.documentId) return this.bundle(a, user);
    if (a.revision !== dto.revision) throw await this.conflict(a._id);
    if (a.summary?.text?.trim() && !a.summary.approved) {
      throw new BadRequestException(
        'Review and approve the summary (or clear it) before submitting',
      );
    }
    const hasContent =
      (a.notes ?? '').trim().length > 0 ||
      a.responses.some(
        (r) =>
          r.state !== 'blank' || (r.text ?? '').trim() || (r.note ?? '').trim(),
      );
    if (!hasContent)
      throw new BadRequestException(
        'Record at least one observation or note before submitting',
      );

    const appt = await this.appointmentModel.findById(a.appointmentId).lean();
    if (!appt) throw new NotFoundException('Appointment not found');
    const sections = await this.templateOf(a);
    const submittedAt = new Date();

    try {
      await this.atomic(async (session) => {
        const claimed = await this.assessmentModel.findOneAndUpdate(
          { _id: a._id, revision: dto.revision, status: { $in: EDITABLE } },
          {
            $set: {
              status: AssessmentStatus.SUBMITTED,
              submittedAt,
              lastSavedAt: submittedAt,
            },
            $inc: { revision: 1 },
          },
          { new: true, session },
        );
        if (!claimed) throw new ConflictException('STALE');
        const [doc] = await this.documentModel.create(
          [
            {
              practiceId: a.practiceId,
              type: DocumentType.SESSION_ASSESSMENT,
              date: appt.start,
              doctor: a.practitionerId,
              patient: a.patientId,
              status: DocumentStatus.FINALIZED,
              title: `Session assessment — ${appt.title}`,
              content: this.snapshot(
                { ...a, status: AssessmentStatus.SUBMITTED, submittedAt },
                appt,
                sections,
              ),
            },
          ],
          { session },
        );
        await this.assessmentModel.updateOne(
          { _id: a._id },
          { $set: { documentId: doc._id } },
          { session },
        );
        return doc._id;
      });
    } catch (e) {
      if (e instanceof ConflictException) {
        // Lost a race with a concurrent submit: return what won.
        const now = (await this.assessmentModel
          .findById(a._id)
          .lean()) as Lean<SessionAssessment> | null;
        if (now && FINAL.includes(now.status) && now.documentId)
          return this.bundle(now, user);
        throw await this.conflict(a._id);
      }
      throw e;
    }

    void this.log(user, 'session_assessment.submit', id);
    return this.bundle(
      (await this.assessmentModel
        .findById(a._id)
        .lean()) as Lean<SessionAssessment>,
      user,
    );
  }

  /**
   * Corrects a submitted assessment. Author only, with a reason; the prior
   * content is kept in `amendments` and the patient document is updated in
   * the same transaction.
   */
  async amend(id: string, dto: AmendAssessmentDto, user: AuthUser) {
    const a = await this.ownAssessment(id, user);
    if (!FINAL.includes(a.status)) {
      throw new BadRequestException(
        'Only submitted assessments can be amended — edit the draft instead',
      );
    }
    const set = await this.changes(a, dto);
    if (
      set.summary &&
      (set.summary as AssessmentSummary).text?.trim() &&
      !(set.summary as AssessmentSummary).approved
    ) {
      throw new BadRequestException(
        'Approve the updated summary before saving the amendment',
      );
    }
    const appt = await this.appointmentModel.findById(a.appointmentId).lean();
    if (!appt) throw new NotFoundException('Appointment not found');
    const sections = await this.templateOf(a);
    const amendment = {
      version: (a.amendments?.length ?? 0) + 1,
      at: new Date(),
      by: new Types.ObjectId(user.userId),
      reason: dto.reason.trim(),
      previous: {
        responses: a.responses,
        notes: a.notes,
        summary: a.summary ?? null,
      },
    };

    await this.atomic(async (session) => {
      const updated = await this.assessmentModel.findOneAndUpdate(
        { _id: a._id, revision: dto.revision, status: { $in: FINAL } },
        {
          $set: { ...set, status: AssessmentStatus.AMENDED },
          $push: { amendments: amendment },
          $inc: { revision: 1 },
        },
        { new: true, session },
      );
      if (!updated) throw await this.conflict(a._id);
      const next = updated.toObject() as Lean<SessionAssessment>;
      if (next.documentId) {
        await this.documentModel.updateOne(
          { _id: next.documentId },
          { $set: { content: this.snapshot(next, appt, sections) } },
          { session },
        );
      }
    });

    void this.log(user, 'session_assessment.amend', id, {
      amendment: amendment.version,
    });
    return this.bundle(
      (await this.assessmentModel
        .findById(a._id)
        .lean()) as Lean<SessionAssessment>,
      user,
    );
  }

  /* ═════════════ internals ═════════════ */

  private canRead(a: Lean<SessionAssessment>, user: AuthUser): boolean {
    if (String(a.practitionerId) === user.userId) return true;
    return a.format !== 'v2' || FINAL.includes(a.status);
  }

  /** Validated $set for responses / notes / summary edits. */
  private async changes(
    a: Lean<SessionAssessment>,
    dto: SaveDraftDto,
  ): Promise<Record<string, unknown>> {
    const set: Record<string, unknown> = { lastSavedAt: new Date() };
    if (dto.responses)
      set.responses = this.cleanResponses(
        dto.responses,
        await this.templateOf(a),
      );
    if (dto.notes !== undefined) set.notes = dto.notes;
    if (dto.summaryText !== undefined || dto.summaryApproved !== undefined) {
      const prev = a.summary ?? null;
      const text = dto.summaryText ?? prev?.text ?? '';
      if (!text.trim()) {
        set.summary = null; // cleared
      } else {
        const changed =
          dto.summaryText !== undefined && dto.summaryText !== prev?.text;
        // Editing the text after approval needs a fresh approval.
        const approved =
          dto.summaryApproved ?? (changed ? false : (prev?.approved ?? false));
        set.summary = {
          text,
          generatedBy: prev?.generatedBy ?? 'template',
          generatedAt: prev?.generatedAt ?? new Date(),
          edited: (prev?.edited ?? false) || changed || !prev,
          approved,
          approvedAt: approved
            ? prev?.approved && !changed
              ? prev.approvedAt
              : new Date()
            : undefined,
        } satisfies AssessmentSummary;
      }
    }
    return set;
  }

  /** Keeps only known items with answers that match their type; last write per item wins. */
  private cleanResponses(
    responses: ResponseDto[],
    sections: TemplateSection[],
  ): AssessmentResponse[] {
    const items = new Map(
      sections.flatMap((s) => s.items).map((i) => [i.id, i]),
    );
    const out = new Map<string, AssessmentResponse>();
    for (const r of responses) {
      const item = items.get(r.itemId);
      if (!item) throw new BadRequestException(`Unknown question: ${r.itemId}`);
      if (item.type === 'text') {
        out.set(r.itemId, {
          itemId: r.itemId,
          state: (r.text ?? '').trim() ? 'scored' : 'blank',
          score: null,
          text: r.text ?? '',
          note: r.note,
        });
        continue;
      }
      const scored = r.state === 'scored';
      if (
        scored &&
        (typeof r.score !== 'number' ||
          r.score < (item.scale?.min ?? 0) ||
          r.score > (item.scale?.max ?? 10))
      ) {
        throw new BadRequestException(
          `"${item.label}" needs a score from 0 to 10`,
        );
      }
      out.set(r.itemId, {
        itemId: r.itemId,
        state: r.state,
        score: scored ? r.score : null,
        note: r.note,
      });
    }
    return [...out.values()];
  }

  private async summaryText(a: Lean<SessionAssessment>): Promise<string> {
    const appt = await this.appointmentModel.findById(a.appointmentId).lean();
    if (!appt) throw new NotFoundException('Appointment not found');
    try {
      return await this.summaries.generate({
        sections: await this.templateOf(a),
        responses: a.responses,
        notes: a.notes,
        appointment: { title: appt.title, start: appt.start, end: appt.end },
      });
    } catch (e) {
      this.logger.error(
        `Summary generation failed for assessment ${String(a._id)}: ${(e as Error).message}`,
      );
      throw new ServiceUnavailableException(
        "Couldn't generate a summary. Your answers are safe — keep editing and try again.",
      );
    }
  }

  /** The structured record filed as the patient document's content. */
  private snapshot(
    a: Lean<SessionAssessment>,
    appt: { title: string; start: Date; end: Date },
    sections: TemplateSection[],
  ) {
    return {
      kind: 'session-assessment',
      assessmentId: String(a._id),
      appointmentId: String(a.appointmentId),
      patientId: String(a.patientId),
      practitionerId: String(a.practitionerId),
      template: { key: a.templateKey, version: a.templateVersion, sections },
      appointment: { title: appt.title, start: appt.start, end: appt.end },
      responses: a.responses,
      notes: a.notes ?? '',
      summary: a.summary ?? null,
      status: a.status,
      submittedAt: a.submittedAt,
      amendments: (a.amendments ?? []).map((m) => ({
        version: m.version,
        at: m.at,
        reason: m.reason,
      })),
    };
  }

  /** Builds the 409 for a stale write, naming what changed. */
  private async conflict(id: Types.ObjectId): Promise<ConflictException> {
    const now = await this.assessmentModel.findById(id).select('status').lean();
    if (now && FINAL.includes(now.status)) {
      return new ConflictException(
        'This assessment has been submitted. Use Amend to make a correction.',
      );
    }
    return new ConflictException(
      'This assessment was changed in another tab or window. Reload to get the latest version.',
    );
  }

  /**
   * Runs `fn` in a transaction. On a standalone MongoDB (no replica set, e.g.
   * a bare local install) transactions aren't available, so it falls back to
   * running without one — Atlas and any replica set get full atomicity.
   */
  private async atomic<T>(
    fn: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (e) {
      const code = (e as { code?: number }).code;
      if (code === 20 || code === 263) return fn(undefined); // IllegalOperation: no transactions here
      throw e;
    } finally {
      await session.endSession();
    }
  }

  /** Everything the workspace needs for one assessment. */
  private async bundle(a: Lean<SessionAssessment>, user: AuthUser) {
    const [appt, patient, sections, history] = await Promise.all([
      this.appointmentModel
        .findById(a.appointmentId)
        .select('title start end status')
        .lean(),
      this.patientModel
        .findById(a.patientId)
        .select(
          'firstName lastName mrn dateOfBirth gender healthCondition allergies',
        )
        .lean(),
      a.format === 'v2'
        ? this.templateOf(a)
        : Promise.resolve([] as TemplateSection[]),
      this.assessmentModel
        .find({
          patientId: a.patientId,
          _id: { $ne: a._id },
          status: { $in: FINAL },
          'summary.approved': true,
        })
        .sort({ submittedAt: -1 })
        .limit(3)
        .select('summary submittedAt appointmentId')
        .populate('appointmentId', 'title start')
        .lean(),
    ]);
    const mine = String(a.practitionerId) === user.userId;
    return {
      assessment: a,
      template: sections,
      appointment: appt,
      patient,
      previousSummaries: history.map((h) => ({
        id: String(h._id),
        submittedAt: h.submittedAt,
        appointment: h.appointmentId,
        summary: h.summary?.text ?? '',
      })),
      permissions: {
        canEdit: mine && a.format === 'v2' && EDITABLE.includes(a.status),
        canAmend: mine && a.format === 'v2' && FINAL.includes(a.status),
      },
    };
  }

  private listRow(r: AssessmentRow) {
    return {
      _id: String(r._id),
      format: r.format ?? 'legacy',
      status: r.format === 'v2' ? r.status : 'submitted',
      revision: r.revision,
      appointment: r.appointmentId,
      patient: r.patientId,
      practitioner: r.practitionerId,
      documentId: r.documentId ? String(r.documentId) : null,
      summary: r.summary?.approved ? r.summary.text : null,
      submittedAt: r.submittedAt ?? null,
      updatedAt: r.updatedAt,
      amendments: (r.amendments ?? []).length,
      // Legacy single-dialog fields, for the old-format view.
      legacy:
        r.format === 'v2'
          ? undefined
          : { feedback: r.feedback, followUpRequired: r.followUpRequired },
    };
  }

  /** Audit: action and ids only — never notes, answers or summaries. */
  private log(
    user: AuthUser,
    action: string,
    id: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.audit.record({
      practiceId: user.practiceId ?? null,
      actorId: user.userId,
      actorRole: user.role,
      action,
      entityType: 'SessionAssessment',
      entityId: id,
      metadata,
    });
  }
}
