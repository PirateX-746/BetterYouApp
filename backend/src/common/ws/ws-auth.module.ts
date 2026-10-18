import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WsAuthService } from './ws-auth.service';
import { Patient, PatientSchema } from '../../patients/schemas/patient.schema';
import {
  Practitioner,
  PractitionerSchema,
} from '../../practitioners/schemas/practitioner.schema';
import {
  PlatformAdmin,
  PlatformAdminSchema,
} from '../../platform-admins/schemas/platform-admin.schema';

/** Global so any gateway can authenticate a socket without extra wiring. */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: Practitioner.name, schema: PractitionerSchema },
      { name: PlatformAdmin.name, schema: PlatformAdminSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [WsAuthService],
  exports: [WsAuthService],
})
export class WsAuthModule {}
