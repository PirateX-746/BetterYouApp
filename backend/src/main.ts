import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { allowedOrigins } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // JSON API only — CSP's default-src is irrelevant here since nothing HTML
  // is ever served, but the rest (nosniff, no-referrer, HSTS, frame-deny)
  // protects the handful of routes that do return browser-rendered content
  // (documents, avatars) from being embedded or sniffed cross-origin.
  app.use(helmet());

  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });

  // The JWT session arrives as an HttpOnly cookie, so it has to be parsed
  // before the passport strategy can read it.
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
