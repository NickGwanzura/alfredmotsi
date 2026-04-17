import { NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { AnnouncementEmail } from '@/app/lib/email/templates-new';

/**
 * POST /api/admin/announce-update
 * Emails all admin users a branded summary of the latest platform changes.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { email: true, name: true },
  });

  if (admins.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const subject = "What's new in Splash Air CRM — latest updates";

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const results: PromiseSettledResult<{ success: boolean; error?: unknown }>[] = [];

  for (const a of admins) {
    try {
      const html = await render(AnnouncementEmail({
        recipientName: a.name.split(' ')[0] || 'there',
        preview: 'Gas usage warnings, clock-in reminders, PDF job cards, user CRUD, and more.',
        headline: 'Latest platform updates',
        kind: 'update',
        intro:
          'Several improvements have just been deployed to Splash Air CRM. ' +
          'Here\'s a summary of what\'s new — most of it is aimed at keeping ' +
          'our operational data clean and reducing the manual chase-ups.',
        callout: {
          title: 'New — gas usage warnings',
          body:
            'Jobs that need refrigerant logging are now visually flagged. ' +
            'Completed jobs missing gas data show a red warning; in-progress ones ' +
            'show an amber reminder. Clicking either opens the ODS tab to log it.',
        },
        sections: [
          {
            title: 'Gas usage tracking',
            bullets: [
              'Warning icon on every job row that likely needs gas logged but has none',
              'Banner at the top of the Job Card modal when logging is missing',
              'Click the banner to jump straight to the ODS tab and log usage',
              'Sales, inspections, and quotes never trigger the warning',
              'Jobs where diagnostics already captured refrigerant use are skipped',
            ],
          },
          {
            title: 'Clock-in discipline',
            bullets: [
              'Every user has received an email reminder to clock in and clock out on every job',
              'Keep an eye on jobs with missing times — they will affect invoicing and payroll',
            ],
          },
          {
            title: 'Job completion workflow',
            bullets: [
              'Customers now automatically receive a branded completion email',
              'The Job Card PDF is attached to every completion email — admins + customer',
              'Endpoint GET /api/jobs/:id/pdf serves the same PDF on demand',
            ],
          },
          {
            title: 'User management (CRUD)',
            bullets: [
              'Full edit: change name, email, role, phone, and specialty in one place',
              'Resend Credentials button emails a new temporary password to any user',
              'Remove Duplicates button cleans up accounts sharing the same email',
              'Duplicate accounts are flagged visually in the users table',
            ],
          },
          {
            title: 'PDF branding',
            body:
              'Every generated PDF carries the official company header and footer — ' +
              'Splashair Air Conditioning (Pvt) Ltd · 661 Lorraine Drive, Bluffhill, Harare · ' +
              'Phone 0715212141 & 0773034528 · Services: Air Conditioning & Refrigeration, ' +
              'Air Conditioning Equipment & Systems, Air Conditioning Installation.',
          },
        ],
        ctaLabel: 'Open Splash Air CRM',
        ctaUrl: 'https://splashaircrmzw.site',
        closing:
          'If you spot anything odd or have suggestions, reply to this email and we\'ll follow up.',
      }));

      const r = await sendCustomEmail({
        to: a.email,
        subject,
        html,
        category: 'platform-update',
        isTransactional: true,
      });
      results.push({ status: 'fulfilled', value: r });
    } catch (err) {
      results.push({ status: 'rejected', reason: err });
    }
    // Throttle to stay under Resend's 2 req/sec limit
    await sleep(600);
  }

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[announce-update] sent ${sent}/${admins.length} admin update emails`);

  return NextResponse.json({ ok: true, sent, total: admins.length });
}
