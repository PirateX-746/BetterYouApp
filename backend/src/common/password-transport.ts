import { createDecipheriv, createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Transport obfuscation for password fields.
 *
 * The frontend (lib/passwordTransport.ts) encrypts password fields with
 * AES-256-GCM under a key shared through PASSWORD_ENCRYPTION_KEY /
 * NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY, so they don't show in plain text in
 * DevTools or request logs. This middleware decrypts them before
 * validation; the rest of the API sees plain passwords and bcrypts them as
 * before.
 *
 * This OBSCURES, it does not protect: the frontend key ships in the browser
 * bundle, so anyone can read it. HTTPS is what protects passwords in
 * transit. Nothing here touches how passwords are stored.
 *
 * Wire format: "__enc__" + hex(iv[12] | ciphertext | authTag[16]).
 * Values without the prefix pass through unchanged, so the API keeps
 * working when the frontend key is unset.
 */
export const ENCRYPTED_PREFIX = '__enc__';

const PASSWORD_FIELDS = new Set([
  'password',
  'confirmPassword',
  'newPassword',
  'currentPassword',
]);

const IV_BYTES = 12;
const TAG_BYTES = 16;

function transportKey(): Buffer | null {
  const secret = process.env.PASSWORD_ENCRYPTION_KEY;
  return secret ? createHash('sha256').update(secret).digest() : null;
}

export function decryptPassword(value: string, key: Buffer): string {
  const raw = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), 'hex');
  if (raw.length < IV_BYTES + TAG_BYTES) throw new Error('Too short');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    raw.subarray(0, IV_BYTES),
  );
  decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
  return Buffer.concat([
    decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)),
    decipher.final(),
  ]).toString('utf8');
}

/** Decrypts prefixed password fields anywhere in a parsed JSON body, in place. */
export function decryptObjectPasswords(node: unknown, key: Buffer | null) {
  if (Array.isArray(node)) {
    node.forEach((item) => decryptObjectPasswords(item, key));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  for (const [field, value] of Object.entries(obj)) {
    if (
      PASSWORD_FIELDS.has(field) &&
      typeof value === 'string' &&
      value.startsWith(ENCRYPTED_PREFIX)
    ) {
      if (!key) throw new Error('PASSWORD_ENCRYPTION_KEY is not set');
      obj[field] = decryptPassword(value, key);
    } else {
      decryptObjectPasswords(value, key);
    }
  }
}

/**
 * Express middleware; must run after the JSON body parser. An encrypted
 * value that won't decrypt (key mismatch, tampering) is rejected rather
 * than passed on, so the ciphertext is never mistaken for a password.
 */
export function passwordTransportMiddleware() {
  const key = transportKey();
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      decryptObjectPasswords(req.body, key);
      next();
    } catch {
      res.status(400).json({
        statusCode: 400,
        message: 'Could not read the submitted password. Please try again.',
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }
  };
}
