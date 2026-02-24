import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PractitionerSchema } from './schemas/practitioner.schema';
import { Practitioner } from './schemas/practitioner.schema';
import { PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Practitioner.name, schema: PractitionerSchema },
    ]),
  ],
  controllers: [PractitionersController],
  providers: [PractitionersService],
  exports: [PractitionersService],
})
export class PractitionersModule { }
