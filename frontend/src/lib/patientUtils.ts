/** Calculate age from a date-of-birth string. Returns "—" if missing. */
export function calculateAge(dob?: string): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} yrs`;
}

/** Format a date string to "Jan 01, 2025". Returns "N/A" if missing. */
export function formatDate(date?: string): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** Capitalise every word in a string. */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Build a display name from a patient object. */
export function getPatientDisplayName(p: {
  name?: string;
  firstName?: string;
  lastName?: string;
}): string {
  const raw =
    p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unknown";
  return capitalizeWords(raw);
}
