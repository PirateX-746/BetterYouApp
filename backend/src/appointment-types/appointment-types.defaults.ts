/**
 * The starter list every practitioner gets on first use — the six types the
 * booking forms used to hard-code, now with a duration and color each.
 */
export const DEFAULT_APPOINTMENT_TYPES = [
  { name: 'New Patient Visit', durationMinutes: 60, color: '#5b8def' },
  { name: 'Follow-Up Session', durationMinutes: 30, color: '#34a853' },
  { name: 'Counselling Session', durationMinutes: 45, color: '#8b5cf6' },
  { name: 'CBT Session', durationMinutes: 45, color: '#f59e0b' },
  { name: 'Couples Therapy', durationMinutes: 60, color: '#ec4899' },
  { name: 'Family Therapy', durationMinutes: 60, color: '#14b8a6' },
] as const;
