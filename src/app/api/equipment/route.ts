import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { auditServiceAction, boundedStringArray, cleanText, FIELD_ROLES, OPERATIONS_ROLES, serviceSession } from '@/app/lib/serviceAuth';
import type { UnitType } from '@prisma/client';

const UNIT_TYPES = new Set(['Split_System', 'Ducted', 'Package_Unit', 'Multi_Head', 'Cassette', 'VRV_VRF', 'Refrigeration_System', 'Chiller', 'Heat_Pump', 'Precision_Cooling']);
const unitMap: Record<string, string> = {
  'Split System': 'Split_System', 'Package Unit': 'Package_Unit', 'Multi-Head': 'Multi_Head',
  'VRV/VRF': 'VRV_VRF', 'Refrigeration System': 'Refrigeration_System', 'Heat Pump': 'Heat_Pump',
  'Precision Cooling': 'Precision_Cooling',
};

export async function GET(request: NextRequest) {
  const { session, error } = await serviceSession([...FIELD_ROLES, 'sales']);
  if (error) return error;
  const customerId = request.nextUrl.searchParams.get('customerId');
  const siteId = request.nextUrl.searchParams.get('siteId');
  const isTech = session!.user.role === 'tech';
  const equipment = await prisma.equipment.findMany({
    where: { ...(customerId && { customerId }), ...(siteId && { siteId }), ...(isTech ? { jobs: { some: { OR: [{ technicians: { some: { id: session!.user.id } } }, { coTechnicians: { some: { id: session!.user.id } } }] } } } : {}) },
    include: { site: true, jobs: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, jobCardRef: true, title: true, date: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return NextResponse.json(equipment);
}

export async function POST(request: NextRequest) {
  const { session, error } = await serviceSession(OPERATIONS_ROLES);
  if (error) return error;
  const body = await request.json();
  const siteId = cleanText(body.siteId, 100);
  const rawType = unitMap[body.unitType] || body.unitType;
  if (!siteId || !UNIT_TYPES.has(rawType)) {
    return NextResponse.json({ error: 'Valid site and unit type are required' }, { status: 400 });
  }
  const site = await prisma.serviceSite.findUnique({ where: { id: siteId }, select: { customerId: true } });
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const equipment = await prisma.equipment.create({
    data: {
      siteId,
      customerId: site.customerId,
      unitType: rawType as UnitType,
      name: cleanText(body.name, 120) || null,
      brand: cleanText(body.brand, 120) || null,
      model: cleanText(body.model, 120) || null,
      serialNumber: cleanText(body.serialNumber, 120) || null,
      installDate: cleanText(body.installDate, 10) || null,
      warrantyExpiry: cleanText(body.warrantyExpiry, 10) || null,
      photos: boundedStringArray(body.photos, 20, 2_000_000).filter((photo) => /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(photo) || /^https:\/\//i.test(photo)),
      notes: cleanText(body.notes) || null,
    },
    include: { site: true, jobs: true },
  });
  await auditServiceAction(session!, 'create_equipment', `Registered equipment ${equipment.name || equipment.id} at ${siteId}`);
  return NextResponse.json(equipment, { status: 201 });
}
