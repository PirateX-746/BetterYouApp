/**
 * The shared shell for every BetterYou email: brand line, white card on a
 * grey canvas, footer. Table-based with inline styles, which is what email
 * clients reliably render. Colors are the light-theme tokens from the
 * frontend's globals.css.
 */

export const EMAIL_COLORS = {
  brand: '#2563eb',
  text: '#1d1d1f',
  muted: '#5f6368',
  canvas: '#f3f5f9',
  border: '#e3e6ea',
  subtle: '#f0f2f5',
} as const;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A body paragraph. `text` is escaped. */
export function emailParagraph(text: string, muted = false) {
  const c = EMAIL_COLORS;
  return `<p style="margin:0 0 16px;font-size:${muted ? 14 : 15}px;line-height:1.5;color:${muted ? c.muted : c.text};">${escapeHtml(text)}</p>`;
}

/**
 * The app icon (stethoscope tile, served by the frontend's /icons route), so
 * emails carry the same logo as the app. Only for a public https frontend:
 * mail clients can't load images from localhost, and a broken image looks
 * worse than the wordmark alone.
 */
export function emailLogoUrl(env = process.env) {
  const base = (env.FRONTEND_URL || '').replace(/\/+$/, '');
  return base.startsWith('https://') ? `${base}/icons/icon-192.png` : null;
}

/** Brand name shown in every email's header and footer. */
export const EMAIL_BRAND = 'BetterYou Clinic';

export type EmailTone = 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<EmailTone, { fg: string; bg: string }> = {
  success: { fg: '#15803d', bg: '#dcfce7' },
  warning: { fg: '#b45309', bg: '#fef3c7' },
  danger: { fg: '#b91c1c', bg: '#fee2e2' },
  info: { fg: '#1d4ed8', bg: '#dbeafe' },
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** A small coloured status pill ("Confirmed", "Reminder"…). `label` is escaped. */
export function emailBadge(label: string, tone: EmailTone) {
  const t = TONES[tone];
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${t.bg};color:${t.fg};font-size:12px;font-weight:600;letter-spacing:0.2px;">${escapeHtml(label)}</span>`;
}

/**
 * A full-width-on-phones button, built as a table so Outlook draws it.
 * `primary` = brand fill; otherwise an outlined secondary button.
 */
export function emailButton(label: string, href: string, primary = true) {
  const c = EMAIL_COLORS;
  const e = escapeHtml;
  const bg = primary ? c.brand : '#ffffff';
  const fg = primary ? '#ffffff' : c.text;
  const border = primary ? c.brand : c.border;
  return `<table role="presentation" cellpadding="0" cellspacing="0" class="btn" style="display:inline-table;margin:0 8px 10px 0;"><tr><td style="border-radius:10px;background:${bg};border:1px solid ${border};"><a href="${e(href)}" style="display:block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;color:${fg};text-decoration:none;text-align:center;border-radius:10px;">${e(label)}</a></td></tr></table>`;
}

/** A tinted panel, e.g. "Need to make a change?". `bodyHtml` is trusted. */
export function emailPanel(title: string, bodyHtml: string) {
  const c = EMAIL_COLORS;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;background:${c.subtle};border-radius:12px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${c.text};">${escapeHtml(title)}</p><div style="font-size:14px;line-height:1.55;color:${c.muted};">${bodyHtml}</div></td></tr></table>`;
}

/**
 * Wraps card content in the full document. `title`, `heading`, `preheader`
 * and `footer` are escaped; `body` is trusted HTML built by the caller from
 * escaped parts.
 */
export function emailLayout(opts: {
  title: string;
  heading: string;
  body: string;
  footer: string;
  /** Inbox preview text (hidden in the email itself). */
  preheader?: string;
  /** Status pill above the heading. */
  badge?: { label: string; tone: EmailTone };
}) {
  const c = EMAIL_COLORS;
  const e = escapeHtml;
  const logo = emailLogoUrl();
  const site = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  const siteLabel = site.startsWith('https://')
    ? site.replace(/^https:\/\/(practitioner\.|admin\.|www\.)?/, '')
    : '';
  const mark = logo
    ? `<img src="${e(logo)}" width="36" height="36" alt="" style="display:block;border:0;border-radius:9px;">`
    : `<div style="width:36px;height:36px;border-radius:9px;background:${c.brand};"></div>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e(opts.title)}</title>
<style>
  @media (max-width: 560px) {
    .card { padding: 28px 20px !important; }
    .btn { display: table !important; width: 100% !important; margin: 0 0 10px 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${c.canvas};-webkit-text-size-adjust:100%;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(opts.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.canvas};">
  <tr>
    <td align="center" style="padding:32px 16px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${FONT};">
        <tr>
          <td style="padding:0 4px 18px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;vertical-align:middle;">${mark}</td>
              <td style="vertical-align:middle;font-size:18px;font-weight:700;letter-spacing:-0.2px;color:${c.text};"><span style="color:${c.brand};">Better</span>You <span style="font-weight:500;color:${c.muted};">Clinic</span></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:18px;border:1px solid ${c.border};overflow:hidden;">
            <div style="height:4px;background:${c.brand};background-image:linear-gradient(90deg,#3f76ed,#2563eb,#1d4fc0);font-size:0;line-height:0;">&nbsp;</div>
            <div class="card" style="padding:32px 32px 28px;">
              ${opts.badge ? `<div style="margin:0 0 12px;">${emailBadge(opts.badge.label, opts.badge.tone)}</div>` : ''}
              <h1 style="margin:0 0 18px;font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-0.3px;color:${c.text};">${e(opts.heading)}</h1>
              ${opts.body}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:${c.muted};text-align:center;">
            ${e(opts.footer)}<br>
            <span style="color:#94a3b8;">Sent by ${e(EMAIL_BRAND)}${siteLabel ? ` · <a href="${e(site)}" style="color:#94a3b8;text-decoration:underline;">${e(siteLabel)}</a>` : ''}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
