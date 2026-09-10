import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get('stream')
  stream(
    @Query('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!userId) {
      res.status(400).json({ message: 'userId is required' });
      return;
    }

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
