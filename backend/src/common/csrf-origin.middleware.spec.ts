import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CsrfOriginMiddleware } from './csrf-origin.middleware';
import { isAllowedOrigin } from './cors';

const run = (method: string, headers: Record<string, string> = {}) => {
  const next = jest.fn();
  const req = { method, headers } as unknown as Request;
  new CsrfOriginMiddleware().use(req, {} as Response, next);
  return next;
};

describe('CsrfOriginMiddleware', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    delete process.env.MULTI_TENANCY_ENABLED;
  });
  afterAll(() => {
    process.env = env;
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'lets safe method %s through from any origin',
    (m) => {
      expect(run(m, { origin: 'https://evil.example' })).toHaveBeenCalled();
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'allows %s from the frontend origin',
    (m) => {
      expect(run(m, { origin: 'https://app.example.com' })).toHaveBeenCalled();
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'blocks %s from a foreign origin',
    (m) => {
      expect(() => run(m, { origin: 'https://evil.example' })).toThrow(
        ForbiddenException,
      );
    },
  );

  it('blocks the opaque "null" origin (sandboxed iframe, data: URL)', () => {
    expect(() => run('POST', { origin: 'null' })).toThrow(ForbiddenException);
  });

  it('blocks a cross-site browser request that omits Origin', () => {
    expect(() => run('POST', { 'sec-fetch-site': 'cross-site' })).toThrow(
      ForbiddenException,
    );
  });

  it.each(['same-origin', 'same-site', 'none'])(
    'allows Sec-Fetch-Site %s without Origin',
    (s) => {
      expect(run('POST', { 'sec-fetch-site': s })).toHaveBeenCalled();
    },
  );

  it('allows non-browser clients (no Origin, no Fetch Metadata)', () => {
    expect(run('POST')).toHaveBeenCalled();
  });
});

describe('isAllowedOrigin', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.ROOT_DOMAIN = 'betteryou.app';
    process.env.NODE_ENV = 'production';
    delete process.env.MULTI_TENANCY_ENABLED;
  });
  afterAll(() => {
    process.env = env;
  });

  it('matches the configured frontend exactly', () => {
    expect(isAllowedOrigin('https://app.example.com')).toBe(true);
    expect(isAllowedOrigin('https://app.example.com.evil.io')).toBe(false);
    expect(isAllowedOrigin('http://app.example.com')).toBe(false);
  });

  it('rejects empty and malformed origins', () => {
    expect(isAllowedOrigin(undefined)).toBe(false);
    expect(isAllowedOrigin('')).toBe(false);
    expect(isAllowedOrigin('null')).toBe(false);
  });

  it('ignores tenant subdomains while tenancy is off', () => {
    expect(isAllowedOrigin('https://clinic.betteryou.app')).toBe(false);
  });

  it('allows single-label https tenant subdomains when tenancy is on', () => {
    process.env.MULTI_TENANCY_ENABLED = 'true';
    expect(isAllowedOrigin('https://clinic.betteryou.app')).toBe(true);
    expect(isAllowedOrigin('http://clinic.betteryou.app')).toBe(false);
    expect(isAllowedOrigin('https://a.b.betteryou.app')).toBe(false);
    expect(isAllowedOrigin('https://betteryou.app.evil.io')).toBe(false);
    expect(isAllowedOrigin('https://evilbetteryou.app')).toBe(false);
  });
});
