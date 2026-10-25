import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
  LIVE_STATUSES,
} from './schemas/appointment.schema';
import { EmailService } from '../email/email.service';
import {
  AppointmentEmailKind,
  renderAppointmentEmail,
} from './appointment-emails';
import {
  decideReminder,
  MAX_REMINDER_LEAD_MS,
  REMINDERS,
  ReminderKey,
} from './reminders';

const DEFAULT_INTERVAL_MS = 5 * 60_000;
const FALLBACK_TIMEZONE = 'Asia/Kolkata';

type AppointmentLike = Pick<
  Appointment,
  'patientId' | 'practitionerId' | 'practiceId' | 'start' | 'end'
> & { _id: Types.ObjectId };

/**
 * Emails patients about their appointments: a confirmation when booked,
 * notices when rescheduled or cancelled, and reminders 24h and 2h before.
 *
 * Sending never blocks or fails the request that triggered it — an email
 * outage must not stop a practitioner booking an appointment — so the
 * notify* methods return immediately and log any failure.
 */
@Injectable()
export class AppointmentNotificationsService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AppointmentNotificationsService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly email: EmailService,
  ) {}

  /* ---------------- event emails ---------------- */

  notifyBooked(appt: AppointmentLike) {
    this.dispatch('booked', appt, `appt-${String(appt._id)}-booked`);
  }

  notifyRescheduled(appt: AppointmentLike, previousStart: Date) {
    this.dispatch(
      'rescheduled',
      appt,
      `appt-${String(appt._id)}-rescheduled-${appt.start.getTime()}`,
      previousStart,
    );
  }

  notifyCancelled(appt: AppointmentLike) {
    // Nothing to tell the patient about an appointment that's already over.
    if (appt.start.getTime() <= Date.now()) return;
    this.dispatch('cancelled', appt, `appt-${String(appt._id)}-cancelled`);
  }

  private dispatch(
    kind: AppointmentEmailKind,
    appt: AppointmentLike,
    idempotencyKey: string,
    previousStart?: Date,
  ) {
    this.sendAppointmentEmail(kind, appt, idempotencyKey, previousStart).catch(
      (err: unknown) =>
        this.logger.error(
          `Failed to send ${kind} email for appointment ${String(appt._id)}`,
          err instanceof Error ? err.stack : String(err),
        ),
    );
  }

  /** Returns false when the email was intentionally not sent (opted out, no address). */
  private async sendAppointmentEmail(
    kind: AppointmentEmailKind,
    appt: AppointmentLike,
    idempotencyKey: string,
    previousStart?: Date,
    now = new Date(),
  ): Promise<boolean> {
    const db = this.appointmentModel.db;
    const [patient, practitioner, practice] = await Promise.all([
      db
        .model<{
          firstName: string;
          email?: string;
          emailNotifications?: boolean;
        }>('Patient')
        .findById(appt.patientId, {
          firstName: 1,
          email: 1,
          emailNotifications: 1,
        })
        .lean(),
      db
        .model<{ firstName: string; lastName: string }>('Practitioner')
        .findById(appt.practitionerId, { firstName: 1, lastName: 1 })
        .lean(),
      appt.practiceId
        ? db
            .model<{
              name: string;
              email?: string;
              phone?: string;
              timezone?: string;
            }>('Practice')
            .findById(appt.practiceId, {
              name: 1,
              email: 1,
              phone: 1,
              timezone: 1,
            })
            .lean()
        : null,
    ]);

    if (!patient?.email || patient.emailNotifications === false) return false;

    const rendered = renderAppointmentEmail(
      kind,
      {
        patientFirstName: patient.firstName,
        practitionerName: practitioner
          ? `${practitioner.firstName} ${practitioner.lastName}`.trim()
          : 'your practitioner',
        practice: {
          name: practice?.name ?? 'BetterYou',
          email: practice?.email,
          phone: practice?.phone,
          timezone: practice?.timezone || FALLBACK_TIMEZONE,
        },
        start: appt.start,
        end: appt.end,
        previousStart,
      },
      now,
    );

    await this.email.send({
      to: patient.email,
      replyTo: practice?.email,
      idempotencyKey,
      ...rendered,
    });
    this.logger.log(`Sent ${kind} email for appointment ${String(appt._id)}`);
    return true;
  }

  /* ---------------- reminders ---------------- */

  onApplicationBootstrap() {
    if (process.env.APPOINTMENT_REMINDERS_ENABLED === 'false') {
      this.logger.log('Appointment reminders disabled');
      return;
    }
    // Without a provider every reminder would be marked sent but never
    // delivered, so the job stays off until one is configured.
    if (!this.email.enabled) {
      this.logger.warn(
        'Appointment reminders off: no email provider configured',
      );
      return;
    }
    const interval =
      Number(process.env.APPOINTMENT_REMINDER_INTERVAL_MS) ||
      DEFAULT_INTERVAL_MS;
    this.timer = setInterval(() => void this.runReminders(), interval);
    // Don't hold the process open (tests, graceful shutdown).
    this.timer.unref();
    // First pass shortly after boot rather than a full interval later.
    setTimeout(() => void this.runReminders(), 10_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * One pass of the reminder job. Safe to run on several server instances at
   * once: each reminder is claimed with an atomic update before it's sent,
   * so only one instance sends it.
   */
  async runReminders(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let sent = 0;
    try {
      const candidates = await this.appointmentModel
        .find(
          {
            status: { $in: LIVE_STATUSES },
            start: {
              $gt: now,
              $lte: new Date(now.getTime() + MAX_REMINDER_LEAD_MS),
            },
            remindersSent: { $not: { $all: REMINDERS.map((r) => r.key) } },
          },
          {
            patientId: 1,
            practitionerId: 1,
            practiceId: 1,
            start: 1,
            end: 1,
            bookedAt: 1,
            createdAt: 1,
            remindersSent: 1,
          },
        )
        .lean();

      for (const appt of candidates) {
        const decision = decideReminder(
          {
            start: appt.start,
            bookedAt: appt.bookedAt ?? appt.createdAt ?? new Date(0),
            remindersSent: appt.remindersSent ?? [],
          },
          now,
        );
        if (!decision) continue;

        const claimed = await this.appointmentModel.updateOne(
          {
            _id: appt._id,
            start: appt.start, // not rescheduled since we read it
            remindersSent: { $nin: decision.markSent },
          },
          { $addToSet: { remindersSent: { $each: decision.markSent } } },
        );
        if (claimed.modifiedCount === 0 || !decision.send) continue;

        try {
          const delivered = await this.sendAppointmentEmail(
            'reminder',
            appt,
            `appt-${String(appt._id)}-reminder-${decision.send}-${appt.start.getTime()}`,
            undefined,
            now,
          );
          if (delivered) sent++;
        } catch (err) {
          // Release the claim so the next pass retries.
          await this.releaseReminder(appt._id, decision.send);
          this.logger.error(
            `Failed to send reminder for appointment ${String(appt._id)}`,
            err instanceof Error ? err.stack : String(err),
          );
        }
      }
    } catch (err) {
      this.logger.error(
        'Reminder pass failed',
        err instanceof Error ? err.stack : String(err),
      );
    } finally {
      this.running = false;
    }
    return sent;
  }

  private releaseReminder(id: Types.ObjectId, key: ReminderKey) {
    return this.appointmentModel.updateOne(
      { _id: id },
      { $pull: { remindersSent: key } },
    );
  }
}
