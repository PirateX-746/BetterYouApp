/**
 * Escapes a value for safe interpolation into a raw HTML string (e.g.
 * `document.write` templates used by print views). Every print view builds
 * its popup document from a template literal rather than React, so none of
 * the usual JSX escaping applies — a patient/practitioner free-text field
 * (name, note content, dosage, etc.) interpolated raw is a stored-XSS
 * vector the moment it contains `<` or `&`.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
