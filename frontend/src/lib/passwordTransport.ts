/**
 * Transport obfuscation for password fields — the browser half of
 * backend/src/common/password-transport.ts.
 *
 * Password fields in a request body are AES-256-GCM-encrypted with a key
 * derived from NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY, so DevTools and request
 * logs show "__enc__…" instead of the password. The API decrypts them before
 * validation.
 *
 * This OBSCURES, it does not protect: the key is bundled into this JS, so
 * anyone can read it. HTTPS is what protects passwords in transit.
 *
 * Wire format: "__enc__" + hex(iv[12] | ciphertext | authTag[16]) — Web
 * Crypto appends the tag to the ciphertext, which is the order the API reads.
 */
const ENCRYPTED_PREFIX = "__enc__";

const PASSWORD_FIELDS = new Set([
  "password",
  "confirmPassword",
  "newPassword",
  "currentPassword",
]);

const SECRET = process.env.NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY;

let keyPromise: Promise<CryptoKey> | null = null;

/**
 * The AES key, or null when no secret is configured or Web Crypto is
 * unavailable (it only exists on https:// and localhost — e.g. not on a
 * plain-http LAN address). Either way the request goes out unencrypted and
 * the API, which passes unprefixed values through, still accepts it.
 */
function transportKey(): Promise<CryptoKey> | null {
  if (!SECRET || typeof crypto === "undefined" || !crypto.subtle) return null;
  keyPromise ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(SECRET))
    .then((digest) =>
      crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]),
    );
  return keyPromise;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function encryptPassword(value: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(value),
    ),
  );
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return ENCRYPTED_PREFIX + toHex(out);
}

async function encryptNode(node: unknown, key: CryptoKey): Promise<unknown> {
  if (Array.isArray(node)) {
    return Promise.all(node.map((item) => encryptNode(item, key)));
  }
  if (!node || typeof node !== "object" || node.constructor !== Object) {
    return node;
  }
  const out: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(node)) {
    out[field] =
      PASSWORD_FIELDS.has(field) && typeof value === "string" && value
        ? await encryptPassword(value, key)
        : await encryptNode(value, key);
  }
  return out;
}

/**
 * Returns a copy of `data` with its password fields encrypted (the caller's
 * object — often live form state — is left untouched). Non-plain objects
 * such as FormData pass through as-is.
 */
export async function encryptObjectPasswords<T>(data: T): Promise<T> {
  const key = transportKey();
  if (!key) return data;
  return (await encryptNode(data, await key)) as T;
}
