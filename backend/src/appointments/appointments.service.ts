import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
} from './schemas/appointment.schema';
import { AppointmentsGateway } from './appointments.gateway';
import { AvailabilityService } from '../availability/availability.service';
import { PractitionersService } from '../practitioners/practitioners.service';
import {
  practiceScopeFilter,
  practiceStamp,
} from '../common/tenancy/practice-scope';
import { AppointmentTypesService } from '../appointment-types/appointment-types.service';
import { Patient } from '../patients/schemas/patient.schema';
import { localParts, zonedInstant } from './practice-time';

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

interface DaySchedule {
  isOpen: boolean;
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
}

const DEFAULT_HOURS: Record<string, DaySchedule> = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
};

export interface AppointmentData {
  practitionerId: string;
  patientId: string;
  start: string;
  end: string;
  title?: string;
  appointmentTypeId?: string | null;
  notes?: string;
  status?: string;
}

/** Clock-skew allowance when rejecting bookings that start in the past. */
const PAST_GRACE_MS = 5 * 60_000;

const FALLBACK_TIMEZONE = 'Asia/Kolkata';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly gateway: AppointmentsGateway,
    private readonly availabilityService: AvailabilityService,
    private readonly practitionersService: PractitionersService,
    private readonly appointmentTypesService: AppointmentTypesService,
  ) {}

  /**
   * Throws unless the caller is the patient or the practitioner on this
   * appointment. Used by the routes that mutate a single appointment, so a
   * signed-in user cannot change someone else's booking by guessing an id.
   */
  async assertParticipant(
    appointmentId: string,
    userId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    const appt = await this.appointmentModel
      .findById(appointmentId)
      .select('patientId practitionerId')
      .lean()
      .exec();

    if (!appt) throw new NotFoundException('Appointment not found');

    const participants = [String(appt.patientId), String(appt.practitionerId)];

    if (!participants.includes(userId)) {
      throw new ForbiddenException('This appointment does not belong to you');
    }
  }

  /* =====================================================
     CREATE APPOINTMENT
     ===================================================== */

  async create(data: AppointmentData, practiceId: string | null = null) {
    try {
      if (!Types.ObjectId.isValid(data.practitionerId)) {
        throw new BadRequestException('Invalid practitioner ID');
      }

      if (!Types.ObjectId.isValid(data.patientId)) {
        throw new BadRequestException('Invalid patient ID');
      }

      if (!data.start || !data.end) {
        throw new BadRequestException('Start and end time are required');
      }

      const start = new Date(data.start);
      const end = new Date(data.end);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid start or end time');
      }
      if (end <= start) {
        throw new BadRequestException('End time must be after start time');
      }
      if (start.getTime() < Date.now() - PAST_GRACE_MS) {
        throw new BadRequestException("Can't book an appointment in the past");
      }

      // Both people must exist in the caller's practice. Without this, a
      // known id from another practice could be booked onto, or attached to,
      // this practice's calendar.
      const practitioner = await this.practitionersService
        .findById(data.practitionerId, practiceId)
        .catch(() => {
          throw new BadRequestException('Practitioner not found');
        });
      await this.assertWithinPracticeHours(practitioner, start, end);
      const patientExists = await this.appointmentModel.db
        .model<Patient>('Patient')
        .exists({
          _id: new Types.ObjectId(data.patientId),
          ...practiceScopeFilter(practiceId),
        });
      if (!patientExists) {
        throw new BadRequestException('Patient not found');
      }

      // A chosen type must be one of this practitioner's active types, and
      // its name becomes the title — the client can't book under a type it
      // doesn't own or relabel it.
      let appointmentTypeId: Types.ObjectId | undefined;
      if (data.appointmentTypeId) {
        const type = await this.appointmentTypesService.resolveForBooking(
          data.appointmentTypeId,
          data.practitionerId,
          { requireActive: true },
        );
        appointmentTypeId = type._id;
        data.title = type.name;
      }
      if (!data.title?.trim()) {
        throw new BadRequestException('Appointment type is required');
      }

      // Reject any overlap with an existing, still-live booking for the same
      // practitioner. [start, end) semantics: a slot ending exactly when the
      // next one starts does not count as an overlap.
      const overlapping = await this.appointmentModel.exists({
        practitionerId: new Types.ObjectId(data.practitionerId),
        status: {
          $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        start: { $lt: end },
        end: { $gt: start },
      });
      if (overlapping) {
        throw new ConflictException(
          'This practitioner already has an appointment in that time slot',
        );
      }

      const appointment = await this.appointmentModel.create({
        ...data,
        practitionerId: new Types.ObjectId(data.practitionerId),
        patientId: new Types.ObjectId(data.patientId),
        appointmentTypeId,
        status: data.status || 'scheduled',
        practiceId: practiceStamp(practiceId),
      });

      const formatted = this.formatAppointment(appointment);

      this.gateway.emitAppointmentUpdate(
        formatted.patientId,
        formatted,
        formatted.practitionerId,
      );

      return formatted;
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.logger.error(
        'Error creating appointment',
        error instanceof Error ? error.stack : String(error),
      );

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create appointment',
      );
    }
  }

  /** The practice's IANA timezone, which practice hours are written in. */
  private async practiceTimezone(practiceId?: Types.ObjectId) {
    const practice = practiceId
      ? await this.appointmentModel.db
          .model<{ timezone?: string }>('Practice')
          .findById(practiceId, { timezone: 1 })
          .lean()
      : null;
    return practice?.timezone || FALLBACK_TIMEZONE;
  }

  /**
   * Throws unless [start, end) falls inside one open day of the
   * practitioner's practice hours, read in the practice's timezone. The
   * calendar only offers in-hours slots; this stops a direct API call (or a
   * drag on the calendar) from booking outside them.
   */
  private async assertWithinPracticeHours(
    practitioner: {
      practiceId?: Types.ObjectId;
      practiceHours?: Record<string, DaySchedule>;
    },
    start: Date,
    end: Date,
  ) {
    const timeZone = await this.practiceTimezone(practitioner.practiceId);
    const from = localParts(start, timeZone);
    const to = localParts(end, timeZone);
    const day =
      practitioner.practiceHours?.[from.dayKey] ?? DEFAULT_HOURS[from.dayKey];

    if (!day?.isOpen) {
      throw new BadRequestException(
        `The practice is closed on ${from.dayKey[0].toUpperCase()}${from.dayKey.slice(1)}s`,
      );
    }
    // "24:00" never comes out of localParts, so an end at midnight reads as
    // the next day and is rejected along with any other overnight booking.
    if (
      to.date !== from.date ||
      from.time < day.openTime ||
      to.time > day.closeTime
    ) {
      throw new BadRequestException(
        `Appointments must be within practice hours (${day.openTime}–${day.closeTime})`,
      );
    }
  }

  /* =====================================================
     FETCH BY PRACTITIONER
     ===================================================== */

  async findByPractitioner(practitionerId: string) {
    if (!Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID');
    }

    const appointments = await this.appointmentModel
      .find({ practitionerId: new Types.ObjectId(practitionerId) })
      .sort({ start: 1 })
      .exec();

    return appointments.map((a) => this.formatAppointment(a));
  }

  /* =====================================================
     FETCH BY PATIENT
     ===================================================== */

  async findByPatient(patientId: string, practiceId: string | null = null) {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID');
    }

    const appointments = await this.appointmentModel
      .find({
        patientId: new Types.ObjectId(patientId),
        ...practiceScopeFilter(practiceId),
      })
      .sort({ start: -1 })
      .exec();

    return appointments.map((a) => this.formatAppointment(a));
  }

  /* =====================================================
     UPDATE APPOINTMENT
     ===================================================== */

  async updateById(id: string, data: AppointmentData) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    // Capture the previous start before updating, so the frontend can detect reschedules
    const existing = await this.appointmentModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    const previousStart = existing.start?.toISOString();

    if (data.status !== undefined) {
      const validStatuses = Object.values(AppointmentStatus) as string[];
      if (!validStatuses.includes(data.status)) {
        throw new BadRequestException(`Invalid status: ${data.status}`);
      }
    }

    // A closed-out appointment (completed/cancelled/no-show) can still have
    // its title/notes edited, but its time is locked — otherwise the UI's
    // reschedule restriction is purely cosmetic and any direct API call
    // bypasses it.
    const CLOSED_OUT_STATUSES: string[] = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.NO_SHOW,
    ];
    if (
      CLOSED_OUT_STATUSES.includes(existing.status) &&
      (data.start !== undefined || data.end !== undefined)
    ) {
      throw new BadRequestException(
        'This appointment is closed out and can no longer be rescheduled',
      );
    }

    // Re-run the same overlap check create() does whenever the time is
    // changing — otherwise editing an appointment's time is a second,
    // unguarded path to double-booking a practitioner.
    const start = data.start ? new Date(data.start) : existing.start;
    const end = data.end ? new Date(data.end) : existing.end;
    if (data.start || data.end) {
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid start or end time');
      }
      if (end <= start) {
        throw new BadRequestException('End time must be after start time');
      }
      const moved = start.getTime() !== existing.start.getTime();
      if (moved && start.getTime() < Date.now() - PAST_GRACE_MS) {
        throw new BadRequestException(
          "Can't move an appointment into the past",
        );
      }
      if (moved || end.getTime() !== existing.end.getTime()) {
        await this.assertWithinPracticeHours(
          await this.practitionersService.findByIdInternal(
            String(existing.practitionerId),
          ),
          start,
          end,
        );
      }
      const overlapping = await this.appointmentModel.exists({
        _id: { $ne: existing._id },
        practitionerId: existing.practitionerId,
        status: {
          $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        start: { $lt: end },
        end: { $gt: start },
      });
      if (overlapping) {
        throw new ConflictException(
          'This practitioner already has an appointment in that time slot',
        );
      }
    }

    // Changing the type re-validates it against this appointment's own
    // practitioner. Keeping the current type is allowed even if it has
    // since been deactivated, so old appointments stay editable.
    let title = data.title;
    let appointmentTypeId: Types.ObjectId | undefined;
    if (data.appointmentTypeId) {
      const unchanged =
        String(existing.appointmentTypeId) === String(data.appointmentTypeId);
      const type = await this.appointmentTypesService.resolveForBooking(
        String(data.appointmentTypeId),
        String(existing.practitionerId),
        { requireActive: !unchanged },
      );
      appointmentTypeId = type._id;
      title = type.name;
    }

    const updated = await this.appointmentModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        title,
        appointmentTypeId,
        start: data.start,
        end: data.end,
        notes: data.notes,
        status: data.status,
      },
      { new: true },
    );

    if (!updated) {
      throw new BadRequestException('Appointment not found');
    }

    const formatted = this.formatAppointment(updated);

    this.gateway.emitAppointmentUpdate(
      formatted.patientId,
      { ...formatted, previousStart },
      formatted.practitionerId,
    );

    return formatted;
  }

  /* =====================================================
     DELETE APPOINTMENT
     ===================================================== */

  async deleteById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    const deleted = await this.appointmentModel.findByIdAndDelete(
      new Types.ObjectId(id),
    );

    if (!deleted) throw new NotFoundException('Appointment not found');

    const formatted = this.formatAppointment(deleted);

    this.gateway.emitAppointmentUpdate(
      formatted.patientId,
      { ...formatted, deleted: true },
      formatted.practitionerId,
    );

    return formatted;
  }

  /* =====================================================
     FORMAT HELPER
     ===================================================== */

  private formatAppointment(a: AppointmentDocument) {
    return {
      id: a._id.toString(),
      title: a.title,
      appointmentTypeId: a.appointmentTypeId?.toString() ?? null,
      start: a.start,
      end: a.end,
      practitionerId: a.practitionerId?.toString(),
      patientId: a.patientId?.toString(),
      notes: a.notes,
      status: a.status,
      checkedInAt: a.checkedInAt ?? null,
    };
  }

  /* =====================================================
     CHECK IN
     ===================================================== */

  async checkIn(appointmentId: string, patientId: string) {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    const appt = await this.appointmentModel.findById(appointmentId);
    if (!appt) throw new NotFoundException('Appointment not found');

    if (appt.patientId.toString() !== patientId) {
      throw new ForbiddenException('This appointment does not belong to you');
    }

    // Must be today (UTC date comparison)
    const today = new Date();
    const apptDate = new Date(appt.start);
    const sameDay =
      apptDate.getUTCFullYear() === today.getUTCFullYear() &&
      apptDate.getUTCMonth() === today.getUTCMonth() &&
      apptDate.getUTCDate() === today.getUTCDate();

    if (!sameDay) {
      throw new BadRequestException(
        'You can only check in on the day of your appointment',
      );
    }

    const allowedStatuses = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
    ];
    if (!allowedStatuses.includes(appt.status)) {
      throw new BadRequestException(
        `Cannot check in — appointment is already ${appt.status}`,
      );
    }

    const checkedInAt = new Date();
    const updated = await this.appointmentModel.findByIdAndUpdate(
      appointmentId,
      { status: AppointmentStatus.CHECKED_IN, checkedInAt },
      { new: true },
    );

    const formatted = this.formatAppointment(updated!);

    // Notify the practitioner in real time
    const practitionerIdStr = appt.practitionerId.toString();

    // Fetch patient name for the notification
    const patient = await this.appointmentModel.db
      .model<Patient>('Patient')
      .findById(appt.patientId)
      .select('firstName lastName')
      .lean()
      .catch(() => null);

    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : 'A patient';

    this.gateway.emitPatientCheckedIn(practitionerIdStr, {
      appointmentId: formatted.id,
      patientName,
      appointmentTitle: appt.title,
      appointmentStart: appt.start.toISOString(),
      checkedInAt: checkedInAt.toISOString(),
    });

    // Also emit standard appointment update so calendars refresh
    this.gateway.emitAppointmentUpdate(
      appt.patientId.toString(),
      { ...formatted, deleted: false },
      practitionerIdStr,
    );

    return formatted;
  }

  /* =====================================================
     UPDATE STATUS (practitioner side)
     ===================================================== */

  async updateStatus(appointmentId: string, status: string) {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    const validStatuses = Object.values(AppointmentStatus) as string[];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const updated = await this.appointmentModel.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Appointment not found');

    const formatted = this.formatAppointment(updated);
    this.gateway.emitAppointmentUpdate(
      formatted.patientId,
      formatted,
      formatted.practitionerId,
    );
    return formatted;
  }

  /* =====================================================
     WAITING ROOM
     ===================================================== */

  async getWaitingRoom(practitionerId: string) {
    if (!Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID');
    }

    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dayEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );

    const waitingStatuses = [
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.IN_PROGRESS,
    ];

    const appointments = await this.appointmentModel
      .find({
        practitionerId: new Types.ObjectId(practitionerId),
        start: { $gte: dayStart, $lt: dayEnd },
        status: { $in: waitingStatuses },
      })
      .sort({ checkedInAt: 1 })
      .lean();

    // Populate patient names
    const PatientModel = this.appointmentModel.db.model<Patient>('Patient');
    const patientIds = appointments.map((a) => a.patientId);
    const patients = await PatientModel.find({ _id: { $in: patientIds } })
      .select('firstName lastName')
      .lean();

    const patientMap = new Map<string, { firstName: string; lastName: string }>(
      patients.map((p) => [p._id.toString(), p]),
    );

    return appointments.map((a) => {
      const p = patientMap.get(a.patientId.toString());
      return {
        id: a._id.toString(),
        patientId: a.patientId.toString(),
        patientName: p ? `${p.firstName} ${p.lastName}` : 'Unknown',
        title: a.title,
        start: a.start,
        end: a.end,
        status: a.status,
        checkedInAt: a.checkedInAt ?? null,
      };
    });
  }

  /* =====================================================
     AVAILABILITY
     ===================================================== */

  async getAvailability(date: string, practitionerId: string) {
    if (!Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date must be YYYY-MM-DD');
    }

    // 1. Resolve the day schedule from practiceHours (or fall back to defaults)
    const practitioner =
      await this.practitionersService.findByIdInternal(practitionerId);
    const savedHours = practitioner.practiceHours as
      | Record<string, DaySchedule>
      | undefined;

    // Every wall-clock time here (hours, blocks, the date itself) is in the
    // practice's timezone, not the server's.
    const timeZone = await this.practiceTimezone(practitioner.practiceId);
    const at = (time: string) => zonedInstant(date, time, timeZone);

    const dayKey = DAY_KEYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
    const daySchedule: DaySchedule =
      savedHours?.[dayKey] ?? DEFAULT_HOURS[dayKey];

    if (!daySchedule.isOpen) {
      return [];
    }

    // 2. Get manually blocked slots
    const blocks =
      await this.availabilityService.fetchBlockedSlots(practitionerId);
    if (blocks.some((b) => b.blockType === 'day' && b.date === date)) {
      return [];
    }
    const blockedStarts = new Set(
      blocks
        .filter((b) => b.blockType === 'slot' && b.date === date && b.startTime)
        .map((b) => at(b.startTime as string).getTime()),
    );

    // 3. Live appointments overlapping the open hours (to mark booked)
    const open = at(daySchedule.openTime);
    const close = at(daySchedule.closeTime);
    const appointments = await this.appointmentModel
      .find({
        practitionerId: new Types.ObjectId(practitionerId),
        status: {
          $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        start: { $lt: close },
        end: { $gt: open },
      })
      .select('start end')
      .lean();

    // 4. Generate 30-min slots within practice open hours. A slot is booked
    // if any appointment overlaps it, not only one starting exactly on it.
    const slots: { start: string; end: string; isBooked: boolean }[] = [];
    for (
      let t = open.getTime();
      t + 30 * 60_000 <= close.getTime();
      t += 30 * 60_000
    ) {
      if (blockedStarts.has(t)) continue;
      const slotEnd = t + 30 * 60_000;
      slots.push({
        start: new Date(t).toISOString(),
        end: new Date(slotEnd).toISOString(),
        isBooked: appointments.some(
          (a) =>
            new Date(a.start).getTime() < slotEnd &&
            new Date(a.end).getTime() > t,
        ),
      });
    }

    return slots;
  }
}
