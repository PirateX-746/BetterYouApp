/**
 * Session-scoped keys only — deliberately excludes device-level prefs like
 * "portalPin" and "theme", which should survive logout/401 and not force the
 * user to redo setup (e.g. re-set their PIN) on every session.
 */
const SESSION_STORAGE_KEYS = ["role", "name", "userId", "email", "portalLocked"];

/**
 * Prefixes of per-user keys that hold clinical or personal data — assessment
 * draft backups and open tabs, recent patient searches. Wiped on logout so
 * the next person on a shared device can't see them.
 */
const SESSION_STORAGE_PREFIXES = ["by.assess.", "by.recent."];

export function clearSessionStorage() {
  for (const key of SESSION_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && SESSION_STORAGE_PREFIXES.some((p) => key.startsWith(p))) localStorage.removeItem(key);
  }
}

/**
 * Writes a display-only cookie (name, userId) that server components read for
 * the chrome. The real session is an HttpOnly cookie set by the backend; never
 * treat these as proof of identity.
 */
export function setDisplayCookie(key: "name" | "userId", value: string) {
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}
