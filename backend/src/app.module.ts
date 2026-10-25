import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TenantGuard } from './common/tenancy/tenant.guard';
import { PracticeResolverMiddleware } from './common/tenancy/practice-resolver.middleware';
import { CsrfOriginMiddleware } from './common/csrf-origin.middleware';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { WsAuthModule } from './common/ws/ws-auth.module';
import { PracticesModule } from './practices/practices.module';
import { PlatformAdminsModule } from './platform-admins/platform-admins.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvitationsModule } from './invitations/invitations.module';

import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { PractitionersModule } from './practitioners/practitioners.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';
import { MedicationsModule } from './medications/medications.module';
import { PatientMedicationsModule } from './patient-medications/patient-medications.module';
import { SseModule } from './sse/sse.module';
import { ProgressNotesModule } from './progress-notes/progress-notes.module';
import { FollowUpNotesModule } from './follow-up-notes/follow-up-notes.module';
import { TreatmentPlansModule } from './treatment-plans/treatment-plans.module';
import { SessionAssessmentsModule } from './session-assessments/session-assessments.module';
import { AppointmentTypesModule } from './appointment-types/appointment-types.module';
import { SupportModule } from './support/support.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    /**
     * Rate limiting. This bucket is deliberately generous — the portal is
     * chatty (calendar, chat, badge counts) and throttling normal use would
     * be worse than not throttling at all.
     *
     * Exactly ONE bucket is declared here, on purpose: every named throttler
     * registered in forRoot applies to EVERY route, so adding a strict
     * "reset" bucket alongside the default would cap the whole API at that
     * strict limit. Tighter per-route limits override this same bucket with
     * @Throttle({ default: ... }) — see AuthController.
     */
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    // Authenticates Socket.io handshakes from the session cookie.
    WsAuthModule,
    // Outgoing email (Resend in production, Mailpit/SMTP in dev).
    EmailModule,

    // Tenancy foundation. Inert until MULTI_TENANCY_ENABLED=true — these
    // register schemas and services but change no existing behaviour.
    PracticesModule,
    PlatformAdminsModule,
    AuditModule,
    SubscriptionsModule,
    InvitationsModule,
    AdminModule,

    AuthModule,
    PatientsModule,
    PractitionersModule,
    AvailabilityModule,
    AppointmentsModule,
    DocumentsModule,
    ChatModule,
    MedicationsModule,
    PatientMedicationsModule,
    SseModule,
    ProgressNotesModule,
    FollowUpNotesModule,
    TreatmentPlansModule,
    SessionAssessmentsModule,
    AppointmentTypesModule,
    SupportModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,
    // Authentication and role checks are applied globally so that every
    // endpoint is protected by default. A route becomes reachable without a
    // session only by opting out explicitly with @Public(). Registration
    // order matters: JwtAuthGuard must populate request.user before
    // RolesGuard inspects it. TenantGuard sits between them: it needs the
    // authenticated user, and confines the request to one practice before
    // any role check or handler runs.
    // Throttling runs first: a request that is over the limit should be
    // rejected before it costs a token verification or a database lookup.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Rejects forged cross-site writes before any other work is done.
    consumer.apply(CsrfOriginMiddleware).forRoutes('*');
    // Resolves the practice from the Host header for every route, including
    // public ones — login needs it to scope the lookup by practice.
    consumer.apply(PracticeResolverMiddleware).forRoutes('*');
  }
}
