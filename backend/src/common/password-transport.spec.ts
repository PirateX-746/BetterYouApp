import { createHash, webcrypto } from 'crypto';
import { ENCRYPTED_PREFIX, decryptObjectPasswords } from './password-transport';

const SECRET = 'test-transport-secret';
const key = createHash('sha256').update(SECRET).digest();

/** Encrypts exactly as frontend/src/lib/passwordTransport.ts does. */
async function browserEncrypt(value: string, secret = SECRET) {
  const digest = await webcrypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  );
  const aes = await webcrypto.subtle.importKey(
    'raw',
    digest,
    'AES-GCM',
    false,
    ['encrypt'],
  );
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await webcrypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aes,
      new TextEncoder().encode(value),
    ),
  );
  return ENCRYPTED_PREFIX + Buffer.concat([iv, sealed]).toString('hex');
}

describe('password transport', () => {
  it('decrypts browser-encrypted password fields, including nested ones', async () => {
    const body = {
      email: 'a@b.com',
      password: await browserEncrypt('Admin@123'),
      nested: { newPassword: await browserEncrypt('Ünïcode#Pass1') },
    };
    expect(body.password).not.toContain('Admin@123');
    decryptObjectPasswords(body, key);
    expect(body).toEqual({
      email: 'a@b.com',
      password: 'Admin@123',
      nested: { newPassword: 'Ünïcode#Pass1' },
    });
  });

  it('passes plain values and non-password fields through untouched', async () => {
    const enc = await browserEncrypt('x');
    const body = { password: 'plain', note: enc };
    decryptObjectPasswords(body, key);
    expect(body).toEqual({ password: 'plain', note: enc });
  });

  it('rejects a value encrypted with a different key', async () => {
    const body = { password: await browserEncrypt('Admin@123', 'other-key') };
    expect(() => decryptObjectPasswords(body, key)).toThrow();
  });

  it('rejects tampered ciphertext', async () => {
    const enc = await browserEncrypt('Admin@123');
    const flipped = enc.slice(0, -1) + (enc.endsWith('0') ? '1' : '0');
    expect(() => decryptObjectPasswords({ password: flipped }, key)).toThrow();
  });

  it('rejects encrypted values when the API has no key', async () => {
    const body = { password: await browserEncrypt('Admin@123') };
    expect(() => decryptObjectPasswords(body, null)).toThrow();
  });
});
