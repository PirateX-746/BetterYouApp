import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProgressNote } from './schemas/progress-note.schema';
import { CreateProgressNoteDto } from './dto/create-progress-note.dto';
import { assertPatientInPractice } from '../common/tenancy/assert-in-practice';
import { withObjectIds } from '../common/object-ids';
import { UpdateProgressNoteDto } from './dto/update-progress-note.dto';
import {
  practiceScopeFilter,
  practiceStamp,
} from '../common/tenancy/practice-scope';

/**
 * A note records a session that has happened (a day of slack for the
 * practitioner's local calendar day being "tomorrow" in UTC), and its
 * follow-up can't come before it.
 */
function assertNoteDates(sessionDate: string, followUpDate?: string) {
  const session = new Date(sessionDate).getTime();
  if (session > Date.now() + 24 * 60 * 60 * 1000) {
    throw new BadRequestException("The session date can't be in the future");
  }
  if (followUpDate && new Date(followUpDate).getTime() < session) {
    throw new BadRequestException(
      "The follow-up date can't be before the session",
    );
  }
}

/**
 * The patient and author are fixed at creation; an update can't move a
 * record to another patient or re-attribute it.
 */
function editable<T extends { patientId?: string; practitionerId?: string }>(
  dto: T,
  idKeys: string[],
) {
  const {
    patientId: _patientId,
    practitionerId: _practitionerId,
    ...rest
  } = dto;
  return withObjectIds(rest, idKeys);
}

@Injectable()
export class ProgressNotesService {
  constructor(
    @InjectModel(ProgressNote.name)
    private readonly progressNoteModel: Model<ProgressNote>,
  ) {}

  async create(dto: CreateProgressNoteDto, practiceId: string | null) {
    await assertPatientInPractice(
      this.progressNoteModel.db,
      dto.patientId,
      practiceId,
    );
    assertNoteDates(dto.sessionDate, dto.followUpDate);
    const note = await this.progressNoteModel.create(
      withObjectIds({ ...dto, practiceId: practiceStamp(practiceId) }, [
        'patientId',
        'practitionerId',
        'appointmentId',
      ]),
    );
    return this.progressNoteModel
      .findById(note._id)
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .lean();
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.progressNoteModel
      .find({
        patientId: new Types.ObjectId(patientId),
        ...practiceScopeFilter(practiceId),
      })
      .populate('practitionerId', 'firstName lastName')
      .sort({ sessionDate: -1 })
      .lean();
  }

  async findByPractitioner(practitionerId: string, practiceId: string | null) {
    return this.progressNoteModel
      .find({
        practitionerId: new Types.ObjectId(practitionerId),
        ...practiceScopeFilter(practiceId),
      })
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

  async update(
    id: string,
    dto: UpdateProgressNoteDto,
    practiceId: string | null,
  ) {
    const note = await this.progressNoteModel
      .findOneAndUpdate(
        { _id: id, ...practiceScopeFilter(practiceId) },
        { $set: editable(dto, ['appointmentId']) },
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
