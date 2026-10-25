import { subdomainFrom } from './subdomain';

describe('subdomainFrom', () => {
  describe('production host', () => {
    const root = 'betteryou.app';

    it('extracts a practice subdomain', () => {
      expect(subdomainFrom('abc.betteryou.app', root)).toBe('abc');
    });

    it('returns null on the apex — no tenant', () => {
      expect(subdomainFrom('betteryou.app', root)).toBeNull();
    });

    it('returns the console label like any other', () => {
      // The caller decides that "admin" means the platform console.
      expect(subdomainFrom('admin.betteryou.app', root)).toBe('admin');
    });

    it('rejects a host outside the root domain', () => {
      expect(subdomainFrom('evil.com', root)).toBeNull();
    });

    it('rejects a look-alike domain that merely ends with the root text', () => {
      // "notbetteryou.app" must not resolve — the boundary is a dot.
      expect(subdomainFrom('notbetteryou.app', root)).toBeNull();
    });

    it('rejects a spoofed suffix host', () => {
      expect(subdomainFrom('betteryou.app.evil.com', root)).toBeNull();
    });

    it('rejects multi-label subdomains', () => {
      expect(subdomainFrom('a.b.betteryou.app', root)).toBeNull();
    });
  });

  describe('local development', () => {
    const root = 'localhost';

    it('extracts from a *.localhost host with a port', () => {
      expect(subdomainFrom('abc.localhost:3000', root)).toBe('abc');
    });

    it('returns null for bare localhost', () => {
      expect(subdomainFrom('localhost:3000', root)).toBeNull();
    });
  });

  describe('robustness', () => {
    it('is case-insensitive', () => {
      expect(subdomainFrom('ABC.BetterYou.App', 'betteryou.app')).toBe('abc');
    });

    it('tolerates surrounding whitespace', () => {
      expect(subdomainFrom('  abc.betteryou.app  ', 'betteryou.app')).toBe(
        'abc',
      );
    });

    it('returns null for missing input', () => {
      expect(subdomainFrom(undefined, 'betteryou.app')).toBeNull();
      expect(subdomainFrom(null, 'betteryou.app')).toBeNull();
      expect(subdomainFrom('', 'betteryou.app')).toBeNull();
    });

    it('returns null when no root domain is configured', () => {
      expect(subdomainFrom('abc.betteryou.app', '')).toBeNull();
    });
  });
});
