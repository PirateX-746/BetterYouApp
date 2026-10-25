/**
 * Wall-clock helpers for practice hours, which are stored as "HH:mm" in the
 * practice's timezone. Both work regardless of the server's own timezone.
 */

/** The calendar date, weekday and "HH:mm" of an instant in a timezone. */
export function localParts(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    dayKey: parts.weekday.toLowerCase(),
    time: `${parts.hour}:${parts.minute}`,
  };
}

/**
 * The instant at which the wall clock in `timeZone` reads `date` + `time`
 * ("YYYY-MM-DD", "HH:mm"). Corrects a UTC guess by the zone's offset at
 * that moment, so it's right whatever timezone the server itself runs in.
 */
export function zonedInstant(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  const seen = localParts(guess, timeZone);
  const asUtc = new Date(`${seen.date}T${seen.time}:00Z`);
  return new Date(guess.getTime() - (asUtc.getTime() - guess.getTime()));
}
