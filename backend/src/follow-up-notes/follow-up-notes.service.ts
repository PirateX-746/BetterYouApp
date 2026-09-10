import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FollowUpNote } from './schemas/follow-up-note.schema';
import { CreateFollowUpNoteDto } from './dto/create-follow-up-note.dto';
import { UpdateFollowUpNoteDto } from './dto/update-follow-up-note.dto';

@Injectable()
export class FollowUpNotesService {
  constructor(
    @InjectModel(FollowUpNote.name)
    private readonly followUpNoteModel: Model<FollowUpNote>,
  ) {}

  async create(dto: CreateFollowUpNoteDto) {
    const note = await this.followUpNoteModel.create(dto);
    return this.followUpNoteModel
      .findById(note._id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
  }

  async findByPatient(patientId: string) {
    return this.followUpNoteModel
      .find({ patientId })
      .populate('practitionerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string) {
    return this.followUpNoteModel
      .find({ practitionerId })
      .populate('patientId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string) {
    const note = await this.followUpNoteModel
      .findById(id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Follow-up note not found');
    return note;
  }

  async update(id: string, dto: UpdateFollowUpNoteDto) {
    const note = await this.followUpNoteModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('patientId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Follow-up note not found');
    return note;
  }

  async remove(id: string) {
    const note = await this.followUpNoteModel.findByIdAndDelete(id);
    if (!note) throw new NotFoundException('Follow-up note not found');
    return { deleted: true };
  }
}
