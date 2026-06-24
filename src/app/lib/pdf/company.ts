/**
 * Company details shown on every PDF (header + footer).
 * Loaded dynamically from the database so settings changes take effect immediately.
 * Falls back to hardcoded defaults if the DB query fails.
 */
import { prisma } from '@/app/lib/db';

export interface CompanyData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vatRate: number;
  vatNumber: string;
  logoUrl: string;
  tagline: string;
  services: string;
}

export const FALLBACK: CompanyData = {
  name: 'Splash Air Conditioning',
  address: '661 Lorraine Drive, Bluffhill, Harare',
  phone: '0715212141 / 0773034528',
  email: 'info@splashaircrmzw.site',
  website: 'https://splashaircrmzw.site',
  vatRate: 15.5,
  vatNumber: '',
  logoUrl: '',
  tagline: 'Air Conditioning & Refrigeration Specialists',
  services: 'Installation, Maintenance, Repairs, Sales',
};

let cached: CompanyData | null = null;

export async function loadCompany(): Promise<CompanyData> {
  if (cached) return cached;
  try {
    const profile = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    if (profile) {
      cached = {
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
        email: profile.email || FALLBACK.email,
        website: profile.website || FALLBACK.website,
        vatRate: profile.vatRate,
        vatNumber: profile.vatNumber || '',
        logoUrl: profile.logoUrl || '',
        tagline: profile.tagline || FALLBACK.tagline,
        services: profile.services || FALLBACK.services,
      };
      return cached;
    }
  } catch {
    // DB not available (e.g. during build), use fallback
  }
  return FALLBACK;
}

export function clearCompanyCache(): void {
  cached = null;
}

// For backwards compatibility with existing imports
export const COMPANY = {
  name: 'Splash Air Conditioning',
  address: '661 Lorraine Drive, Bluffhill, Harare',
  phones: ['0715212141', '0773034528'],
  services: [
    'Air Conditioning & Refrigeration',
    'Air Conditioning Equipment & Systems',
    'Air Conditioning Installation',
  ],
} as const;

export const COMPANY_PHONE_LINE = COMPANY.phones.join(' & ');
export const COMPANY_SERVICES_LINE = COMPANY.services.join(', ');
