/**
 * A practitioner's display name, exactly as they entered it. No title is
 * added: many psychology practitioners may not use "Dr.", so anyone who can
 * includes it in their own name.
 */
export function practitionerName(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
