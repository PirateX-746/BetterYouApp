/**
 * When appointment reminders go out. Pure, so the timing rules are
 * unit-tested without a database or a clock.
 */

export const REMINDERS = [
  { key: '24h', leadMs: 24 * 60 * 60_000 },
  { key: '2h', leadMs: 2 * 60 * 60_000 },
] as const;

export type ReminderKey = (typeof REMINDERS)[number]['key'];

/** The longest lead time: nothing further out than this needs checking. */
export const MAX_REMINDER_LEAD_MS = Math.max(...REMINDERS.map((r) => r.leadMs));

export interface ReminderState {
  start: Date;
  /** When the current time was booked (creation, or the last reschedule). */
  bookedAt: Date;
  remindersSent: string[];
}

export interface ReminderDecision {
  /** The reminder to email now, if any. */
  send: ReminderKey | null;
  /** Reminders to record as handled — sent, or skipped as redundant. */
  markSent: ReminderKey[];
}

/**
 * Which reminder (if any) to send for an appointment at `now`.
 *
 * A reminder is due once its window opens (start − lead) until the
 * appointment starts. Rules that keep patients from getting a pile of mail:
 *  - If several are due at once (e.g. the server was down), only the
 *    nearest is sent and the rest are marked handled.
 *  - A reminder whose window had already opened when the time was booked is
 *    skipped: the booking confirmation the patient just received covers it.
 */
export function decideReminder(
  appt: ReminderState,
  now: Date,
): ReminderDecision | null {
  const startMs = appt.start.getTime();
  const nowMs = now.getTime();
  if (nowMs >= startMs) return null;

  const due = REMINDERS.filter(
    (r) => !appt.remindersSent.includes(r.key) && nowMs >= startMs - r.leadMs,
  );
  if (due.length === 0) return null;

  // REMINDERS is ordered longest lead first, so the last due one is nearest.
  const nearest = due[due.length - 1];
  const bookedBeforeWindow = appt.bookedAt.getTime() < startMs - nearest.leadMs;

  return {
    send: bookedBeforeWindow ? nearest.key : null,
    markSent: due.map((r) => r.key),
  };
}
