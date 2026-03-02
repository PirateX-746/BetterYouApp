import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { AppointmentsGateway } from './appointments.gateway';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly gateway: AppointmentsGateway,
    private readonly availabilityService: AvailabilityService,
  ) { }

  /* =====================================================
     BASIC DATE VALIDATION
     ===================================================== */

  private validateAppointmentDate(start: string) {
    const startDate = new Date(start);
    const now = new Date();

    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date');
    }

    // Allow small tolerance (2 minutes) for drag operations
    const toleranceMs = 2 * 60 * 1000;

    if (startDate.getTime() < now.getTime() - toleranceMs) {
      throw new BadRequestException('Cannot book appointment in the past');
    }

    if (startDate.getDay() === 0) {
      throw new BadRequestException('Appointments are not allowed on Sunday');
    }
  }

  /* =====================================================
     OVERLAP & BLOCK VALIDATION
     ===================================================== */

  private async ensureNoOverlap(
    practitionerId: string,
    start: string,
    end: string,
    excludeId?: string,
  ) {
    if (!practitionerId || !start || !end) {
      throw new BadRequestException(
        'practitionerId, start, and end are required',
      );
    }

    if (!Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID format');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid start or end date');
    }

    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('End time must be after start time');
    }

    /* ========= 1️⃣ Appointment Overlap ========= */

    const query: any = {
      practitionerId: new Types.ObjectId(practitionerId),
      start: { $lt: endDate },
      end: { $gt: startDate },
    };

    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const conflict = await this.appointmentModel.findOne(query);

    if (conflict) {
      throw new BadRequestException(
        'This time slot is already booked. Please choose another time.',
      );
    }

    /* ========= 2️⃣ Availability Block Check ========= */

    const isoDateString = startDate.toISOString().split('T')[0];

    const requestedStartTime =
      String(startDate.getUTCHours()).padStart(2, '0') +
      ':' +
      String(startDate.getUTCMinutes()).padStart(2, '0');

    const requestedEndTime =
      String(endDate.getUTCHours()).padStart(2, '0') +
      ':' +
      String(endDate.getUTCMinutes()).padStart(2, '0');

    const blockedSlots =
      await this.availabilityService.fetchBlockedSlots(practitionerId);

    const isBlocked = blockedSlots.some((block) => {
      if (block.date !== isoDateString) return false;

      // Entire day blocked
      if (block.blockType === 'day') return true;

      // Specific slot blocked
      if (block.blockType === 'slot' && block.startTime && block.endTime) {
        return (
          requestedStartTime < block.endTime &&
          requestedEndTime > block.startTime
        );
      }

      return false;
    });

    if (isBlocked) {
      throw new BadRequestException(
        'The practitioner is unavailable during this time. Please select another slot.',
      );
    }
  }

  /* =====================================================
     CREATE APPOINTMENT
     ===================================================== */

  async create(data: any) {
    try {
      if (!data.practitionerId || !Types.ObjectId.isValid(data.practitionerId)) {
        throw new BadRequestException('Invalid or missing practitioner ID');
      }

      if (!data.patientId || !Types.ObjectId.isValid(data.patientId)) {
        throw new BadRequestException('Invalid or missing patient ID');
      }

      if (!data.start || !data.end) {
        throw new BadRequestException('Start and end time are required');
      }

      this.validateAppointmentDate(data.start);

      await this.ensureNoOverlap(data.practitionerId, data.start, data.end);

      const appointment = await this.appointmentModel.create({
        ...data,
        practitionerId: new Types.ObjectId(data.practitionerId),
        patientId: new Types.ObjectId(data.patientId),
      });

      const formatted = this.formatAppointment(appointment);

      this.gateway.emitAppointmentUpdate(formatted.patientId, formatted);

      return formatted;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Failed to create appointment');
    }
  }

  /* =====================================================
   FETCH BY PRACTITIONER
   ===================================================== */

  async findByPractitioner(practitionerId: string) {
    if (!practitionerId || !Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID');
    }

    const practitionerObjectId = new Types.ObjectId(practitionerId);

    const appointments = await this.appointmentModel
      .find({ practitionerId: practitionerObjectId })
      .sort({ start: 1 })
      .exec();

    return appointments.map(this.formatAppointment);
  }

  /* =====================================================
   FETCH BY PATIENT
   ===================================================== */

  async findByPatient(patientId: string) {
    if (!patientId || !Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID');
    }

    const patientObjectId = new Types.ObjectId(patientId);

    const appointments = await this.appointmentModel
      .find({ patientId: patientObjectId })
      .sort({ start: -1 })
      .exec();

    return appointments.map(this.formatAppointment);
  }

  /* =====================================================
     UPDATE APPOINTMENT
     ===================================================== */

  async updateById(id: string, data: any) {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    if (!data.practitionerId || !Types.ObjectId.isValid(data.practitionerId)) {
      throw new BadRequestException('Invalid or missing practitioner ID');
    }

    if (!data.start || !data.end) {
      throw new BadRequestException('Start and end time are required');
    }

    this.validateAppointmentDate(data.start);

    await this.ensureNoOverlap(data.practitionerId, data.start, data.end, id);

    const { patientId, practitionerId, ...updatableData } = data;

    const updated = await this.appointmentModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updatableData,
      { new: true },
    );

    if (!updated) {
      throw new BadRequestException('Appointment not found');
    }

    const formatted = this.formatAppointment(updated);

    this.gateway.emitAppointmentUpdate(formatted.patientId, formatted);

    return formatted;
  }

  /* =====================================================
     DELETE APPOINTMENT
     ===================================================== */

  async deleteById(id: string) {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    const deleted = await this.appointmentModel.findByIdAndDelete(
      new Types.ObjectId(id),
    );

    if (!deleted) return null;

    const formatted = this.formatAppointment(deleted);

    this.gateway.emitAppointmentUpdate(formatted.patientId, {
      ...formatted,
      deleted: true,
    });

    return formatted;
  }

  /* =====================================================
     FORMAT HELPER
     ===================================================== */

  private formatAppointment = (a: AppointmentDocument) => ({
    id: a._id.toString(),
    title: a.title,
    start: a.start,
    end: a.end,
    practitionerId: a.practitionerId?.toString(),
    patientId: a.patientId?.toString(),
    notes: a.notes,
    status: a.status,
  });

  /* =====================================================
     AVAILABILITY SLOTS (FOR PATIENT BOOKING)
     ===================================================== */

  async getAvailability(practitionerId: string, date: string) {
    if (!practitionerId || !Types.ObjectId.isValid(practitionerId)) {
      throw new BadRequestException('Invalid practitioner ID');
    }

    if (!date) {
      throw new BadRequestException('Date is required (YYYY-MM-DD)');
    }

    // Working hours: 10:00–18:00 in server local time (1-hour slots)
    // Use local time (no trailing "Z") so patients see 10:00 locally
    const workStart = new Date(`${date}T10:00:00`);
    const workEnd = new Date(`${date}T18:00:00`);

    if (isNaN(workStart.getTime()) || isNaN(workEnd.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const now = new Date();

    // Existing appointments overlapping working hours
    const existingAppointments = await this.appointmentModel
      .find({
        practitionerId: new Types.ObjectId(practitionerId),
        start: { $lt: workEnd },
        end: { $gt: workStart },
      })
      .exec();

    // Availability blocks (day/slot)
    const blockedSlots = await this.availabilityService.fetchBlockedSlots(
      practitionerId,
    );

    const slots: { start: string; end: string }[] = [];

    const SLOT_MINUTES = 60;
    const slotMs = SLOT_MINUTES * 60 * 1000;

    for (
      let cursor = new Date(workStart);
      cursor < workEnd;
      cursor = new Date(cursor.getTime() + slotMs)
    ) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + slotMs);

      if (slotEnd > workEnd) break;

      // Skip slots in the past
      if (slotStart < now) continue;

      const isoDateString = `${slotStart.getFullYear()}-${String(
        slotStart.getMonth() + 1,
      ).padStart(2, '0')}-${String(slotStart.getDate()).padStart(2, '0')}`;

      const requestedStartTime =
        String(slotStart.getHours()).padStart(2, '0') +
        ':' +
        String(slotStart.getMinutes()).padStart(2, '0');

      const requestedEndTime =
        String(slotEnd.getHours()).padStart(2, '0') +
        ':' +
        String(slotEnd.getMinutes()).padStart(2, '0');

      // 1) Check against availability blocks
      const isBlocked = blockedSlots.some((block) => {
        if (block.date !== isoDateString) return false;

        if (block.blockType === 'day') return true;

        if (block.blockType === 'slot' && block.startTime && block.endTime) {
          return (
            requestedStartTime < block.endTime &&
            requestedEndTime > block.startTime
          );
        }

        return false;
      });

      if (isBlocked) continue;

      // 2) Check overlap with existing appointments
      const hasConflict = existingAppointments.some((appt) => {
        const apptStart = new Date(appt.start);
        const apptEnd = new Date(appt.end);

        return slotStart < apptEnd && slotEnd > apptStart;
      });

      if (hasConflict) continue;

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }

    return slots;
  }
}
