/**
 * "Dr. <name>", without doubling the title when the stored name already
 * starts with it (some practitioners entered "Dr. John" as their first name).
 */
export function drName(...parts: (string | null | undefined)[]): string {
  const name = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!name) return "";
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}
