import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { AnnouncementEmail } from '@/app/lib/email/templates-new';

/**
 * POST /api/admin/notify-gas-logging
 * Reminds every user (admins + techs) to log gas usage against every job
 * where refrigerant was involved. Pass ?detail=1 to get per-recipient results.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { role: { in: ['admin', 'tech'] } },
    select: { email: true, name: true, role: true },
  });

  if (users.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const subject = 'Please log gas usage on every job where refrigerant is used';

  const results = await Promise.allSettled(
    users.map(async u => {
      const isTechUser = u.role === 'tech';
      const html = await render(AnnouncementEmail({
        recipientName: u.name.split(' ')[0] || 'there',
        preview: 'A quick reminder to log refrigerant usage against every job that uses it.',
        headline: 'Log gas usage — every job, every time',
        kind: 'reminder',
        intro:
          'Refrigerant is expensive, regulated, and tracked by stock. ' +
          'When we don\'t record what was used on a job, we lose money, ' +
          'fail our ODS reports, and can\'t tell when to reorder. ' +
          'Please help us keep this clean by logging gas usage on every applicable job.',
        callout: {
          title: 'When to log',
          body:
            'Any installation, maintenance, or repair job where you recover, reuse, or charge refrigerant — ' +
            'log it from the ODS tab on the Job Card. If no refrigerant was touched, no log is needed.',
        },
        sections: [
          {
            title: 'What the platform will do',
            bullets: [
              'Jobs that likely need gas logging now show a warning icon in the jobs list',
              'Open the Job Card and you\'ll see an amber banner while the job is in progress',
              'If the job is marked completed with no gas logged, the banner turns red',
              'Click the banner to jump straight to the ODS tab where you can log the usage',
            ],
          },
          {
            title: 'How to log it',
            bullets: [
              'Open the job from your schedule or jobs list',
              'Switch to the "ODS" tab',
              'Pick the gas type from stock, enter the quantity used in kg',
              'Add a short purpose note (e.g. "recharge after leak repair")',
              'Hit Log — stock is deducted automatically',
            ],
          },
          {
            title: 'Which jobs need it',
            body:
              isTechUser
                ? 'Installations, maintenance jobs, and repairs typically use refrigerant. ' +
                  'Sales, inspections, quotes, and general callouts usually don\'t. ' +
                  'If in doubt, log it — an over-logged kg is easier to correct than one missing from stock.'
                : 'Keep an eye on completed jobs flagged red in the jobs list — ' +
                  'those are jobs marked done without any refrigerant logged. ' +
                  'If a technician missed it, chase them up so we can correct the record.',
          },
        ],
        ctaLabel: 'Go to the platform',
        ctaUrl: 'https://splashaircrmzw.site',
        closing:
          'This is about accuracy, not blame — we all slip sometimes. ' +
          'If you spot a job you forgot to log gas on, open it now and add the record. Thanks team.',
      }));

      return sendCustomEmail({
        to: u.email,
        subject,
        html,
        category: 'gas-logging-reminder',
        isTransactional: true,
      });
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[notify-gas-logging] sent ${sent}/${users.length} gas logging reminders`);

  const url = new URL(request.url);
  if (url.searchParams.get('detail') === '1') {
    const serialize = (e: unknown): string => {
      if (!e) return 'unknown';
      if (e instanceof Error) return e.message;
      if (typeof e === 'string') return e;
      try { return JSON.stringify(e); } catch { return String(e); }
    };
    const detail = results.map((r, i) => ({
      email: users[i].email,
      name: users[i].name,
      role: users[i].role,
      ok: r.status === 'fulfilled' && r.value.success,
      error: r.status === 'fulfilled'
        ? (r.value.success ? null : serialize(r.value.error))
        : serialize(r.reason),
    }));
    return NextResponse.json({ ok: true, sent, total: users.length, detail });
  }

  return NextResponse.json({ ok: true, sent, total: users.length });
}
