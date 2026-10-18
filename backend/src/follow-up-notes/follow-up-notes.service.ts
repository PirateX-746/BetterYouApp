import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUpNote } from './schemas/follow-up-note.schema';
import { CreateFollowUpNoteDto } from './dto/create-follow-up-note.dto';
import { UpdateFollowUpNoteDto } from './dto/update-follow-up-note.dto';
import { practiceScopeFilter, practiceStamp } from '../common/tenancy/practice-scope';

@Injectable()
export class FollowUpNotesService {
  constructor(
    @InjectModel(FollowUpNote.name)
    private readonly followUpNoteModel: Model<FollowUpNote>,
  ) {}

  async create(dto: CreateFollowUpNoteDto, practiceId: string | null) {
    const note = await this.followUpNoteModel.create({
      ...dto,
      practiceId: practiceStamp(practiceId),
    });
    return this.followUpNoteModel
      .findById(note._id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.followUpNoteModel
      .find({ patientId: new Types.ObjectId(patientId), ...practiceScopeFilter(practiceId) })
      .populate('practitionerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string, practiceId: string | null) {
    return this.followUpNoteModel
      .find({ practitionerId: new Types.ObjectId(practitionerId), ...practiceScopeFilter(practiceId) })
      .populate('patientId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string, practiceId: string | null) {
    const note = await this.followUpNoteModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Follow-up note not found');
    return note;
  }

  async update(id: string, dto: UpdateFollowUpNoteDto, practiceId: string | null) {
    const note = await this.followUpNoteModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: dto },
        { new: true },
      )
      .populate('patientId', 'firstName lastName')
      .lean();
    if (!note) throw new NotFoundException('Follow-up note not found');
    return note;
  }

  async remove(id: string, practiceId: string | null) {
    const note = await this.followUpNoteModel.findOneAndDelete({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });
    if (!note) throw new NotFoundException('Follow-up note not found');
    return { deleted: true };
  }

}
