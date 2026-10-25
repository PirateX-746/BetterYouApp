import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { httpCorsOptions } from './common/cors';
import { assertTrustProxySafe, parseTrustProxy } from './common/trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Must be set before any request is handled: req.ip (and therefore the
  // rate limiter's per-client buckets) is derived from it.
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  assertTrustProxySafe(trustProxy, process.env.NODE_ENV);
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  } else if (process.env.NODE_ENV === 'production') {
    Logger.warn(
      'TRUST_PROXY is not set. Behind a proxy every client shares one IP, ' +
        'so rate limits apply to all users together. See backend/.env.example.',
      'Bootstrap',
    );
  }

  // JSON API only — CSP's default-src is irrelevant here since nothing HTML
  // is ever served, but the rest (nosniff, no-referrer, HSTS, frame-deny)
  // protects the handful of routes that do return browser-rendered content
  // (documents, avatars) from being embedded or sniffed cross-origin.
  app.use(helmet());

  app.enableCors(httpCorsOptions());

  // The JWT session arrives as an HttpOnly cookie, so it has to be parsed
  // before the passport strategy can read it.
  // Profile photos travel as base64 JSON (a 2 MB image is ~2.7 MB encoded);
  // Express's 100 KB default turned every real photo into an error.
  app.useBodyParser('json', { limit: '4mb' });
  app.use(cookieParser());

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`, 'Bootstrap');
}
void bootstrap();
