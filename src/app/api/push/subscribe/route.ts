import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys } = await req.json();
  if (typeof endpoint !== 'string' || endpoint.length > 2048 || !/^https:\/\//i.test(endpoint) || typeof keys?.p256dh !== 'string' || keys.p256dh.length > 512 || typeof keys?.auth !== 'string' || keys.auth.length > 512) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.user.id!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id! },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await req.json();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id! } });
  return NextResponse.json({ ok: true });
}
