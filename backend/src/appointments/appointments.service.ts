import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  /* =====================================================
     BASIC VALIDATIONS
     ===================================================== */

  private validateAppointmentDate(start: string) {
    const startDate = new Date(start);
    const now = new Date();

    // ❌ Past booking
    if (startDate < now) {
      throw new BadRequestException('Cannot book appointment in the past');
    }

    // ❌ Sunday booking
    if (startDate.getDay() === 0) {
      throw new BadRequestException('Appointments are not allowed on Sunday');
    }
  }

  /* =====================================================
     OVERLAP VALIDATION (CORE LOGIC)
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

    // Exclude current appointment during update
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
     CREATE APPOINTMENT
     ===================================================== */

  async create(data: any) {
    this.validateAppointmentDate(data.start);

    await this.ensureNoOverlap(data.practitionerId, data.start, data.end);

    return this.appointmentModel.create({
      ...data,
      practitionerId: new Types.ObjectId(data.practitionerId),
      patientId: new Types.ObjectId(data.patientId),
    });
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

    return appointments.map((a) => ({
      _id: a._id.toString(),
      title: a.title,
      start: a.start,
      end: a.end,
      patientId: a.patientId?.toString(),
      notes: a.notes,
      status: a.status,
    }));
  }

  /* =====================================================
     UPDATE APPOINTMENT
     ===================================================== */

  async updateById(id: string, data: any) {
    this.validateAppointmentDate(data.start);

    await this.ensureNoOverlap(
      data.practitionerId,
      data.start,
      data.end,
      id, // exclude current appointment
    );

    // 🚫 patientId & practitionerId are NOT editable
    const { patientId, practitionerId, ...updatableData } = data;

    return this.appointmentModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updatableData,
      { new: true },
    );
  }

  /* =====================================================
     DELETE APPOINTMENT
     ===================================================== */

  async deleteById(id: string) {
    return this.appointmentModel.findByIdAndDelete(new Types.ObjectId(id));
  }
}
