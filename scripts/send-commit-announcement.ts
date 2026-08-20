import { PrismaClient } from '@prisma/client';
import { render } from '@react-email/components';
import { AnnouncementEmail } from '../src/app/lib/email/templates-new';
import { sendCustomEmail } from '../src/app/lib/email/send';

const prisma = new PrismaClient();

async function sendCommitAnnouncement() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['owner', 'admin', 'dispatcher', 'accounts', 'sales', 'tech'] } },
    select: { email: true, name: true },
    orderBy: { email: 'asc' },
  });

  const subject = 'Splash Air CRM — stock permissions and Android app update';
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const html = await render(AnnouncementEmail({
        recipientName: user.name?.split(' ')[0] || 'there',
        preview: 'Gas stock access is now available to all staff and the CRM can be installed on Android.',
        headline: 'Stock access and Android PWA update',
        kind: 'update',
        intro: 'Two production commits have been deployed to make daily stock capture easier and improve mobile access to Splash Air CRM.',
        sections: [
          {
            title: 'Commit ad6b432 — gas stock access aligned',
            bullets: [
              'Resolved the Forbidden error when adding or adjusting refrigerant stock.',
              'The gas stock screen now shows controls only when the signed-in role can use them.',
              'The API and the UI now follow the same permission rules.',
            ],
          },
          {
            title: 'Commit 72d7261 — all staff and Android PWA',
            bullets: [
              'Owner, admin, dispatcher, accounts, sales, and technician users can add and adjust stock.',
              'Added an Android-installable Splash Air CRM manifest, branded icons, and service-worker registration.',
              'Android users can use Chrome menu → Install app / Add to Home screen.',
            ],
          },
        ],
        ctaLabel: 'Open Splash Air CRM',
        ctaUrl: 'https://splashaircrmzw.site',
        closing: 'Please sign in, test adding a stock item, and report any issue to the CRM administrator.',
      }));

      const result = await sendCustomEmail({
        to: user.email,
        subject,
        html,
        category: 'commit-announcement',
        isTransactional: true,
      });
      if (result.success) sent++;
      else failed++;
    } catch (error) {
      failed++;
      console.error(`Failed to send to ${user.email}:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.log(`Commit announcement complete: ${sent} sent, ${failed} failed, ${users.length} total.`);
}

sendCommitAnnouncement()
  .catch((error) => {
    console.error('Commit announcement failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
