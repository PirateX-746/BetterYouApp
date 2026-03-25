import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { AppointmentsGateway } from './appointments.gateway';
import { AvailabilityService } from '../availability/availability.service';

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
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly gateway: AppointmentsGateway,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /* =====================================================
     CREATE APPOINTMENT
     ===================================================== */

  async create(data: AppointmentData) {
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

      const appointment = await this.appointmentModel.create({
        ...data,
        practitionerId: new Types.ObjectId(data.practitionerId),
        patientId: new Types.ObjectId(data.patientId),
        status: data.status || 'scheduled',
      });

      const formatted = this.formatAppointment(appointment);

      this.gateway.emitAppointmentUpdate(
        formatted.patientId,
        formatted,
        formatted.practitionerId,
      );

      return formatted;
    } catch (error: unknown) {
      console.error('Error creating appointment:', error);

      if (error instanceof BadRequestException) throw error;

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

  async findByPatient(patientId: string) {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID');
    }

    const appointments = await this.appointmentModel
      .find({ patientId: new Types.ObjectId(patientId) })
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
      formatted,
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

    if (!deleted) return null;

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
    };
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

    // 1. Get blocked slots (your existing logic)
    const blocks =
      await this.availabilityService.fetchBlockedSlots(practitionerId);

    // 2. Get existing appointments (to mark booked)
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const appointments = await this.appointmentModel.find({
      practitionerId: new Types.ObjectId(practitionerId),
      start: { $gte: startOfDay, $lte: endOfDay },
    });

    // 3. Generate slots (example: 9 AM - 6 PM, 30 min slots)
    const slots: any[] = [];

    let current = new Date(`${date}T09:00:00`);
    const end = new Date(`${date}T18:00:00`);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + 30 * 60000);

      // Check if booked
      const isBooked = appointments.some((a) => {
        return new Date(a.start).getTime() === slotStart.getTime();
      });

      // Skip blocked slots
      const isBlocked = blocks.some((b: any) => {
        // 🔴 Case 1: Full day blocked
        if (b.blockType === 'day') {
          return b.date === date;
        }

        // 🔴 Case 2: Specific time slot blocked
        if (b.blockType === 'slot') {
          if (!b.date || !b.startTime) return false;

          const blockedStart = new Date(`${b.date}T${b.startTime}:00`);
          return blockedStart.getTime() === slotStart.getTime();
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
