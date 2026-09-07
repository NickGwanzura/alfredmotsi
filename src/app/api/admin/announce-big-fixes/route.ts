import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { AnnouncementEmail } from '@/app/lib/email/templates-new';

/**
 * POST /api/admin/announce-big-fixes
 * Sends the latest job workflow fixes announcement to all staff users.
 * Admin-only endpoint.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Guard: only allow one announcement per 24 hours to prevent accidental spam
  const recentLog = await prisma.emailDeliveryLog.findFirst({
    where: { category: 'job-creation-fixes-announcement', createdAt: { gte: new Date(Date.now() - 86400000) } },
    orderBy: { createdAt: 'desc' },
  });
  if (recentLog) {
    return NextResponse.json({
      ok: false,
      error: 'Announcement was already sent within the last 24 hours. Please wait before sending again.',
    }, { status: 429 });
  }

  // Notify every staff role that creates, dispatches, or works on jobs.
  const users = await prisma.user.findMany({
    where: { role: { in: ['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech'] } },
    select: { email: true, name: true, role: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, total: 0 });
  }

  const subject = '✅ Splash Air CRM — new job workflow fixes deployed';

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const results: Array<{ status: 'fulfilled' | 'rejected'; value?: { success: boolean; error?: unknown }; reason?: unknown }> = [];

  for (const u of users) {
    try {
      const html = await render(AnnouncementEmail({
        recipientName: u.name.split(' ')[0] || 'there',
        preview: 'New job creation, scheduling, security, and stock-control fixes are now live.',
        headline: 'New job workflow fixes are live',
        kind: 'update',
        intro: 'We have deployed a hardened job workflow so new jobs save reliably, scheduling conflicts are caught before they reach the calendar, and staff permissions are enforced consistently.',
        sections: [
          {
            title: 'What was fixed',
            bullets: [
              'New jobs now receive a server-generated job card reference and save recurring schedules correctly.',
              'Invalid dates, times, durations, duplicate assignments, and technician schedule conflicts are rejected with a clear message.',
              'Technician and customer responses no longer expose password hashes or other sensitive fields.',
              'Only owner, admin, and dispatcher users can draw stock for a job; technicians can view usage but cannot issue stock independently.',
              'Assigned technicians receive a branded assignment email after a job is created.',
            ],
          },
          {
            title: 'Please test',
            bullets: [
              'Sign in and create a test job with a customer, date, time, duration, and technician.',
              'Confirm recurring schedules and conflict messages behave as expected.',
              'Report any issue to the CRM administrator with the job card reference and a screenshot.',
            ],
          },
        ],
        ctaLabel: 'Open Splash Air CRM',
        ctaUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://splashaircrmzw.site',
        closing: 'Thank you for helping us verify the release.',
      }));

      const r = await sendCustomEmail({
        to: u.email,
        subject,
        html,
        category: 'job-creation-fixes-announcement',
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
