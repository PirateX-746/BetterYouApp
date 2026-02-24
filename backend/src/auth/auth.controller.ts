import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { PractitionerSignupDto } from './dto/practitioner-signup.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('patient/signup')
  patientSignup(@Body() dto: PatientSignupDto) {
    return this.authService.patientSignup(dto);
  }

  @Post('practitioner/signup')
  practitionerSignup(@Body() dto: PractitionerSignupDto) {
    return this.authService.practitionerSignup(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
