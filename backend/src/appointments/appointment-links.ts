/**
 * Signed one-click links that let a patient confirm or cancel an appointment
 * from an email, without signing in. Pure (no I/O) so it's unit-tested.
 *
 * A token names one appointment, one action and the start time it was issued
 * for. It stops working when the appointment starts, and as soon as the
 * appointment is rescheduled (the start no longer matches), so a link from
 * an old email can't act on the new time. Possession of the link is the
 * credential — the same model as a password-reset link — so it carries no
 * patient data and the page it opens shows only what the email already did.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export type LinkAction = 'confirm' | 'cancel';

export interface LinkPayload {
  /** Appointment id. */
  a: string;
  act: LinkAction;
  /** The appointment start (ms) the link was issued for; also its expiry. */
  s: number;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

/** A key used only for these links, derived so the JWT secret isn't reused raw. */
export function linkKey(secret: string) {
  return createHmac('sha256', secret).update('appointment-link:v1').digest();
}

function mac(body: string, key: Buffer) {
  return createHmac('sha256', key).update(body).digest();
}

export function signAppointmentLink(payload: LinkPayload, key: Buffer) {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${b64url(mac(body, key))}`;
}

/** The payload if the token is authentic and unexpired, else null. */
export function verifyAppointmentLink(
  token: string,
  key: Buffer,
  now = Date.now(),
): LinkPayload | null {
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;

  const expected = mac(body, key);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const p = payload as Partial<LinkPayload>;
  if (
    typeof p.a !== 'string' ||
    (p.act !== 'confirm' && p.act !== 'cancel') ||
    typeof p.s !== 'number'
  ) {
    return null;
  }
  if (now >= p.s) return null;
  return { a: p.a, act: p.act, s: p.s };
}

/** The link key from the environment (a dedicated secret, else the JWT one). */
export function linkKeyFromEnv(env = process.env) {
  const secret = env.APPOINTMENT_LINK_SECRET || env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for appointment links');
  return linkKey(secret);
}

/** The page a one-click link opens; it acts only when the patient taps. */
export function appointmentLinkUrl(token: string, env = process.env) {
  const base = (env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/appointment-response?token=${encodeURIComponent(token)}`;
}
