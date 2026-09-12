import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import {
  Practitioner,
  PractitionerSchema,
} from '../practitioners/schemas/practitioner.schema';

/** Global so AdminService can issue an invite during practice onboarding. */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
      { name: Practitioner.name, schema: PractitionerSchema },
    ]),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
