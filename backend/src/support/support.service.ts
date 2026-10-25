import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SupportTicket,
  TicketPriority,
  TicketStatus,
} from './schemas/support-ticket.schema';
import {
  SupportAttachment,
  SupportMessage,
} from './schemas/support-message.schema';
import { Faq } from './schemas/faq.schema';
import { SupportCounter } from './schemas/support-counter.schema';
import {
  AdminUpdateTicketDto,
  CreateTicketDto,
  ListTicketsQuery,
  ReplyDto,
} from './dto/ticket.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import {
  ATTACHMENT_LIMITS,
  attachmentKey,
  safeAttachmentName,
  sniffAttachment,
} from './support-attachment';
import { DEFAULT_FAQS } from './support.defaults';
import { StorageService } from '../storage/storage.service';
import { Practitioner } from '../practitioners/schemas/practitioner.schema';
import { Practice } from '../practices/schemas/practice.schema';
import type { AuthUser } from '../common/auth-user';
import { Role } from '../common/role.enum';
import { SupportGateway, type SupportTicketEvent } from './support.gateway';

type Side = 'requester' | 'support';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class SupportService implements OnModuleInit {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(SupportTicket.name)
    private readonly ticketModel: Model<SupportTicket>,
    @InjectModel(SupportMessage.name)
    private readonly messageModel: Model<SupportMessage>,
    @InjectModel(Faq.name) private readonly faqModel: Model<Faq>,
    @InjectModel(SupportCounter.name)
    private readonly counterModel: Model<SupportCounter>,
    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<Practitioner>,
    @InjectModel(Practice.name) private readonly practiceModel: Model<Practice>,
    private readonly storage: StorageService,
    private readonly gateway: SupportGateway,
  ) {}

  /** Starter FAQs on first boot only — never touches an existing list. */
  async onModuleInit() {
    try {
      if ((await this.faqModel.estimatedDocumentCount()) === 0) {
        await this.faqModel.insertMany(
          DEFAULT_FAQS.map((f, i) => ({
            ...f,
            sortOrder: i,
            isPublished: true,
          })),
        );
        this.logger.log(`Seeded ${DEFAULT_FAQS.length} default FAQs`);
      }
    } catch (err) {
      this.logger.error(`FAQ seeding failed: ${(err as Error).message}`);
    }
  }

  /* ═════════════ Practice side ═════════════ */

  async createTicket(
    dto: CreateTicketDto,
    files: Express.Multer.File[],
    user: AuthUser,
  ) {
    const attachments = this.validateFiles(files);
    const requester = await this.practitionerModel
      .findById(user.userId)
      .select('firstName lastName email practiceId')
      .lean();
    if (!requester)
      throw new ForbiddenException(
        'Only practice staff can raise support tickets',
      );
    const practice = requester.practiceId
      ? await this.practiceModel
          .findById(requester.practiceId)
          .select('name')
          .lean()
      : null;

    const now = new Date();
    const ticket = await this.ticketModel.create({
      ticketNo: await this.nextTicketNo(),
      practiceId: requester.practiceId,
      requesterId: new Types.ObjectId(user.userId),
      requesterName: `${requester.firstName} ${requester.lastName}`.trim(),
      requesterEmail: requester.email,
      practiceName: practice?.name,
      subject: dto.subject,
      category: dto.category,
      priority: dto.priority ?? TicketPriority.NORMAL,
      status: TicketStatus.OPEN,
      lastMessageAt: now,
      unreadForAdmin: true,
      unreadForRequester: false,
      messageCount: 0,
    });

    await this.addMessage(
      ticket,
      'requester',
      user.userId,
      ticket.requesterName,
      dto.body,
      attachments,
    );
    this.notify(ticket, {
      kind: 'created',
      by: 'requester',
      status: ticket.status,
    });
    return this.toTicket(await this.ticketModel.findById(ticket._id).lean());
  }

  async listOwn(user: AuthUser) {
    const tickets = await this.ticketModel
      .find({ requesterId: new Types.ObjectId(user.userId) })
      .sort({ lastMessageAt: -1 })
      .lean();
    return tickets.map((t) => this.toTicket(t));
  }

  async getOwn(id: string, user: AuthUser) {
    const ticket = await this.findOwned(id, user);
    if (ticket.unreadForRequester) {
      await this.ticketModel.updateOne(
        { _id: ticket._id },
        { $set: { unreadForRequester: false } },
      );
      ticket.unreadForRequester = false;
    }
    return this.withThread(ticket);
  }

  async replyOwn(
    id: string,
    dto: ReplyDto,
    files: Express.Multer.File[],
    user: AuthUser,
  ) {
    const attachments = this.validateFiles(files);
    const ticket = await this.findOwned(id, user);
    // Writing back on a resolved/closed ticket reopens it — the issue isn't over.
    const reopen =
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED;
    const doc = await this.ticketModel.findById(ticket._id);
    await this.addMessage(
      doc!,
      'requester',
      user.userId,
      ticket.requesterName,
      dto.body,
      attachments,
      {
        ...(reopen ? { status: TicketStatus.OPEN } : {}),
      },
    );
    this.notify(ticket, {
      kind: 'reply',
      by: 'requester',
      status: reopen ? TicketStatus.OPEN : ticket.status,
    });
    return this.getOwn(id, user);
  }

  /** The requester may close their own ticket ("this is sorted"). */
  async closeOwn(id: string, user: AuthUser) {
    const ticket = await this.findOwned(id, user);
    await this.ticketModel.updateOne(
      { _id: ticket._id },
      { $set: { status: TicketStatus.CLOSED } },
    );
    this.notify(ticket, {
      kind: 'status',
      by: 'requester',
      status: TicketStatus.CLOSED,
    });
    return this.getOwn(id, user);
  }

  async publishedFaqs() {
    return this.faqModel
      .find({ isPublished: true })
      .sort({ category: 1, sortOrder: 1, createdAt: 1 })
      .lean();
  }

  /* ═════════════ Platform (Super Admin) side ═════════════ */

  async listAll(query: ListTicketsQuery) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    if (query.q) {
      const rx = new RegExp(escapeRegex(query.q), 'i');
      filter.$or = [
        { subject: rx },
        { ticketNo: rx },
        { requesterName: rx },
        { requesterEmail: rx },
        { practiceName: rx },
      ];
    }
    const tickets = await this.ticketModel
      .find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(500)
      .lean();
    const counts = await this.ticketModel.aggregate<{
      _id: TicketStatus;
      n: number;
    }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    return {
      tickets: tickets.map((t) => this.toTicket(t)),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    };
  }

  async getAny(id: string) {
    const ticket = await this.findById(id);
    if (ticket.unreadForAdmin) {
      await this.ticketModel.updateOne(
        { _id: ticket._id },
        { $set: { unreadForAdmin: false } },
      );
      ticket.unreadForAdmin = false;
    }
    return this.withThread(ticket);
  }

  async replyAny(
    id: string,
    dto: ReplyDto,
    files: Express.Multer.File[],
    user: AuthUser,
    adminName: string,
  ) {
    const attachments = this.validateFiles(files);
    const doc = await this.ticketModel.findById(this.oid(id));
    if (!doc) throw new NotFoundException('Ticket not found');
    // First support reply moves a fresh ticket along.
    const advance =
      doc.status === TicketStatus.OPEN
        ? { status: TicketStatus.IN_PROGRESS }
        : {};
    await this.addMessage(
      doc,
      'support',
      user.userId,
      adminName,
      dto.body,
      attachments,
      advance,
    );
    this.notify(doc, {
      kind: 'reply',
      by: 'support',
      status: advance.status ?? doc.status,
    });
    return this.getAny(id);
  }

  async updateAny(id: string, dto: AdminUpdateTicketDto) {
    const before = await this.findById(id);
    const set: Record<string, unknown> = {};
    if (dto.status) set.status = dto.status;
    if (dto.priority) set.priority = dto.priority;
    if (!Object.keys(set).length)
      throw new BadRequestException('Nothing to update');
    await this.ticketModel.updateOne({ _id: before._id }, { $set: set });
    this.notify(before, {
      kind: 'status',
      by: 'support',
      status: dto.status ?? before.status,
    });
    return { before, after: await this.getAny(id) };
  }

  async allFaqs() {
    return this.faqModel
      .find()
      .sort({ category: 1, sortOrder: 1, createdAt: 1 })
      .lean();
  }

  async createFaq(dto: CreateFaqDto) {
    const last = await this.faqModel
      .findOne({ category: dto.category })
      .sort({ sortOrder: -1 })
      .lean();
    const created = await this.faqModel.create({
      ...dto,
      sortOrder: dto.sortOrder ?? (last ? last.sortOrder + 1 : 0),
    });
    return created.toObject();
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    const faq = await this.faqModel
      .findByIdAndUpdate(this.oid(id), { $set: dto }, { new: true })
      .lean();
    if (!faq) throw new NotFoundException('FAQ not found');
    return faq;
  }

  async deleteFaq(id: string) {
    const faq = await this.faqModel.findByIdAndDelete(this.oid(id)).lean();
    if (!faq) throw new NotFoundException('FAQ not found');
    return { deleted: true };
  }

  /* ═════════════ Attachments ═════════════ */

  /**
   * Streams an attachment after checking the caller may see its ticket:
   * the requester themselves, or a platform admin.
   */
  async openAttachment(
    messageId: string,
    attachmentId: string,
    user: AuthUser,
  ) {
    const message = await this.messageModel
      .findById(this.oid(messageId))
      .lean();
    const att = message?.attachments.find(
      (a) => String(a._id) === attachmentId,
    );
    if (!message || !att) throw new NotFoundException('Attachment not found');
    if (user.role !== Role.SUPER_ADMIN) {
      await this.findOwned(String(message.ticketId), user);
    }
    return { ...att, stream: await this.storage.get(att.storageKey) };
  }

  /* ═════════════ Internals ═════════════ */

  /**
   * Live update for the other side (and the actor's other tabs). A failed
   * emit must never fail the request that already succeeded.
   */
  private notify(
    ticket: Pick<SupportTicket, '_id' | 'ticketNo' | 'requesterId'>,
    e: Omit<SupportTicketEvent, 'ticketId' | 'ticketNo'>,
  ) {
    const event: SupportTicketEvent = {
      ticketId: String(ticket._id),
      ticketNo: ticket.ticketNo,
      ...e,
    };
    try {
      this.gateway.toRequester(String(ticket.requesterId), event);
      this.gateway.toAdmins(event);
    } catch (err) {
      this.logger.warn(`Support live update failed: ${(err as Error).message}`);
    }
  }

  private validateFiles(files: Express.Multer.File[] = []) {
    if (files.length > ATTACHMENT_LIMITS.maxFiles) {
      throw new BadRequestException(
        `Attach at most ${ATTACHMENT_LIMITS.maxFiles} files`,
      );
    }
    return files.map((f) => {
      if (f.size > ATTACHMENT_LIMITS.maxBytes) {
        throw new PayloadTooLargeException(
          `${f.originalname} is larger than 10 MB`,
        );
      }
      const kind = sniffAttachment(f.buffer);
      if (!kind) {
        throw new UnsupportedMediaTypeException(
          `${f.originalname}: only PNG, JPEG, WebP images and PDFs can be attached`,
        );
      }
      return {
        buffer: f.buffer,
        kind,
        fileName: safeAttachmentName(f.originalname, kind),
      };
    });
  }

  /**
   * Stores the files, then writes the message. If writing fails, the files
   * just stored are removed again so nothing is orphaned in storage.
   */
  private async addMessage(
    ticket: SupportTicket,
    side: Side,
    authorId: string,
    authorName: string,
    body: string,
    files: ReturnType<SupportService['validateFiles']>,
    extraSet: Record<string, unknown> = {},
  ) {
    const messageId = new Types.ObjectId();
    const stored: SupportAttachment[] = [];
    try {
      for (const f of files) {
        const _id = new Types.ObjectId();
        const storageKey = attachmentKey(
          String(ticket._id),
          String(messageId),
          String(_id),
        );
        await this.storage.put(storageKey, f.buffer, f.kind);
        stored.push({
          _id,
          fileName: f.fileName,
          contentType: f.kind,
          size: f.buffer.length,
          storageKey,
        });
      }
      await this.messageModel.create({
        _id: messageId,
        ticketId: ticket._id,
        authorId: new Types.ObjectId(authorId),
        authorSide: side,
        authorName,
        body,
        attachments: stored,
      });
    } catch (err) {
      await Promise.all(
        stored.map((a) => this.storage.deleteQuietly(a.storageKey)),
      );
      throw err;
    }
    await this.ticketModel.updateOne(
      { _id: ticket._id },
      {
        $set: {
          lastMessageAt: new Date(),
          ...(side === 'requester'
            ? { unreadForAdmin: true }
            : { unreadForRequester: true }),
          ...extraSet,
        },
        $inc: { messageCount: 1 },
      },
    );
  }

  private async nextTicketNo() {
    const c = await this.counterModel.findOneAndUpdate(
      { _id: 'ticket' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    return `SUP-${1000 + c.seq}`;
  }

  private oid(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    return new Types.ObjectId(id);
  }

  private async findById(id: string) {
    const ticket = await this.ticketModel.findById(this.oid(id)).lean();
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  /** 404 (not 403) for someone else's ticket, so ids can't be probed. */
  private async findOwned(id: string, user: AuthUser) {
    const ticket = await this.findById(id);
    if (String(ticket.requesterId) !== user.userId)
      throw new NotFoundException('Ticket not found');
    return ticket;
  }

  private async withThread(ticket: SupportTicket) {
    const messages = await this.messageModel
      .find({ ticketId: ticket._id })
      .sort({ createdAt: 1 })
      .lean();
    return {
      ...this.toTicket(ticket),
      messages: messages.map((m) => this.toMessage(m)),
    };
  }

  private toTicket(t: SupportTicket | null) {
    if (!t) throw new NotFoundException('Ticket not found');
    return {
      _id: String(t._id),
      ticketNo: t.ticketNo,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      requesterName: t.requesterName,
      requesterEmail: t.requesterEmail,
      practiceName: t.practiceName ?? null,
      lastMessageAt: t.lastMessageAt,
      messageCount: t.messageCount,
      unreadForRequester: t.unreadForRequester,
      unreadForAdmin: t.unreadForAdmin,
      createdAt: (t as unknown as { createdAt: Date }).createdAt,
    };
  }

  /** Storage keys stay server-side; clients get ids to stream through the API. */
  private toMessage(m: SupportMessage) {
    return {
      _id: String(m._id),
      authorSide: m.authorSide,
      authorName: m.authorName,
      body: m.body,
      createdAt: m.createdAt,
      attachments: m.attachments.map((a) => ({
        _id: String(a._id),
        fileName: a.fileName,
        contentType: a.contentType,
        size: a.size,
      })),
    };
  }
}
