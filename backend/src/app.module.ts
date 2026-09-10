import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
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
  ],

  controllers: [AppController],
  providers: [
    AppService,
    // Authentication and role checks are applied globally so that every
    // endpoint is protected by default. A route becomes reachable without a
    // session only by opting out explicitly with @Public(). Registration
    // order matters: JwtAuthGuard must populate request.user before
    // RolesGuard inspects it.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
