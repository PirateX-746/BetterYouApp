import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { AppointmentsGateway } from './appointments.gateway';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly gateway: AppointmentsGateway,
  ) {}

  /* =====================================================
     BASIC VALIDATIONS
     ===================================================== */

  private validateAppointmentDate(start: string) {
    const startDate = new Date(start);
    const now = new Date();

    if (startDate < now) {
      throw new BadRequestException('Cannot book appointment in the past');
    }

    if (startDate.getDay() === 0) {
      throw new BadRequestException('Appointments are not allowed on Sunday');
    }
  }

  /* =====================================================
     OVERLAP VALIDATION
     ===================================================== */

  private async ensureNoOverlap(
    practitionerId: string,
    start: string,
    end: string,
    excludeId?: string,
  ) {
    const query: any = {
      practitionerId: new Types.ObjectId(practitionerId),
      start: { $lt: new Date(end) },
      end: { $gt: new Date(start) },
    };

    if (excludeId) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const conflict = await this.appointmentModel.findOne(query);

    if (conflict) {
      throw new BadRequestException(
        'This time slot is already booked. Please choose another time.',
      );
    }
  }

  /* =====================================================
     CREATE APPOINTMENT (REAL-TIME ENABLED)
     ===================================================== */

  async create(data: any) {
    this.validateAppointmentDate(data.start);

    await this.ensureNoOverlap(data.practitionerId, data.start, data.end);

    const appointment = await this.appointmentModel.create({
      ...data,
      practitionerId: new Types.ObjectId(data.practitionerId),
      patientId: new Types.ObjectId(data.patientId),
    });

    const formatted = this.formatAppointment(appointment);

    // 🔥 Emit real-time event to patient
    this.gateway.emitAppointmentUpdate(formatted.patientId, formatted);

    return formatted;
  }

  /* =====================================================
     FETCH BY PRACTITIONER
     ===================================================== */

  async findByPractitioner(practitionerId: string) {
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
    const patientObjectId = new Types.ObjectId(patientId);

    const appointments = await this.appointmentModel
      .find({ patientId: patientObjectId })
      .sort({ start: -1 })
      .exec();

    return appointments.map(this.formatAppointment);
  }

  /* =====================================================
     UPDATE APPOINTMENT (REAL-TIME ENABLED)
     ===================================================== */

  async updateById(id: string, data: any) {
    this.validateAppointmentDate(data.start);

    await this.ensureNoOverlap(data.practitionerId, data.start, data.end, id);

    const { patientId, practitionerId, ...updatableData } = data;

    const updated = await this.appointmentModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updatableData,
      { new: true },
    );

    if (!updated) return null;

    const formatted = this.formatAppointment(updated);

    // 🔥 Emit update event
    this.gateway.emitAppointmentUpdate(formatted.patientId, formatted);

    return formatted;
  }

  /* =====================================================
     DELETE APPOINTMENT (REAL-TIME ENABLED)
     ===================================================== */

  async deleteById(id: string) {
    const deleted = await this.appointmentModel.findByIdAndDelete(
      new Types.ObjectId(id),
    );

    if (!deleted) return null;

    const formatted = this.formatAppointment(deleted);

    // 🔥 Emit delete event
    this.gateway.emitAppointmentUpdate(formatted.patientId, {
      ...formatted,
      deleted: true,
    });

    return formatted;
  }

  /* =====================================================
     HELPER: FORMAT APPOINTMENT
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
}
