import { allowedOrigins } from './cors';

describe('allowedOrigins', () => {
  it('allows FRONTEND_URL and CORS_ORIGINS, trimmed and without trailing slashes', () => {
    expect(
      allowedOrigins({
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://app.clinic.com/',
        CORS_ORIGINS: ' https://www.clinic.com , https://clinic.com/ ,',
      }),
    ).toEqual([
      'https://app.clinic.com',
      'https://www.clinic.com',
      'https://clinic.com',
    ]);
  });

  it('never allows localhost in production', () => {
    const origins = allowedOrigins({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://app.clinic.com',
    });
    expect(origins).not.toContain('http://localhost:3000');
  });

  it('allows localhost in development', () => {
    expect(allowedOrigins({ NODE_ENV: 'development' })).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });
});
