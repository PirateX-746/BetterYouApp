import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, Matches, MinLength } from 'class-validator';
import { InvitationsService } from './invitations.service';
import { Public } from '../common/decorators/public.decorator';

class AcceptInvitationDto {
  @IsString()
  token: string;

  // Same rules as ChangePasswordDto: an invited account's first password
  // shouldn't be weaker than any later one.
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain 1 uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain 1 number' })
  @Matches(/[!@#$%^&*]/, {
    message: 'Password must contain 1 special character',
  })
  password: string;
}

/**
 * Public endpoints for accepting an invitation.
 *
 * These are @Public by necessity — the invitee has no account yet. The
 * token is the credential, so both routes are throttled and the token is
 * matched against a stored hash, never a plaintext value.
 */
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  /** Lets the accept page show who and which practice the invite is for. */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get()
  lookup(@Query('token') token: string) {
    return this.invitations.lookup(token);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(dto.token, dto.password);
  }
}
