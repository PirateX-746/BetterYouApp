import {
  Controller,
  Post,
  Body,
  HttpCode,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreatePatientDto } from './dto/patient-signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Public } from '../common/decorators/public.decorator';
import { AUTH_COOKIE, ROLE_COOKIE, authCookieOptions } from './auth.cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('patient/signup')
  patientSignup(@Body() dto: CreatePatientDto) {
    return this.authService.patientSignup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // The session is delivered as an HttpOnly cookie so page scripts (and
    // therefore any XSS) cannot read the token, and a signed-in user cannot
    // edit their own role.
    const options = authCookieOptions();
    res.cookie(AUTH_COOKIE, result.access_token, options);
    res.cookie(ROLE_COOKIE, result.role, options);

    // access_token is deliberately not returned in the body — the cookie is
    // the session. The rest is display data for the UI.
    const { access_token: _token, ...safe } = result;
    void _token;
    return safe;
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
    void _maxAge;
    res.clearCookie(AUTH_COOKIE, clearOptions);
    res.clearCookie(ROLE_COOKIE, clearOptions);
    return { message: 'Logged out' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: { user: { userId: string; role: Role } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, req.user.role, dto);
  }
}
