import { relativeDay, renderAppointmentEmail } from './appointment-emails';

const ctx = {
  patientFirstName: 'Asha <b>',
  practitionerName: 'Meera Rao',
  practice: {
    name: 'Calm Minds Clinic',
    email: 'hello@calmminds.test',
    phone: '+91 98765 43210',
    timezone: 'Asia/Kolkata',
  },
  // 10:00–10:50 in Kolkata (UTC+5:30)
  start: new Date('2026-11-02T04:30:00Z'),
  end: new Date('2026-11-02T05:20:00Z'),
};

describe('renderAppointmentEmail', () => {
  it('shows the time in the practice timezone', () => {
    const { subject, text } = renderAppointmentEmail('booked', ctx);
    expect(subject).toBe(
      'Appointment confirmed: Monday, November 2, 2026 at 10:00 AM',
    );
    expect(text).toContain('10:00 AM – 10:50 AM GMT+5:30');
    expect(text).toContain('With: Meera Rao');
  });

  it('escapes names in the HTML', () => {
    const { html } = renderAppointmentEmail('booked', ctx);
    expect(html).toContain('Hi Asha &lt;b&gt;,');
    expect(html).not.toContain('Asha <b>');
  });

  it('includes the previous time when rescheduled', () => {
    const { text } = renderAppointmentEmail('rescheduled', {
      ...ctx,
      previousStart: new Date('2026-10-30T08:30:00Z'),
    });
    expect(text).toContain('Previously: Friday, October 30, 2026 at 2:00 PM');
  });

  it('points a cancelled patient at the practice to rebook', () => {
    const { subject, text } = renderAppointmentEmail('cancelled', ctx);
    expect(subject).toMatch(/^Appointment cancelled:/);
    expect(text).toContain(
      'To book a new time, contact Calm Minds Clinic at +91 98765 43210 or hello@calmminds.test.',
    );
  });

  it('says "tomorrow" in a reminder the day before', () => {
    const now = new Date('2026-11-01T06:00:00Z');
    expect(renderAppointmentEmail('reminder', ctx, now).subject).toBe(
      'Reminder: appointment tomorrow at 10:00 AM',
    );
  });
});

describe('reminder asking to confirm', () => {
  const now = new Date('2026-11-01T06:00:00Z');
  const links = {
    confirm: 'https://app.test/appointment-response?token=c',
    cancel: 'https://app.test/appointment-response?token=x',
  };

  it('asks an unconfirmed patient to confirm or cancel 4 hours before', () => {
    const { subject, text, html } = renderAppointmentEmail(
      'reminder',
      { ...ctx, links },
      now,
    );
    expect(subject).toBe('Please confirm: appointment tomorrow at 10:00 AM');
    expect(text).toContain("Please confirm you'll be there");
    expect(text).toContain('cancel at least 4 hours before it starts');
    expect(text).toContain(`Confirm: ${links.confirm}`);
    expect(text).toContain(`Cancel: ${links.cancel}`);
    expect(html).toContain(`href="${links.confirm}"`);
    expect(html).toContain(`href="${links.cancel}"`);
  });

  it('is a plain reminder once confirmed', () => {
    const { text, html } = renderAppointmentEmail('reminder', ctx, now);
    expect(text).not.toContain('Confirm:');
    expect(html).not.toContain('href=');
  });

  it('asks on a booking inside the reminder window', () => {
    const { subject, text } = renderAppointmentEmail('booked', {
      ...ctx,
      links,
    });
    expect(subject).toMatch(/^Appointment confirmed:/);
    expect(text).toContain(`Confirm: ${links.confirm}`);
  });

  it('never asks on a cancellation', () => {
    const { text } = renderAppointmentEmail('cancelled', {
      ...ctx,
      links,
    });
    expect(text).not.toContain('Confirm:');
  });
});

describe('relativeDay', () => {
  it('uses the practice calendar day, not UTC', () => {
    // 23:00 UTC on Nov 1 is already Nov 2 (04:30) in Kolkata.
    const now = new Date('2026-11-01T23:00:00Z');
    expect(relativeDay(ctx.start, now, 'Asia/Kolkata')).toBe('today');
  });
});
