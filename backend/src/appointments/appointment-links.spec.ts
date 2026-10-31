import {
  linkKey,
  signAppointmentLink,
  verifyAppointmentLink,
} from './appointment-links';

const key = linkKey('test-secret');
const start = Date.parse('2026-11-02T04:30:00Z');
const payload = { a: '6ae57d8ac4186a1297655edf', act: 'cancel' as const, s: start };

describe('appointment links', () => {
  it('round-trips a valid token', () => {
    const token = signAppointmentLink(payload, key);
    expect(verifyAppointmentLink(token, key, start - 1000)).toEqual(payload);
  });

  it('expires when the appointment starts', () => {
    const token = signAppointmentLink(payload, key);
    expect(verifyAppointmentLink(token, key, start)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const token = signAppointmentLink(payload, linkKey('other'));
    expect(verifyAppointmentLink(token, key, start - 1000)).toBeNull();
  });

  it('rejects a tampered payload (cancel link turned into confirm)', () => {
    const [, sig] = signAppointmentLink(payload, key).split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...payload, act: 'confirm' }),
    ).toString('base64url');
    expect(verifyAppointmentLink(`${forged}.${sig}`, key, start - 1000)).toBeNull();
  });

  it('rejects garbage', () => {
    for (const t of ['', 'abc', 'a.b.c', '.', 'x.y']) {
      expect(verifyAppointmentLink(t, key, start - 1000)).toBeNull();
    }
  });
});
