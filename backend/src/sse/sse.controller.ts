import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SseService } from './sse.service';
import type { AuthUser } from '../common/auth-user';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get('stream')
  stream(@Req() req: Request, @Res() res: Response) {
    // The stream is bound to the authenticated user from the JWT. It used to
    // take ?userId= from the query string, which let anyone subscribe to
    // anyone else's notification feed.
    const { userId } = (req as Request & { user: AuthUser }).user;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Disable nginx / proxy buffering so events arrive immediately
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Initial handshake event so the client knows the stream is live
    res.write('event: connected\ndata: {}\n\n');

    const write: (chunk: string) => void = (chunk) => res.write(chunk);
    this.sseService.add(userId, write);

    // Heartbeat comment every 25 s keeps the connection alive through
    // load-balancers that time out idle keep-alives at 30 s
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      this.sseService.remove(userId, write);
    });
  }
}
