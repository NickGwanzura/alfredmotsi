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
  if (!Array.isArray(userIds) || userIds.length > 100 || userIds.some((id: unknown) => typeof id !== 'string' || id.length > 100)) {
    return NextResponse.json({ error: 'userIds must be an array of at most 100 valid IDs' }, { status: 400 });
  }
  if (typeof title !== 'string' || !title.trim() || title.length > 160 || typeof body !== 'string' || !body.trim() || body.length > 1000) {
    return NextResponse.json({ error: 'Valid title and body are required' }, { status: 400 });
  }
  if (url !== undefined && (typeof url !== 'string' || url.length > 500 || (!url.startsWith('/') && !/^https:\/\//i.test(url)))) {
    return NextResponse.json({ error: 'url must be a relative path or HTTPS URL' }, { status: 400 });
  }
  await sendPushToUsers(userIds, { title: title.trim(), body: body.trim(), url: url || '/' });
  return NextResponse.json({ ok: true });
}
