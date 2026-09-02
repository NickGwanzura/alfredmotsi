import { PrismaClient } from '@prisma/client';
import { render } from '@react-email/components';
import { AnnouncementEmail } from '../src/app/lib/email/templates-new';
import { sendCustomEmail } from '../src/app/lib/email/send';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech'] } },
    select: { email: true, name: true },
    orderBy: { email: 'asc' },
  });

  const subject = 'Splash Air CRM — customer records are safer and easier to manage';
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const html = await render(AnnouncementEmail({
        recipientName: user.name?.split(' ')[0] || 'there',
        preview: 'Customer add, edit, and archive safeguards are now live.',
        headline: 'Customer lifecycle update',
        kind: 'update',
        intro: 'The customer database has been updated to make record maintenance safer, clearer, and consistent across roles.',
        sections: [
          {
            title: 'Add and edit customers',
            bullets: [
              'Customer details can now be edited from the customer profile.',
              'Required fields, email format, field lengths, and duplicate emails are validated.',
              'Server errors now appear in the form instead of failing silently.',
            ],
          },
          {
            title: 'Safe customer removal',
            bullets: [
              'Remove is implemented as archive, not hard delete.',
              'Archived customers are hidden from active lists and portal access is disabled.',
              'Jobs, invoices, payments, sites, equipment, and history are preserved.',
              'Only administrators can archive a customer.',
            ],
          },
          {
            title: 'Please test',
            bullets: [
              'Open Customers and try adding a record with a duplicate email.',
              'Edit a customer and confirm the saved details remain after refresh.',
              'If anything looks wrong, reply to this email with the customer name and what happened.',
            ],
          },
        ],
        ctaLabel: 'Open Splash Air CRM',
        ctaUrl: 'https://splashaircrmzw.site',
        closing: 'Thank you for testing the update and reporting anything unusual.',
      }));

      const result = await sendCustomEmail({
        to: user.email,
        subject,
        html,
        category: 'customer-lifecycle-update',
        isTransactional: true,
      });
      if (result.success) sent++;
      else failed++;
    } catch (error) {
      failed++;
      console.error(`Failed to send customer lifecycle update to ${user.email}:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.log(`Customer lifecycle update complete: ${sent} sent, ${failed} failed, ${users.length} total.`);
}

main().catch((error) => {
  console.error('Customer lifecycle announcement failed:', error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
