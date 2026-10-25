import { localParts, zonedInstant } from './practice-time';

describe('practice-time', () => {
  it('reads an instant as wall-clock time in the practice timezone', () => {
    expect(
      localParts(new Date('2026-11-02T03:30:00Z'), 'Asia/Kolkata'),
    ).toEqual({
      date: '2026-11-02',
      dayKey: 'monday',
      time: '09:00',
    });
    // Late UTC evening is already the next day in IST.
    expect(
      localParts(new Date('2026-11-02T20:00:00Z'), 'Asia/Kolkata'),
    ).toMatchObject({
      date: '2026-11-03',
      dayKey: 'tuesday',
      time: '01:30',
    });
  });

  it('turns a practice wall-clock time into the right instant', () => {
    expect(
      zonedInstant('2026-11-02', '09:00', 'Asia/Kolkata').toISOString(),
    ).toBe('2026-11-02T03:30:00.000Z');
    expect(
      zonedInstant('2026-11-02', '17:00', 'Asia/Kolkata').toISOString(),
    ).toBe('2026-11-02T11:30:00.000Z');
  });

  it('follows DST in zones that observe it', () => {
    // New York: EDT (UTC-4) until 1 Nov 2026, EST (UTC-5) after.
    expect(
      zonedInstant('2026-10-30', '09:00', 'America/New_York').toISOString(),
    ).toBe('2026-10-30T13:00:00.000Z');
    expect(
      zonedInstant('2026-11-02', '09:00', 'America/New_York').toISOString(),
    ).toBe('2026-11-02T14:00:00.000Z');
  });
});
