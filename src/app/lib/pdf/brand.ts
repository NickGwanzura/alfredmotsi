import path from 'node:path';
import { Font } from '@react-pdf/renderer';

export const PDF_FONT_FAMILY = 'Grift';
export const PDF_BRAND_BLUE = '#093a68';
export const PDF_BRAND_BLUE_DARK = '#062d52';
export const PDF_BRAND_BLUE_LIGHT = '#e8eef5';

const publicPath = (...segments: string[]) => path.join(process.cwd(), 'public', ...segments);

Font.register({
  family: PDF_FONT_FAMILY,
  fonts: [
    { src: publicPath('fonts', 'Grift-Regular.ttf'), fontWeight: 400 },
    { src: publicPath('fonts', 'Grift-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: publicPath('fonts', 'Grift-Medium.ttf'), fontWeight: 500 },
    { src: publicPath('fonts', 'Grift-SemiBold.ttf'), fontWeight: 600 },
    { src: publicPath('fonts', 'Grift-Bold.ttf'), fontWeight: 700 },
  ],
});

/** Use the configured brand mark when available, with the bundled logo as a guaranteed fallback. */
export function pdfLogoSource(logoUrl?: string | null): string {
  const configured = logoUrl?.trim();
  // PDFs are rendered server-side. Do not fetch arbitrary remote URLs from a
  // profile field (which would create an SSRF path); use bundled assets only.
  if (configured?.startsWith('/') && !configured.includes('..')) {
    return publicPath(configured.replace(/^\/+/, ''));
  }
  if (/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(configured || '') && configured!.length <= 2_500_000) {
    return configured!;
  }
  return publicPath('logo.png');
}
