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
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
