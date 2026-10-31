import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/** Global so any feature module can send email without importing this. */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
