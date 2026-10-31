import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { SkipThrottle } from '@nestjs/throttler';
import { ConnectionStates, type Connection } from 'mongoose';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Liveness + readiness for the host's health check and uptime monitors:
   * 200 while the database is connected, 503 otherwise, so a server that
   * lost MongoDB shows as unhealthy instead of quietly serving errors.
   */
  @Public()
  @SkipThrottle()
  @Get('health')
  health() {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up' };
  }
}
