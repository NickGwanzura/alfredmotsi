import { PrismaClient } from '@prisma/client';
import { BRAND_ORIGIN } from '../src/app/lib/brand';
import { renderPremiumEmail } from '../src/app/lib/email/premium-shell';
import { sendCustomEmail } from '../src/app/lib/email/send';

const prisma = new PrismaClient();

const SUBJECT = 'Please use Splash Air CRM and report any issues';

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

async function sendReminder(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role: { not: 'client' } },
    select: { email: true, name: true },
    orderBy: { email: 'asc' },
  });

  const recipients = Array.from(
    new Map(users.map((user) => [user.email.trim().toLowerCase(), user])).values(),
  );

  if (recipients.length === 0) {
    console.log('No staff users found to email.');
    return;
  }

  let sent = 0;
  let failed = 0;
  console.log(`Sending CRM usage reminder to ${recipients.length} staff users...`);

  for (const user of recipients) {
    const html = renderPremiumEmail({
      preview: 'Please sign in to Splash Air CRM and report anything that needs attention.',
      eyebrow: 'Team update',
      title: 'Please use the CRM and report issues',
      recipientName: firstName(user.name),
      bodyHtml: `
        <p style="margin:0 0 14px;">Please sign in to Splash Air CRM and use it as the single place for our daily work.</p>
        <p style="margin:0 0 8px;">Please keep the following up to date:</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li style="margin:0 0 7px;">customers, sites, jobs and schedules</li>
          <li style="margin:0 0 7px;">job notes, clock in/out, parts, gas and expenses</li>
          <li style="margin:0 0 7px;">quotes, invoices, payments and follow-ups</li>
          <li style="margin:0;">CRM activity and outcomes after customer contact</li>
        </ul>
        <p style="margin:0;">If anything looks wrong, please reply to this email with the page, customer or job reference, what you expected, what happened, and a screenshot if possible. Early reports help us fix issues quickly.</p>
      `,
      cta: { label: 'Open Splash Air CRM', url: BRAND_ORIGIN },
      footerNote: 'This is an internal team reminder. Please reply with any issue or suggestion.',
    });

    const result = await sendCustomEmail({
      to: user.email,
      subject: SUBJECT,
      html,
      category: 'crm-usage-reminder',
      isTransactional: false,
    });

    if (result.success) {
      sent += 1;
      console.log(`Sent to ${user.email}`);
    } else {
      failed += 1;
      console.error(`Failed for ${user.email}:`, result.error);
    }

    // Keep within Resend's sending limits and avoid bursty delivery.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.log(`Campaign complete: ${sent} sent, ${failed} failed.`);
}

sendReminder()
  .catch((error) => {
    console.error('CRM reminder campaign failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
