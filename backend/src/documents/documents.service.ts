import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MedicalDocument, DocumentDocument, DocumentStatus } from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {

    constructor(
        @InjectModel(MedicalDocument.name)
        private documentModel: Model<DocumentDocument>,
    ) { }

    async create(dto: CreateDocumentDto) {
        return this.documentModel.create({
            ...dto,
            date: new Date(dto.date),
        });
    }

    async findByPatient(patientId: string) {
        return this.documentModel
            .find({ patient: patientId })
            .populate('doctor', 'firstName lastName')
            .populate('patient', 'firstName lastName')
            .sort({ date: -1 })
            .lean();
    }

    async findOne(id: string) {
        const doc = await this.documentModel
            .findById(id)
            .populate('doctor', 'firstName lastName')
            .populate('patient', 'firstName lastName')
            .lean();

        if (!doc) throw new NotFoundException('Document not found');
        return doc;
    }

    async update(id: string, dto: UpdateDocumentDto) {
        const document = await this.documentModel.findById(id);

        if (!document) throw new NotFoundException('Document not found');

        if (document.status !== DocumentStatus.DRAFT) {
            throw new BadRequestException('Cannot edit finalized or signed document');
        }

        Object.assign(document, dto);
        return document.save();
    }

    async remove(id: string) {
        const deleted = await this.documentModel.findByIdAndDelete(id);

        if (!deleted) throw new NotFoundException('Document not found');

        return { message: 'Document deleted successfully' };
    }
}
