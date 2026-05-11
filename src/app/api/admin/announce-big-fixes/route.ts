import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { BigFixesEmail } from '@/app/lib/email/templates-big-fixes';

/**
 * POST /api/admin/announce-big-fixes
 * Sends the "Big Fixes Deployed" announcement to ALL users (admins + techs).
 * Admin-only endpoint.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch all active users (admins + techs)
  const users = await prisma.user.findMany({
    where: { role: { in: ['admin', 'tech'] } },
    select: { email: true, name: true, role: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, total: 0 });
  }

  const subject = '✅ Critical Data Integrity Fixes Deployed';

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const results: Array<{ status: 'fulfilled' | 'rejected'; value?: { success: boolean; error?: unknown }; reason?: unknown }> = [];

  for (const u of users) {
    try {
      const html = await render(
        BigFixesEmail({
          recipientName: u.name.split(' ')[0] || 'there',
        })
      );

      const r = await sendCustomEmail({
        to: u.email,
        subject,
        html,
        category: 'big-fixes-announcement',
        isTransactional: true,
      });
      results.push({ status: 'fulfilled', value: r });
    } catch (err) {
      results.push({ status: 'rejected', reason: err });
    }
    // Throttle to stay under Resend's 2 req/sec limit
    await sleep(600);
  }

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value?.success).length;
  console.log(`[announce-big-fixes] sent ${sent}/${users.length} emails`);

  return NextResponse.json({ ok: true, sent, total: users.length });
}
