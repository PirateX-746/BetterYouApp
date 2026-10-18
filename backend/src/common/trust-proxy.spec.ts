import { assertTrustProxySafe, parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['  ', undefined],
    ['true', true],
    ['false', false],
    ['1', 1],
    [' 2 ', 2],
    ['loopback', 'loopback'],
    ['10.0.0.0/8, 172.16.0.0/12', '10.0.0.0/8, 172.16.0.0/12'],
  ])('%j → %j', (raw, expected) => {
    expect(parseTrustProxy(raw)).toEqual(expected);
  });
});

describe('assertTrustProxySafe', () => {
  it('refuses "trust everything" in production', () => {
    expect(() => assertTrustProxySafe(true, 'production')).toThrow(/spoof/);
  });

  it.each([
    [true, 'development'],
    [1, 'production'],
    ['loopback', 'production'],
    [undefined, 'production'],
  ])('allows %j in %s', (value, env) => {
    expect(() => assertTrustProxySafe(value, env)).not.toThrow();
  });
});
