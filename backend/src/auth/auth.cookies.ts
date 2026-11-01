import type { CookieOptions, Request } from 'express';

/** JWT session cookie. HttpOnly — never readable by page scripts. */
export const AUTH_COOKIE = 'token';

/**
 * Role cookie. Also HttpOnly: the Next.js middleware reads it to decide which
 * portal to route to, and making it HttpOnly stops a signed-in patient from
 * simply setting `role=practitioner` in the console to reach practitioner
 * screens. It is a routing hint only — the API authorises off the JWT.
 */
export const ROLE_COOKIE = 'role';

/**
 * Platform console session. Kept apart from AUTH_COOKIE so a super admin and
 * a practice user can be signed in side by side in one browser profile —
 * signing in to one portal no longer replaces the other's session.
 * Its presence alone means "super admin"; there is no separate role cookie.
 */
export const ADMIN_AUTH_COOKIE = 'admin_token';

/**
 * Header (or `?portal=` for plain links such as attachment downloads) the
 * console sends so shared endpoints — change-password, logout, support
 * attachments — read the admin session rather than the practice one.
 */
export const PORTAL_HEADER = 'x-portal';

type CookieRequest = Pick<Request, 'headers' | 'path' | 'query'> & {
  cookies?: Record<string, string>;
};

/** Whether this request belongs to the platform console. */
export function isAdminPortalRequest(req: CookieRequest): boolean {
  if (req.path === '/admin' || req.path?.startsWith('/admin/')) return true;
  if (req.headers?.[PORTAL_HEADER] === 'admin') return true;
  return req.query?.portal === 'admin';
}

/** The session token for the portal this request belongs to. */
export function sessionTokenFrom(req: CookieRequest): string | null {
  const cookies = req.cookies ?? {};
  return (
    (isAdminPortalRequest(req)
      ? cookies[ADMIN_AUTH_COOKIE]
      : cookies[AUTH_COOKIE]) ?? null
  );
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In production the browser talks to the API cross-site (Vercel frontend →
 * separate API host) as well as directly for SSE/WebSocket, which requires
 * `SameSite=None` and therefore `Secure`. In local development everything is
 * on `localhost` — cookies ignore the port, so `Lax` works across :3000
 * and :3002 and avoids the Secure requirement over plain HTTP.
 */
export function authCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: ONE_DAY_MS,
  };
}
