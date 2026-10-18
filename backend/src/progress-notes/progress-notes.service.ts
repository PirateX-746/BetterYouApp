import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProgressNote } from './schemas/progress-note.schema';
import { CreateProgressNoteDto } from './dto/create-progress-note.dto';
import { UpdateProgressNoteDto } from './dto/update-progress-note.dto';
import { practiceScopeFilter, practiceStamp } from '../common/tenancy/practice-scope';

@Injectable()
export class ProgressNotesService {
  constructor(
    @InjectModel(ProgressNote.name)
    private readonly progressNoteModel: Model<ProgressNote>,
  ) {}

  async create(dto: CreateProgressNoteDto, practiceId: string | null) {
    const note = await this.progressNoteModel.create({
      ...dto,
      practiceId: practiceStamp(practiceId),
    });
    return this.progressNoteModel
      .findById(note._id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.progressNoteModel
      .find({ patientId: new Types.ObjectId(patientId), ...practiceScopeFilter(practiceId) })
      .populate('practitionerId', 'firstName lastName')
      .sort({ sessionDate: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string, practiceId: string | null) {
    return this.progressNoteModel
      .find({ practitionerId: new Types.ObjectId(practitionerId), ...practiceScopeFilter(practiceId) })
      .populate('patientId', 'firstName lastName')
      .sort({ sessionDate: -1 })
      .lean();
  }

  async findById(id: string, practiceId: string | null) {
    const note = await this.progressNoteModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Progress note not found');
    return note;
  }

  async update(id: string, dto: UpdateProgressNoteDto, practiceId: string | null) {
    const note = await this.progressNoteModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: dto },
        { new: true },
      )
      .populate('patientId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Progress note not found');
    return note;
  }

  async remove(id: string, practiceId: string | null) {
    const note = await this.progressNoteModel.findOneAndDelete({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });
    if (!note) throw new NotFoundException('Progress note not found');
    return { deleted: true };
  }

}
