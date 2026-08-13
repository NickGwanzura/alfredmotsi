import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { clearCompanyCache } from '@/app/lib/pdf/company';

const DEFAULTS = {
  name: 'Splash Air Conditioning',
  address: '661 Lorraine Drive, Bluffhill, Harare',
  phone: '0715212141 / 0773034528',
  email: 'info@splashaircrmzw.site',
  website: 'https://splashaircrmzw.site',
  vatRate: 15.5,
  tagline: 'Air Conditioning & Refrigeration Specialists',
  services: 'Installation, Maintenance, Repairs, Sales',
};

async function getOrCreate() {
  try {
    let profile = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: { id: 'default', ...DEFAULTS },
      });
    }
    return profile;
  } catch (error) {
    // Keep the dashboard usable while a delayed production migration is being
    // applied. Writes still return an explicit 503 instead of a raw Prisma 500.
    console.error('[company-profile] Storage unavailable:', error);
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const profile = await getOrCreate();
  return NextResponse.json(profile || { id: 'default', ...DEFAULTS, vatNumber: '', logoUrl: '', onboarded: false });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = ['name', 'address', 'phone', 'email', 'website', 'vatRate', 'vatNumber', 'logoUrl', 'tagline', 'services', 'onboarded'];
  const updateData: Record<string, unknown> = {};

  for (const key of allowed) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const existing = await getOrCreate(); // ensure it exists
  if (!existing) return NextResponse.json({ error: 'Company profile storage is not ready yet. Please retry shortly.' }, { status: 503 });

  const profile = await prisma.companyProfile.update({
    where: { id: 'default' },
    data: updateData,
  });
  clearCompanyCache();

  return NextResponse.json(profile);
}
