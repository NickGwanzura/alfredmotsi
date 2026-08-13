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
  if (configured && !configured.startsWith('/')) return configured;
  return publicPath(configured?.replace(/^\/+/, '') || 'logo.png');
}
