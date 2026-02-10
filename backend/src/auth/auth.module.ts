import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Patient, PatientSchema } from 'src/patients/schemas/patient.schema';
import { jwtConstants } from './constants';
import {
  Practitioner,
  PractitionerSchema,
} from 'src/practitioners/schemas/practitioner.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: Practitioner.name, schema: PractitionerSchema },
    ]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
