import {
  emailButton,
  emailLayout,
  emailParagraph,
} from '../email/email-layout';
import { Role } from '../common/role.enum';

export interface InvitationEmailContext {
  name: string;
  practiceName: string;
  role: Role;
  /** The one-time accept link (carries the raw token). */
  acceptUrl: string;
  expiresAt: Date;
}

const ROLE_LABELS: Partial<Record<Role, string>> = {
  [Role.PRACTICE_ADMIN]: 'practice admin',
  [Role.PRACTITIONER]: 'practitioner',
  [Role.STAFF]: 'staff member',
};

/** The accept-invite page on the practitioner portal. */
export function invitationAcceptUrl(rawToken: string) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
    /\/+$/,
    '',
  );
  return `${base}/acceptInvite?token=${encodeURIComponent(rawToken)}`;
}

/**
 * Invitation to join a practice. The link sets up the account: the invitee
 * chooses their own password there, so none is ever emailed.
 */
export function renderInvitationEmail(ctx: InvitationEmailContext) {
  const role = ROLE_LABELS[ctx.role] ?? 'team member';
  const expires = ctx.expiresAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const subject = `You're invited to join ${ctx.practiceName} on BetterYou`;
  const intro = `You've been invited to join ${ctx.practiceName} on BetterYou as a ${role}.`;
  const next =
    "Accept the invitation to set up your account. You'll choose your own password.";
  const expiry = `This invitation link works once and expires on ${expires}.`;
  const notYou =
    "Weren't expecting this? You can ignore this email — no account is created unless you accept.";
  const footer = `You received this email because ${ctx.practiceName} invited you to BetterYou.`;

  const text = [
    `Hi ${ctx.name},`,
    '',
    intro,
    next,
    '',
    `Accept the invitation: ${ctx.acceptUrl}`,
    '',
    expiry,
    '',
    notYou,
    '',
    footer,
  ].join('\n');

  const html = emailLayout({
    title: subject,
    heading: `Join ${ctx.practiceName}`,
    footer,
    preheader: `Set up your BetterYou account. The link expires on ${expires}.`,
    badge: { label: 'Invitation', tone: 'info' },
    body: [
      emailParagraph(`Hi ${ctx.name},`),
      emailParagraph(intro),
      emailParagraph(next),
      `<div style="margin:0 0 18px;">${emailButton('Accept invitation', ctx.acceptUrl)}</div>`,
      emailParagraph(expiry, true),
      emailParagraph(notYou, true),
    ].join(''),
  });

  return { subject, html, text };
}
