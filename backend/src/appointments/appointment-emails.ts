/**
 * Patient-facing appointment emails: booked, rescheduled, cancelled and
 * reminders. Pure functions (no I/O) so they can be unit-tested.
 *
 * Privacy: email is not a secure channel and subjects show on lock screens,
 * so these carry only the time, the practitioner and the practice — never
 * the appointment type, notes or anything clinical.
 */

import {
  EMAIL_BRAND,
  EMAIL_COLORS,
  emailButton,
  emailLayout,
  emailPanel,
  emailParagraph,
  escapeHtml,
  type EmailTone,
} from '../email/email-layout';
import { PATIENT_CANCEL_CUTOFF_HOURS } from './schemas/appointment.schema';

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
  /**
   * Set when the patient should confirm: an unconfirmed appointment's
   * reminder, or a booking/reschedule inside the reminder window (which
   * skips that reminder). The email asks them to confirm or cancel in time
   * with one-click links (no sign-in). Ignored on cancellations.
   */
  links?: { confirm: string; cancel: string };
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const { text: TEXT, muted: MUTED, border: BORDER, brand: BRAND } = EMAIL_COLORS;

const BADGE: Record<AppointmentEmailKind, { label: string; tone: EmailTone }> =
  {
    booked: { label: 'Confirmed', tone: 'success' },
    rescheduled: { label: 'Rescheduled', tone: 'warning' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
    reminder: { label: 'Reminder', tone: 'info' },
  };

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
    reminder: ctx.links
      ? {
          subject: `Please confirm: appointment ${relativeDay(ctx.start, now, tz)} at ${shortTime}`,
          heading: 'Please confirm your appointment',
          intro: `You have an upcoming appointment with ${ctx.practice.name}.`,
        }
      : {
          subject: `Reminder: appointment ${relativeDay(ctx.start, now, tz)} at ${shortTime}`,
          heading: `See you ${relativeDay(ctx.start, now, tz)}`,
          intro: `This is a reminder of your upcoming appointment with ${ctx.practice.name}.`,
        },
  }[kind];
  const links = kind === 'cancelled' ? undefined : ctx.links;
  const confirmAsk = `Please confirm you'll be there. If you can't make it, please cancel at least ${PATIENT_CANCEL_CUTOFF_HOURS} hours before it starts.`;

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
      : links
        ? 'To reschedule'
        : 'If you need to reschedule or cancel';
  const contactLine = contacts.length
    ? `${help}, contact ${ctx.practice.name} at ${contacts.join(' or ')}.`
    : `${help}, please contact ${ctx.practice.name}.`;
  const footer = `You're receiving this because you have an appointment with ${ctx.practice.name}${ctx.practice.name === EMAIL_BRAND ? '' : `, which uses ${EMAIL_BRAND}`}.`;

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
    ...(links
      ? [confirmAsk, `Confirm: ${links.confirm}`, `Cancel: ${links.cancel}`, '']
      : []),
    contactLine,
    '',
    footer,
  ].join('\n');

  const e = escapeHtml;
  const monthShort = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
  })
    .format(ctx.start)
    .toUpperCase();
  const dayNum = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    day: 'numeric',
  }).format(ctx.start);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
  }).format(ctx.start);
  const longDate = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(ctx.start);

  // The appointment at a glance: a calendar tile, then date and time.
  const when = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;border:1px solid ${BORDER};border-radius:14px;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:58px;border-radius:10px;overflow:hidden;border:1px solid ${BORDER};text-align:center;">
                <tr><td style="background:${kind === 'cancelled' ? '#94a3b8' : BRAND};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 0;">${e(monthShort)}</td></tr>
                <tr><td style="background:#ffffff;color:${TEXT};font-size:24px;font-weight:700;padding:6px 0 7px;line-height:1;">${e(dayNum)}</td></tr>
              </table>
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:16px;font-weight:600;color:${TEXT};${kind === 'cancelled' ? 'text-decoration:line-through;' : ''}">${e(weekday)}, ${e(longDate)}</div>
              <div style="font-size:15px;color:${MUTED};margin-top:3px;${kind === 'cancelled' ? 'text-decoration:line-through;' : ''}">${e(time)}</div>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="border-top:1px solid ${BORDER};padding:12px 18px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:3px 0;width:96px;color:${MUTED};font-size:14px;">With</td>
              <td style="padding:3px 0;color:${TEXT};font-size:14px;font-weight:500;">${e(ctx.practitionerName)}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;width:96px;color:${MUTED};font-size:14px;">Where</td>
              <td style="padding:3px 0;color:${TEXT};font-size:14px;font-weight:500;">${e(ctx.practice.name)}</td>
            </tr>
            ${
              kind === 'rescheduled' && ctx.previousStart
                ? `<tr>
              <td style="padding:3px 0;width:96px;color:${MUTED};font-size:14px;">Was</td>
              <td style="padding:3px 0;color:${MUTED};font-size:14px;text-decoration:line-through;">${e(`${formatDate(ctx.previousStart, tz)} at ${formatTime(ctx.previousStart, tz)}`)}</td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>`;

  // Tap-to-call / tap-to-email where the practice has them.
  const contactHtml = [
    ctx.practice.phone
      ? `<a href="tel:${e(ctx.practice.phone.replace(/[^\d+]/g, ''))}" style="color:${BRAND};text-decoration:none;font-weight:600;">${e(ctx.practice.phone)}</a>`
      : '',
    ctx.practice.email
      ? `<a href="mailto:${e(ctx.practice.email)}" style="color:${BRAND};text-decoration:none;font-weight:600;">${e(ctx.practice.email)}</a>`
      : '',
  ]
    .filter(Boolean)
    .join('<br>');
  const panelTitle =
    kind === 'cancelled'
      ? 'Want to book a new time?'
      : 'Need to make a change?';
  const panelBody = contactHtml
    ? `Contact ${e(ctx.practice.name)}:<br>${contactHtml}<br>Or simply reply to this email.`
    : `Simply reply to this email and ${e(ctx.practice.name)} will get back to you.`;

  const preheader =
    kind === 'cancelled'
      ? `${date} at ${shortTime} with ${ctx.practitionerName} is cancelled.`
      : `${date} at ${shortTime} with ${ctx.practitionerName}.${links ? ' Please confirm.' : ''}`;

  const html = emailLayout({
    title: copy.subject,
    heading: copy.heading,
    preheader,
    badge: BADGE[kind],
    footer,
    body: [
      emailParagraph(`Hi ${ctx.patientFirstName},`),
      emailParagraph(copy.intro),
      showDetails ? when : '',
      links ? emailParagraph(confirmAsk) : '',
      links
        ? `<div style="margin:0 0 18px;">${emailButton("Yes, I'll be there", links.confirm)}${emailButton('Cancel appointment', links.cancel, false)}</div>`
        : '',
      emailPanel(panelTitle, panelBody),
    ].join(''),
  });

  return { subject: copy.subject, html, text };
}
