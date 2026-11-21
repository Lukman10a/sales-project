/**
 * The one email layout: a table-based page that renders in Gmail, Outlook and
 * Apple Mail. Colours are the web app's design tokens (apps/web/src/index.css,
 * light theme) as hex, since mail clients ignore CSS variables.
 */
export const EMAIL_TOKENS = {
  background: '#f4f4f5',
  card: '#ffffff',
  foreground: '#09090b',
  muted: '#71717a',
  border: '#e4e4e7',
  primary: '#18181b',
  primaryForeground: '#fafafa',
  destructive: '#ef4444',
  font: "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export interface EmailContent {
  /** Shown in the inbox list before the email is opened. */
  preview: string;
  heading: string;
  /** Plain-text paragraphs; escaped for HTML. */
  paragraphs: string[];
  /** Label/value rows, e.g. a receipt. */
  details?: Array<[string, string]>;
  action?: { label: string; href: string };
  /** Small print under the button. */
  footnote?: string;
  tone?: 'default' | 'warning';
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const t = EMAIL_TOKENS;

export function renderHtml(c: EmailContent): string {
  const accent = c.tone === 'warning' ? t.destructive : t.primary;
  const paragraphs = c.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${t.foreground}">${escapeHtml(p)}</p>`,
    )
    .join('');
  const details = c.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${t.border};border-radius:8px">${c.details
        .map(
          ([label, value], i) =>
            `<tr><td style="padding:10px 14px;font-size:14px;color:${t.muted};${i ? `border-top:1px solid ${t.border};` : ''}">${escapeHtml(label)}</td><td align="right" style="padding:10px 14px;font-size:14px;font-weight:600;color:${t.foreground};${i ? `border-top:1px solid ${t.border};` : ''}">${escapeHtml(value)}</td></tr>`,
        )
        .join('')}</table>`
    : '';
  const action = c.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="border-radius:8px;background:${t.primary}"><a href="${escapeHtml(c.action.href)}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;color:${t.primaryForeground};text-decoration:none;border-radius:8px">${escapeHtml(c.action.label)}</a></td></tr></table>
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${t.muted}">Or paste this link into your browser:<br><a href="${escapeHtml(c.action.href)}" style="color:${t.muted};word-break:break-all">${escapeHtml(c.action.href)}</a></p>`
    : '';
  const footnote = c.footnote
    ? `<p style="margin:0;font-size:13px;line-height:20px;color:${t.muted}">${escapeHtml(c.footnote)}</p>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(c.heading)}</title></head>
<body style="margin:0;padding:0;background:${t.background};font-family:${t.font}">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(c.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.background}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 0 16px;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${t.foreground}">LUXA</td></tr>
<tr><td style="background:${t.card};border:1px solid ${t.border};border-top:3px solid ${accent};border-radius:12px;padding:28px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:28px;font-weight:700;color:${t.foreground}">${escapeHtml(c.heading)}</h1>
${paragraphs}${details}${action}${footnote}
</td></tr>
<tr><td style="padding:16px 4px 0;font-size:12px;line-height:18px;color:${t.muted}">You are receiving this because of your LUXA account. LUXA, Lagos, Nigeria.</td></tr>
</table></td></tr></table>
</body></html>`;
}

export function renderText(c: EmailContent): string {
  return [
    ...c.paragraphs,
    ...(c.details?.length
      ? [c.details.map(([l, v]) => `${l}: ${v}`).join('\n')]
      : []),
    ...(c.action ? [`${c.action.label}: ${c.action.href}`] : []),
    ...(c.footnote ? [c.footnote] : []),
  ].join('\n\n');
}
