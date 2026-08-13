import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendPushToUsers } from '@/app/lib/push/server';
import { isAdmin } from '@/app/lib/auth/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin((session.user as any).role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userIds, title, body, url } = await req.json();
  await sendPushToUsers(userIds, { title, body, url });
  return NextResponse.json({ ok: true });
}
