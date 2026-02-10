import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PractitionerSchema } from './schemas/practitioner.schema';
import { Practitioner } from './schemas/practitioner.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Practitioner.name, schema: PractitionerSchema },
    ]),
  ],
})
export class PractitionersModule {}
