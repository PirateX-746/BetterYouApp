import {
  EMAIL_COLORS,
  emailButton,
  emailLayout,
  emailParagraph,
  escapeHtml,
} from '../email/email-layout';

export interface TempPasswordEmailContext {
  firstName: string;
  tempPassword: string;
  /** How long the temporary password works, in minutes. */
  validForMinutes: number;
  /** The login page for this account's portal. */
  signInUrl: string;
  /**
   * Set when the practice reset the password (rather than the account owner
   * asking for it): the practice's name. That reset replaces the old
   * password at once; a self-service one leaves it working until used.
   */
  issuedByPractice?: string;
}

/** The login page a temporary-password email links to. */
const SIGN_IN_PATHS = {
  patient: '/patientLogin',
  practitioner: '/practitionerLogin',
  admin: '/adminLogin',
} as const;

export function portalSignInUrl(portal: keyof typeof SIGN_IN_PATHS) {
  // The console can live on its own address (admin.<domain>); ADMIN_URL
  // names it. Everything else uses the app's main address.
  const configured =
    (portal === 'admin' && process.env.ADMIN_URL) ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000';
  const base = configured.replace(/\/+$/, '');
  return `${base}${SIGN_IN_PATHS[portal]}`;
}

function validity(minutes: number) {
  if (minutes % 1440 === 0) {
    return `${minutes / 1440} day${minutes === 1440 ? '' : 's'}`;
  }
  return minutes % 60 === 0
    ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}`
    : `${minutes} minutes`;
}

/**
 * The temporary-password email, for a forgot-password request or a reset by
 * the practice. It carries the one-time password itself (these flows issue
 * one rather than a link); it only works for a limited time and must be
 * replaced at the next sign-in.
 */
export function renderTempPasswordEmail(ctx: TempPasswordEmailContext) {
  const c = EMAIL_COLORS;
  const e = escapeHtml;
  const valid = validity(ctx.validForMinutes);
  const practice = ctx.issuedByPractice;
  const subject = 'Your BetterYou temporary password';
  const heading = practice ? 'Your password was reset' : 'Reset your password';
  const intro = practice
    ? `${practice} has reset your BetterYou password. Use this temporary password to sign in:`
    : 'We received a request to reset your BetterYou password. Use this temporary password to sign in:';
  const next = `It works for ${valid}. You'll be asked to choose a new password as soon as you sign in.`;
  const notYou = practice
    ? `Your previous password no longer works. Not expecting this? Contact ${practice}.`
    : "Didn't ask for this? You can ignore this email — your current password still works, and this one expires on its own.";
  const footer = practice
    ? `You received this email because ${practice} reset the password on your BetterYou account.`
    : 'You received this email because a password reset was requested for your BetterYou account.';

  const text = [
    `Hi ${ctx.firstName},`,
    '',
    intro,
    '',
    `    ${ctx.tempPassword}`,
    '',
    next,
    '',
    `Sign in: ${ctx.signInUrl}`,
    '',
    notYou,
    '',
    footer,
  ].join('\n');

  const html = emailLayout({
    title: subject,
    heading,
    footer,
    preheader: `Your temporary password works for ${valid}.`,
    badge: { label: 'Account security', tone: 'info' },
    body: [
      emailParagraph(`Hi ${ctx.firstName},`),
      emailParagraph(intro),
      `<div style="margin:0 0 18px;padding:16px;background:${c.subtle};border:1px dashed ${c.border};border-radius:12px;text-align:center;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:22px;font-weight:600;letter-spacing:1.5px;color:${c.text};">${e(ctx.tempPassword)}</div>`,
      emailParagraph(next),
      `<div style="margin:0 0 18px;">${emailButton('Sign in', ctx.signInUrl)}</div>`,
      emailParagraph(notYou, true),
    ].join(''),
  });

  return { subject, html, text };
}
