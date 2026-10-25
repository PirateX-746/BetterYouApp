import { decideReminder } from './reminders';

const HOUR = 60 * 60_000;
const start = new Date('2026-11-02T10:00:00Z');
const before = (ms: number) => new Date(start.getTime() - ms);

describe('decideReminder', () => {
  const bookedLongAgo = before(7 * 24 * HOUR);

  it('sends nothing more than 24h out', () => {
    expect(
      decideReminder(
        { start, bookedAt: bookedLongAgo, remindersSent: [] },
        before(25 * HOUR),
      ),
    ).toBeNull();
  });

  it('sends the 24h reminder once its window opens', () => {
    expect(
      decideReminder(
        { start, bookedAt: bookedLongAgo, remindersSent: [] },
        before(23 * HOUR),
      ),
    ).toEqual({ send: '24h', markSent: ['24h'] });
  });

  it('sends the 2h reminder after the 24h one', () => {
    expect(
      decideReminder(
        { start, bookedAt: bookedLongAgo, remindersSent: ['24h'] },
        before(HOUR),
      ),
    ).toEqual({ send: '2h', markSent: ['2h'] });
  });

  it('sends only the nearest when both are due (missed pass)', () => {
    expect(
      decideReminder(
        { start, bookedAt: bookedLongAgo, remindersSent: [] },
        before(HOUR),
      ),
    ).toEqual({ send: '2h', markSent: ['24h', '2h'] });
  });

  it('skips the 24h reminder for a booking made inside that window', () => {
    const bookedAt = before(20 * HOUR);
    expect(
      decideReminder({ start, bookedAt, remindersSent: [] }, before(19 * HOUR)),
    ).toEqual({ send: null, markSent: ['24h'] });
    // …but still sends the 2h one later.
    expect(
      decideReminder({ start, bookedAt, remindersSent: ['24h'] }, before(HOUR)),
    ).toEqual({ send: '2h', markSent: ['2h'] });
  });

  it('skips both for a booking made inside the 2h window', () => {
    expect(
      decideReminder(
        { start, bookedAt: before(HOUR), remindersSent: [] },
        before(HOUR / 2),
      ),
    ).toEqual({ send: null, markSent: ['24h', '2h'] });
  });

  it('does nothing once everything is sent or the appointment has started', () => {
    expect(
      decideReminder(
        { start, bookedAt: bookedLongAgo, remindersSent: ['24h', '2h'] },
        before(HOUR),
      ),
    ).toBeNull();
    expect(
      decideReminder(
        { start, bookedAt: bookedLongAgo, remindersSent: [] },
        start,
      ),
    ).toBeNull();
  });
});
