import { BRAND_EMAIL, BRAND_LOGO_URL, BRAND_ORIGIN, BRAND_PHONE } from '@/app/lib/brand';

const BRAND = {
  navy: '#093a68',
  navyDark: '#062d52',
  pale: '#e8eef5',
  text: '#161616',
  muted: '#525252',
  border: '#e0e0e0',
  surface: '#f4f6f8',
  logo: BRAND_LOGO_URL,
  website: BRAND_ORIGIN,
  email: BRAND_EMAIL,
  phone: BRAND_PHONE,
} as const;

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderPremiumEmail({
  preview,
  eyebrow,
  title,
  recipientName,
  bodyHtml,
  cta,
  footerNote,
}: {
  preview: string;
  eyebrow: string;
  title: string;
  recipientName?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const greeting = recipientName
    ? `<p style="margin:0 0 18px;color:${BRAND.muted};font-size:15px;line-height:1.65;">Dear ${escapeEmailHtml(recipientName)},</p>`
    : '';
  const action = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="border-radius:6px;background:${BRAND.navy};"><a href="${escapeEmailHtml(cta.url)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.2px;">${escapeEmailHtml(cta.label)}</a></td></tr></table>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>@font-face{font-family:Grift;src:url('${BRAND.website}/fonts/Grift-Regular.woff2') format('woff2');font-weight:400}@font-face{font-family:Grift;src:url('${BRAND.website}/fonts/Grift-SemiBold.woff2') format('woff2');font-weight:600}</style></head>
<body style="margin:0;padding:0;background:${BRAND.surface};font-family:Grift,'Helvetica Neue',Arial,sans-serif;color:${BRAND.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeEmailHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;box-shadow:0 12px 34px rgba(9,58,104,.08);">
<tr><td style="height:6px;background:${BRAND.navy};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 38px 22px;border-bottom:1px solid ${BRAND.border};"><img src="${BRAND.logo}" width="190" alt="Splash Air Conditioning" style="display:block;width:190px;max-width:55%;height:auto;border:0;"><p style="margin:12px 0 0;color:${BRAND.muted};font-size:11px;text-transform:uppercase;letter-spacing:1.4px;">Air Conditioning &amp; Refrigeration</p></td></tr>
<tr><td style="padding:38px;"><p style="margin:0 0 9px;color:${BRAND.navy};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.3px;">${escapeEmailHtml(eyebrow)}</p><h1 style="margin:0 0 24px;color:${BRAND.navyDark};font-size:27px;line-height:1.2;font-weight:600;letter-spacing:-.4px;">${escapeEmailHtml(title)}</h1>${greeting}<div style="color:${BRAND.muted};font-size:15px;line-height:1.65;">${bodyHtml}</div>${action}<p style="margin:28px 0 0;color:${BRAND.muted};font-size:14px;line-height:1.6;">Kind regards,<br><strong style="color:${BRAND.text};">Splash Air Conditioning</strong></p></td></tr>
<tr><td style="padding:24px 38px;background:${BRAND.pale};border-top:1px solid ${BRAND.border};"><p style="margin:0;color:${BRAND.muted};font-size:11px;line-height:1.65;text-align:center;">${footerNote ? `${escapeEmailHtml(footerNote)}<br>` : ''}${BRAND.phone} &nbsp;&middot;&nbsp; <a href="mailto:${BRAND.email}" style="color:${BRAND.navy};text-decoration:none;">${BRAND.email}</a><br><a href="${BRAND.website}" style="color:${BRAND.navy};text-decoration:none;">splashaircrmzw.site</a></p></td></tr>
</table></td></tr></table></body></html>`;
}
