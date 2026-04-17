import { NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { AnnouncementEmail } from '@/app/lib/email/templates-new';

/**
 * POST /api/admin/notify-clock-in
 * Sends a friendly reminder to every user (admins + techs) asking them
 * to log clock-in and clock-out times for every job.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { role: { in: ['admin', 'tech'] } },
    select: { email: true, name: true, role: true },
  });

  if (users.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const subject = 'Please clock in and clock out on every job';

  const results = await Promise.allSettled(
    users.map(async u => {
      const isTechUser = u.role === 'tech';
      const html = await render(AnnouncementEmail({
        recipientName: u.name.split(' ')[0] || 'there',
        preview: 'A quick reminder to log your clock-in and clock-out times on every job.',
        headline: 'Clock in. Clock out. Every job.',
        kind: 'reminder',
        intro:
          'We\'re tightening up how time is tracked across the team. ' +
          'To keep customer billing accurate, payroll fair, and our records clean, ' +
          'please make sure to log your times on every single job — no exceptions.',
        callout: {
          title: 'Why this matters',
          body:
            'Clock-in and clock-out times drive job duration reports, customer invoices, ' +
            'and technician productivity reviews. Missing times mean missing data — ' +
            'and that creates disputes we can all avoid.',
        },
        sections: [
          {
            title: 'What we\'re asking',
            bullets: [
              'Clock in the moment you arrive on site',
              'Clock out before you leave the site — not later in the day',
              'Do this for every job, whether it\'s 10 minutes or 10 hours',
              isTechUser
                ? 'If you forget, let your admin know as soon as possible so we can correct it'
                : 'Keep an eye on unallocated or incomplete time entries in the dashboard',
            ],
          },
          {
            title: 'How to do it',
            bullets: [
              'Open the job from your schedule',
              'Tap "Clock In" when you start — the system records the exact time',
              'Tap "Clock Out" when you\'re done — the job card saves both times',
              'Review the times before marking the job complete',
            ],
          },
          {
            title: 'Consistency helps everyone',
            body:
              'When every job has clock-in and clock-out times, everyone wins: customers get accurate invoices, ' +
              'technicians get credited for all the time they work, and the business can make smart decisions ' +
              'about scheduling, pricing, and performance. Thanks for being part of this.',
          },
        ],
        ctaLabel: 'Go to the platform',
        ctaUrl: 'https://splashaircrmzw.site',
        closing:
          'If you\'re unsure how to log a time for a past job or have any questions, ' +
          'just reply to this email and we\'ll walk you through it.',
      }));

      return sendCustomEmail({
        to: u.email,
        subject,
        html,
        category: 'clock-in-reminder',
        isTransactional: true,
      });
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[notify-clock-in] sent ${sent}/${users.length} clock-in reminder emails`);

  return NextResponse.json({ ok: true, sent, total: users.length });
}
