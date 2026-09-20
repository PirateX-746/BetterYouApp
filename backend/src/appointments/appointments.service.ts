import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument, AppointmentStatus } from './schemas/appointment.schema';
import { AppointmentsGateway } from './appointments.gateway';
import { AvailabilityService } from '../availability/availability.service';
import { PractitionersService } from '../practitioners/practitioners.service';
import { practiceScopeFilter, practiceStamp } from '../common/tenancy/practice-scope';

const DAY_KEYS = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday',
] as const;

interface DaySchedule {
  isOpen: boolean;
  openTime: string;  // "HH:mm"
  closeTime: string; // "HH:mm"
}

const DEFAULT_HOURS: Record<string, DaySchedule> = {
  monday:    { isOpen: true,  openTime: '09:00', closeTime: '17:00' },
  tuesday:   { isOpen: true,  openTime: '09:00', closeTime: '17:00' },
  wednesday: { isOpen: true,  openTime: '09:00', closeTime: '17:00' },
  thursday:  { isOpen: true,  openTime: '09:00', closeTime: '17:00' },
  friday:    { isOpen: true,  openTime: '09:00', closeTime: '17:00' },
  saturday:  { isOpen: false, openTime: '09:00', closeTime: '17:00' },
  sunday:    { isOpen: false, openTime: '09:00', closeTime: '17:00' },
};

export interface AppointmentData {
  practitionerId: string;
  patientId: string;
  start: string;
  end: string;
  title?: string;
  notes?: string;
  status?: string;
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly gateway: AppointmentsGateway,
    private readonly availabilityService: AvailabilityService,
    private readonly practitionersService: PractitionersService,
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

    const participants = [
      String(appt.patientId),
      String(appt.practitionerId),
    ];

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

      // Reject any overlap with an existing, still-live booking for the same
      // practitioner. [start, end) semantics: a slot ending exactly when the
      // next one starts does not count as an overlap.
      const overlapping = await this.appointmentModel.exists({
        practitionerId: new Types.ObjectId(data.practitionerId),
        status: { $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
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
      if (error instanceof BadRequestException || error instanceof ConflictException) {
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
      .find({ patientId: new Types.ObjectId(patientId), ...practiceScopeFilter(practiceId) })
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
    const previousStart = existing?.start?.toISOString();

    const updated = await this.appointmentModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        title: data.title,
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
      apptDate.getUTCMonth()    === today.getUTCMonth()    &&
      apptDate.getUTCDate()     === today.getUTCDate();

    if (!sameDay) {
      throw new BadRequestException('You can only check in on the day of your appointment');
    }

    const allowedStatuses = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];
    if (!allowedStatuses.includes(appt.status as AppointmentStatus)) {
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
    const patient = await (this.appointmentModel.db.model('Patient') as any)
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
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

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
    const PatientModel = this.appointmentModel.db.model('Patient') as any;
    const patientIds = appointments.map((a) => a.patientId);
    const patients = await PatientModel.find({ _id: { $in: patientIds } })
      .select('firstName lastName')
      .lean();

    const patientMap = new Map<string, { firstName: string; lastName: string }>(
      patients.map((p: any) => [p._id.toString(), p]),
    );

    return appointments.map((a) => {
      const p = patientMap.get(a.patientId.toString());
      return {
        id: (a._id as Types.ObjectId).toString(),
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
    if (!date) {
      throw new BadRequestException('Date is required');
    }

    // 1. Resolve the day schedule from practiceHours (or fall back to defaults)
    const practitioner = await this.practitionersService.findById(practitionerId);
    const savedHours = practitioner.practiceHours as Record<string, DaySchedule> | undefined;

    const dayIndex = new Date(`${date}T00:00:00`).getDay();
    const dayKey = DAY_KEYS[dayIndex];
    const daySchedule: DaySchedule =
      savedHours?.[dayKey] ?? DEFAULT_HOURS[dayKey];

    if (!daySchedule.isOpen) {
      return [];
    }

    // 2. Get manually blocked slots
    const blocks = await this.availabilityService.fetchBlockedSlots(practitionerId);

    // 3. Get existing appointments for this day (to mark booked)
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd   = new Date(`${date}T23:59:59`);

    const appointments = await this.appointmentModel.find({
      practitionerId: new Types.ObjectId(practitionerId),
      start: { $gte: dayStart, $lte: dayEnd },
    });

    // 4. Generate 30-min slots within practice open hours
    const slots: { start: string; end: string; isBooked: boolean }[] = [];
    let current = new Date(`${date}T${daySchedule.openTime}:00`);
    const end    = new Date(`${date}T${daySchedule.closeTime}:00`);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd   = new Date(current.getTime() + 30 * 60_000);

      const isBooked = appointments.some(
        (a) => new Date(a.start).getTime() === slotStart.getTime(),
      );

      const isBlocked = blocks.some((b: any) => {
        if (b.blockType === 'day') return b.date === date;
        if (b.blockType === 'slot' && b.date && b.startTime) {
          return new Date(`${b.date}T${b.startTime}:00`).getTime() === slotStart.getTime();
        }
        return false;
      });

      if (!isBlocked) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          isBooked,
        });
      }

      current = slotEnd;
    }

    return slots;
  }
}
