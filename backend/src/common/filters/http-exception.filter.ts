import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const resObj = res as { message?: string | string[] };
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join(', ');
        } else {
          message = resObj.message ?? message;
        }
      }
    } else if (exception instanceof Error) {
      const mongoErr = exception as Error & { code?: number; kind?: string };
      if (mongoErr.code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'A record with this information already exists';
      } else if (mongoErr.name === 'CastError') {
        // A malformed id (e.g. GET /patients/abc) fails Mongoose's ObjectId
        // cast before any query runs. That is a bad request, not a crash.
        status = HttpStatus.BAD_REQUEST;
        message =
          mongoErr.kind === 'ObjectId' ? 'Invalid id' : 'Invalid request';
      } else {
        this.logger.error(exception.message, exception.stack);
      }
    } else {
      this.logger.error('Unknown exception', String(exception));
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
