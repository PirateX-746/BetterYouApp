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
 * Wraps card content in the full document. `title` and `footer` are
 * escaped; `body` is trusted HTML built by the caller from escaped parts.
 */
export function emailLayout(opts: {
  title: string;
  heading: string;
  body: string;
  footer: string;
}) {
  const c = EMAIL_COLORS;
  const e = escapeHtml;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${c.canvas};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.canvas};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="padding:0 4px 16px;font-size:17px;font-weight:600;color:${c.text};">
            <span style="color:${c.brand};">Better</span>You
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:32px 28px;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600;color:${c.text};">${e(opts.heading)}</h1>
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 4px 0;font-size:12px;line-height:1.5;color:${c.muted};">${e(opts.footer)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
