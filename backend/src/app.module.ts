import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { PractitionersModule } from './practitioners/practitioners.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
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
    PrescriptionsModule,
    SseModule,
    ProgressNotesModule,
    FollowUpNotesModule,
    TreatmentPlansModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
