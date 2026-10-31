import { subdomainFrom } from './tenancy/subdomain';
import { isMultiTenancyEnabled, rootDomain } from './tenancy/tenancy.config';

/**
 * Origins allowed to call the API and open sockets.
 *
 * Shared by the HTTP server and both WebSocket gateways. The gateways used
 * to declare `origin: '*'`, which is not merely loose — a wildcard origin is
 * incompatible with credentialed requests, so the browser refuses to send
 * the session cookie and socket authentication could never work.
 */
export function allowedOrigins(env = process.env): string[] {
  const extra = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  // Local dev only — required for SSE and direct socket connections. Never
  // allowed in production, where a page on a developer machine must not be
  // able to make credentialed calls to the live API.
  const dev =
    env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
  return [env.FRONTEND_URL?.replace(/\/+$/, ''), ...extra, ...dev].filter(
    Boolean,
  ) as string[];
}

/**
 * The single answer to "may a browser page on this origin act on the API?".
 * Used by CORS, the CSRF origin check and the WebSocket handshake so the
 * three can never disagree.
 *
 * With tenancy on, each practice's frontend lives on its own subdomain of
 * ROOT_DOMAIN, so those origins are allowed too — but only a single-label
 * subdomain of the configured root, never an arbitrary host.
 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  if (allowedOrigins().includes(origin)) return true;

  if (!isMultiTenancyEnabled()) return false;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false; // includes the literal "null" origin from sandboxed frames
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    return false;
  }
  return subdomainFrom(url.host, rootDomain()) !== null;
}

/** `cors` origin callback built on isAllowedOrigin. */
function originCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  // No Origin header: same-origin or a non-browser client — CORS is moot.
  callback(null, !origin || isAllowedOrigin(origin));
}

/** CORS options for the HTTP server. */
export function httpCorsOptions() {
  return {
    origin: originCallback,
    credentials: true,
  };
}

/** CORS options for the Socket.io gateways. */
export function socketCorsOptions() {
  return {
    origin: originCallback,
    credentials: true,
  };
}
