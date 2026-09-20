import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  MedicalDocument,
  DocumentDocument,
  DocumentStatus,
} from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { practiceScopeFilter, practiceStamp } from '../common/tenancy/practice-scope';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(MedicalDocument.name)
    private documentModel: Model<DocumentDocument>,
  ) {}

  async create(dto: CreateDocumentDto, practiceId: string | null) {
    return this.documentModel.create({
      ...dto,
      date: new Date(dto.date),
      practiceId: practiceStamp(practiceId),
    });
  }

  async findByPatient(patientId: string, practiceId: string | null) {
    return this.documentModel
      .find({ patient: new Types.ObjectId(patientId), ...practiceScopeFilter(practiceId) })
      .populate('doctor', 'firstName lastName')
      .populate('patient', 'firstName lastName')
      .sort({ date: -1 })
      .lean();
  }

  async findOne(id: string, practiceId: string | null) {
    const doc = await this.documentModel
      .findOne({ _id: id, ...practiceScopeFilter(practiceId) })
      .populate('doctor', 'firstName lastName')
      .populate('patient', 'firstName lastName')
      .lean();

    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto, practiceId: string | null) {
    const document = await this.documentModel.findOne({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });

    if (!document) throw new NotFoundException('Document not found');

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Cannot edit finalized or signed document');
    }

    Object.assign(document, dto);
    return document.save();
  }

  async remove(id: string, practiceId: string | null) {
    const deleted = await this.documentModel.findOneAndDelete({
      _id: id,
      ...practiceScopeFilter(practiceId),
    });

    if (!deleted) throw new NotFoundException('Document not found');

    return { message: 'Document deleted successfully' };
  }

}
