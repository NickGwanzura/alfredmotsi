const PRODUCTION_ORIGIN = 'https://splashaircrmzw.site';

function isLoopbackOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  } catch {
    return true;
  }
}

/** Resolve the public origin used in links sent outside the app. */
export function getAppOrigin(): string {
  const candidates = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim().replace(/\/$/, ''));
  // Email links should be usable outside the machine running the app. Local
  // links are only allowed when explicitly opted into for local testing.
  const allowLocalEmailLinks = process.env.ALLOW_LOCAL_EMAIL_LINKS === 'true';

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
      if (!allowLocalEmailLinks && isLoopbackOrigin(candidate)) continue;
      return candidate;
    } catch {
      // Ignore malformed configuration and try the next candidate.
    }
  }

  return PRODUCTION_ORIGIN;
}

export const BRAND_ORIGIN = getAppOrigin();
export const BRAND_LOGO_URL = `${BRAND_ORIGIN}/logo.png`;
export const BRAND_FONT_URL = `${BRAND_ORIGIN}/fonts/Grift-Regular.woff2`;
export const BRAND_EMAIL = process.env.BRAND_EMAIL || 'info@splashaircrmzw.site';
export const BRAND_PHONE = process.env.BRAND_PHONE || '0715212141 / 0773034528';
