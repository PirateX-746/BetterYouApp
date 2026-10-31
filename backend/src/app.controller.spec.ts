import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const connection = { readyState: 1 };

  beforeEach(async () => {
    connection.readyState = 1;
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getConnectionToken(), useValue: connection },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('is ok while the database is connected', () => {
      expect(appController.health()).toEqual({ status: 'ok', db: 'up' });
    });

    it('is 503 when the database is down', () => {
      connection.readyState = 0;
      expect(() => appController.health()).toThrow(ServiceUnavailableException);
    });
  });
});
