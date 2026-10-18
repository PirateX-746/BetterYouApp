import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportTicket, SupportTicketSchema } from './schemas/support-ticket.schema';
import { SupportMessage, SupportMessageSchema } from './schemas/support-message.schema';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { SupportCounter, SupportCounterSchema } from './schemas/support-counter.schema';
import { Practitioner, PractitionerSchema } from '../practitioners/schemas/practitioner.schema';
import { Practice, PracticeSchema } from '../practices/schemas/practice.schema';
import { PlatformAdmin, PlatformAdminSchema } from '../platform-admins/schemas/platform-admin.schema';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { SupportGateway } from './support.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupportTicket.name, schema: SupportTicketSchema },
      { name: SupportMessage.name, schema: SupportMessageSchema },
      { name: Faq.name, schema: FaqSchema },
      { name: SupportCounter.name, schema: SupportCounterSchema },
      { name: Practitioner.name, schema: PractitionerSchema },
      { name: Practice.name, schema: PracticeSchema },
      { name: PlatformAdmin.name, schema: PlatformAdminSchema },
    ]),
    StorageModule,
    AuditModule,
  ],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService, SupportGateway],
})
export class SupportModule {}
