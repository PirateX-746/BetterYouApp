import type { CookieOptions } from 'express';

/** JWT session cookie. HttpOnly — never readable by page scripts. */
export const AUTH_COOKIE = 'token';

/**
 * Role cookie. Also HttpOnly: the Next.js middleware reads it to decide which
 * portal to route to, and making it HttpOnly stops a signed-in patient from
 * simply setting `role=practitioner` in the console to reach practitioner
 * screens. It is a routing hint only — the API authorises off the JWT.
 */
export const ROLE_COOKIE = 'role';

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
