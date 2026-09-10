import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProgressNote } from './schemas/progress-note.schema';
import { CreateProgressNoteDto } from './dto/create-progress-note.dto';
import { UpdateProgressNoteDto } from './dto/update-progress-note.dto';

@Injectable()
export class ProgressNotesService {
  constructor(
    @InjectModel(ProgressNote.name)
    private readonly progressNoteModel: Model<ProgressNote>,
  ) {}

  async create(dto: CreateProgressNoteDto) {
    const note = await this.progressNoteModel.create(dto);
    return this.progressNoteModel
      .findById(note._id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
  }

  async findByPatient(patientId: string) {
    return this.progressNoteModel
      .find({ patientId })
      .populate('practitionerId', 'firstName lastName')
      .sort({ sessionDate: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string) {
    return this.progressNoteModel
      .find({ practitionerId })
      .populate('patientId', 'firstName lastName')
      .sort({ sessionDate: -1 })
      .lean();
  }

  async findById(id: string) {
    const note = await this.progressNoteModel
      .findById(id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Progress note not found');
    return note;
  }

  async update(id: string, dto: UpdateProgressNoteDto) {
    const note = await this.progressNoteModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('patientId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Progress note not found');
    return note;
  }

  async remove(id: string) {
    const note = await this.progressNoteModel.findByIdAndDelete(id);
    if (!note) throw new NotFoundException('Progress note not found');
    return { deleted: true };
  }
}
