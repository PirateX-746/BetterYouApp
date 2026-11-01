import {
  emailLayout,
  emailPanel,
  emailParagraph,
  escapeHtml,
} from '../email/email-layout';

export interface WelcomeEmailContext {
  firstName: string;
  practiceName: string;
  practicePhone?: string;
  practiceEmail?: string;
}

/**
 * Sent once when a practice registers a patient. Deliberately carries no
 * password or portal link (the patient portal is off — appointment emails
 * have one-click confirm/cancel instead) and no clinical details: it says
 * who registered them and what emails to expect.
 */
export function renderWelcomeEmail(ctx: WelcomeEmailContext) {
  const practice = ctx.practiceName;
  const subject = `Welcome to ${practice}`;
  const contactBits = [ctx.practicePhone, ctx.practiceEmail].filter(Boolean);
  const contact = contactBits.length
    ? `To change or cancel an appointment, or if any of your details are wrong, contact ${practice} at ${contactBits.join(' or ')} — or simply reply to this email.`
    : `To change or cancel an appointment, or if any of your details are wrong, contact ${practice} — or simply reply to this email.`;
  const lines = [
    `Hi ${ctx.firstName},`,
    `${practice} has registered you as a patient on BetterYou, the system they use to manage appointments.`,
    `From now on we'll email you at this address when an appointment is booked, moved or cancelled, with a reminder before each one. Some reminders have Confirm and Cancel buttons, so you can respond in one click.`,
    contact,
  ];
  const footer = `You received this email because ${practice} added this address to your patient record.`;

  const text = [...lines.flatMap((l) => [l, '']), footer].join('\n');
  const html = emailLayout({
    title: subject,
    heading: `Welcome to ${practice}`,
    preheader: `${practice} has registered you. Here's what to expect.`,
    badge: { label: 'Welcome', tone: 'success' },
    footer,
    body: [
      emailParagraph(lines[0]),
      emailParagraph(lines[1]),
      emailParagraph(lines[2]),
      emailPanel('Questions or changes?', escapeHtml(contact)),
    ].join(''),
  });
  return { subject, html, text };
}
