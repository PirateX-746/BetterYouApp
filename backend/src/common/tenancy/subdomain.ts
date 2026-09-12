/**
 * Extracts the tenant subdomain from a Host header.
 *
 * One helper for both environments: in development the root domain is
 * `localhost` (browsers resolve `*.localhost` to 127.0.0.1 with no hosts-file
 * editing), in production it is the real apex.
 *
 *   abc.betteryou.app      → "abc"
 *   abc.localhost:3000     → "abc"
 *   betteryou.app          → null   (apex — marketing site, no tenant)
 *   admin.betteryou.app    → "admin" (caller decides this means the console)
 *   evil.com               → null   (not under the root domain)
 */
export function subdomainFrom(
  host: string | undefined | null,
  rootDomain: string,
): string | null {
  if (!host || !rootDomain) return null;

  // Strip the port, and an IPv6 bracket form if one shows up.
  const hostname = host.trim().toLowerCase().split(':')[0].replace(/^\[|\]$/g, '');
  const root = rootDomain.trim().toLowerCase();

  if (!hostname || hostname === root) return null;
  if (!hostname.endsWith('.' + root)) return null;

  const label = hostname.slice(0, -(root.length + 1));

  // Only a single label is a tenant. "a.b.betteryou.app" is not "a.b".
  if (!label || label.includes('.')) return null;

  return label;
}
