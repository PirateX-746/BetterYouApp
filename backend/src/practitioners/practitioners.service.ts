import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Practitioner } from './schemas/practitioner.schema';

@Injectable()
export class PractitionersService {
    constructor(
        @InjectModel(Practitioner.name)
        private readonly practitionerModel: Model<Practitioner>,
    ) { }

    async findAll() {
        return this.practitionerModel.find().select('-password').lean();
    }

    async findById(id: string) {
        return this.practitionerModel.findById(id).select('-password').lean();
    }
}
