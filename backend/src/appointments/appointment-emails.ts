/**
 * Patient-facing appointment emails: booked, rescheduled, cancelled and
 * reminders. Pure functions (no I/O) so they can be unit-tested.
 *
 * Privacy: email is not a secure channel and subjects show on lock screens,
 * so these carry only the time, the practitioner and the practice — never
 * the appointment type, notes or anything clinical.
 */

import {
  EMAIL_COLORS,
  emailLayout,
  emailParagraph,
  escapeHtml,
} from '../email/email-layout';

export type AppointmentEmailKind =
  | 'booked'
  | 'rescheduled'
  | 'cancelled'
  | 'reminder';

export interface AppointmentEmailContext {
  patientFirstName: string;
  practitionerName: string;
  practice: {
    name: string;
    email?: string;
    phone?: string;
    timezone: string;
  };
  start: Date;
  end: Date;
  /** Rescheduled only: the time it was moved from. */
  previousStart?: Date;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const { text: TEXT, muted: MUTED, border: BORDER } = EMAIL_COLORS;

function formatDate(at: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(at);
}

function formatTime(at: Date, timeZone: string, withZone = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    ...(withZone && { timeZoneName: 'short' }),
  }).format(at);
}

/** Calendar date in a timezone, for "today" / "tomorrow" comparisons. */
function dayKey(at: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(at);
}

/** "today", "tomorrow" or "on Tuesday, October 28" — relative to `now`. */
export function relativeDay(start: Date, now: Date, timeZone: string) {
  const target = dayKey(start, timeZone);
  if (target === dayKey(now, timeZone)) return 'today';
  if (target === dayKey(new Date(now.getTime() + 86_400_000), timeZone)) {
    return 'tomorrow';
  }
  return `on ${new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(start)}`;
}

export function renderAppointmentEmail(
  kind: AppointmentEmailKind,
  ctx: AppointmentEmailContext,
  now = new Date(),
): RenderedEmail {
  const tz = ctx.practice.timezone;
  const date = formatDate(ctx.start, tz);
  const time = `${formatTime(ctx.start, tz)} – ${formatTime(ctx.end, tz, true)}`;
  const shortTime = formatTime(ctx.start, tz);

  const copy = {
    booked: {
      subject: `Appointment confirmed: ${date} at ${shortTime}`,
      heading: 'Your appointment is confirmed',
      intro: `Your appointment with ${ctx.practice.name} is booked.`,
    },
    rescheduled: {
      subject: `Appointment rescheduled: ${date} at ${shortTime}`,
      heading: 'Your appointment has moved',
      intro: `Your appointment with ${ctx.practice.name} has a new time.`,
    },
    cancelled: {
      subject: `Appointment cancelled: ${date} at ${shortTime}`,
      heading: 'Your appointment is cancelled',
      intro: `Your appointment with ${ctx.practice.name} on ${date} at ${shortTime} has been cancelled.`,
    },
    reminder: {
      subject: `Reminder: appointment ${relativeDay(ctx.start, now, tz)} at ${shortTime}`,
      heading: `See you ${relativeDay(ctx.start, now, tz)}`,
      intro: `This is a reminder of your upcoming appointment with ${ctx.practice.name}.`,
    },
  }[kind];

  const rows: [string, string][] = [
    ['When', `${date}\n${time}`],
    ['With', ctx.practitionerName],
    ['Where', ctx.practice.name],
  ];
  if (kind === 'rescheduled' && ctx.previousStart) {
    rows.push([
      'Previously',
      `${formatDate(ctx.previousStart, tz)} at ${formatTime(ctx.previousStart, tz)}`,
    ]);
  }

  const contacts = [ctx.practice.phone, ctx.practice.email].filter(
    (c): c is string => Boolean(c),
  );
  const help =
    kind === 'cancelled'
      ? 'To book a new time'
      : 'If you need to reschedule or cancel';
  const contactLine = contacts.length
    ? `${help}, contact ${ctx.practice.name} at ${contacts.join(' or ')}.`
    : `${help}, please contact ${ctx.practice.name}.`;
  const footer = `You're receiving this because you have an appointment with ${ctx.practice.name}.`;

  // Cancelled emails show no details card: the time is in the intro.
  const showDetails = kind !== 'cancelled';

  const text = [
    `Hi ${ctx.patientFirstName},`,
    '',
    copy.intro,
    '',
    ...(showDetails
      ? rows.map(([label, value]) => `${label}: ${value.replace('\n', ', ')}`)
      : []),
    ...(showDetails ? [''] : []),
    contactLine,
    '',
    footer,
  ].join('\n');

  const e = escapeHtml;
  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;width:96px;vertical-align:top;color:${MUTED};font-size:14px;">${e(label)}</td>
          <td style="padding:6px 0;vertical-align:top;color:${TEXT};font-size:14px;font-weight:500;">${e(value).replace('\n', '<br>')}</td>
        </tr>`,
    )
    .join('');

  const html = emailLayout({
    title: copy.subject,
    heading: copy.heading,
    footer,
    body: [
      emailParagraph(`Hi ${ctx.patientFirstName},`),
      emailParagraph(copy.intro),
      showDetails
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};padding:10px 0;margin:8px 0 24px;">${detailRows}</table>`
        : '',
      emailParagraph(contactLine, true),
    ].join(''),
  });

  return { subject: copy.subject, html, text };
}
