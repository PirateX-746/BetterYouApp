import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PracticesService } from './practices.service';
import { Practice, PracticeSchema } from './schemas/practice.schema';

/**
 * Global because the resolver middleware and TenantGuard both need
 * PracticesService, and neither belongs to a feature module.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Practice.name, schema: PracticeSchema },
    ]),
  ],
  providers: [PracticesService],
  exports: [PracticesService, MongooseModule],
})
export class PracticesModule {}
