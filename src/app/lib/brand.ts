const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://splashaircrmzw.site';

export const BRAND_ORIGIN = configuredOrigin.replace(/\/$/, '');
export const BRAND_LOGO_URL = `${BRAND_ORIGIN}/logo.png`;
export const BRAND_FONT_URL = `${BRAND_ORIGIN}/fonts/Grift-Regular.woff2`;
export const BRAND_EMAIL = process.env.BRAND_EMAIL || 'info@splashaircrmzw.site';
export const BRAND_PHONE = process.env.BRAND_PHONE || '0715212141 / 0773034528';
