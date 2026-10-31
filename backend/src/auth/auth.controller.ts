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
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreatePatientDto } from './dto/patient-signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  PlatformForgotPasswordDto,
  PlatformLoginDto,
} from './dto/platform-login.dto';
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
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
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

  /**
   * Platform console sign-in. Separate entrance from the practice login —
   * the two never accept each other's credentials.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post('platform/login')
  @HttpCode(200)
  async platformLogin(
    @Body() dto: PlatformLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.platformLogin(dto);

    const options = authCookieOptions();
    res.cookie(AUTH_COOKIE, result.access_token, options);
    res.cookie(ROLE_COOKIE, result.role, options);

    const { access_token: _token, ...safe } = result;
    void _token;
    return safe;
  }

  // Strictest bucket in the app: this endpoint resets the password of any
  // account given only an email, so it is both a brute-force surface and a
  // lock-everyone-out vector.
  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 4 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Same strict bucket as the practice forgot-password.
  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 4 } })
  @Post('platform/forgot-password')
  @HttpCode(200)
  platformForgotPassword(@Body() dto: PlatformForgotPasswordDto) {
    return this.authService.platformForgotPassword(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 8 } })
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
