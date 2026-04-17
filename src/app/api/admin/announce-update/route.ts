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

  const subject = "What's new in Splash Air CRM — April 2026";

  const results = await Promise.allSettled(
    admins.map(async a => {
      const html = await render(AnnouncementEmail({
        recipientName: a.name.split(' ')[0] || 'there',
        preview: 'New features are live — completion emails, PDFs, user management, and more.',
        headline: 'Platform updates are live',
        kind: 'update',
        intro:
          'A batch of improvements has just been deployed to Splash Air CRM. ' +
          'Here\'s a quick tour of everything that\'s new.',
        callout: {
          title: 'Heads up',
          body:
            'Customers now automatically receive a branded Job Card PDF by email ' +
            'the moment a technician marks a job complete.',
        },
        sections: [
          {
            title: 'Job completion',
            bullets: [
              'Customers receive a completion email automatically when a job is marked done',
              'A branded Job Card PDF is attached to every completion email',
              'Admins also get the same email + PDF on every completion',
              'New endpoint to download any Job Card as PDF on demand',
            ],
          },
          {
            title: 'User management',
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
              'Every generated PDF now carries the official company header and footer — ' +
              'Splashair Air Conditioning (Pvt) Ltd · 661 Lorraine Drive, Bluffhill, Harare · ' +
              'Phone 0715212141 & 0773034528.',
          },
          {
            title: 'Technician job cards',
            bullets: [
              'Technicians can log gas usage directly from the job card ODS tab',
              'Materials with quantities and units can be recorded per job',
              'Gas stock and usage now surface real error messages on failure',
            ],
          },
        ],
        ctaLabel: 'Open Splash Air CRM',
        ctaUrl: 'https://splashaircrmzw.site',
        closing: 'If you run into anything unexpected, reply to this email and we\'ll look into it.',
      }));

      return sendCustomEmail({
        to: a.email,
        subject,
        html,
        category: 'platform-update',
        isTransactional: true,
      });
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[announce-update] sent ${sent}/${admins.length} admin update emails`);

  return NextResponse.json({ ok: true, sent, total: admins.length });
}
