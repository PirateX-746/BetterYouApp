/**
 * Session-scoped keys only — deliberately excludes device-level prefs like
 * "portalPin" and "theme", which should survive logout/401 and not force the
 * user to redo setup (e.g. re-set their PIN) on every session.
 */
const SESSION_STORAGE_KEYS = ["role", "name", "userId", "email"];

export function clearSessionStorage() {
  for (const key of SESSION_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
