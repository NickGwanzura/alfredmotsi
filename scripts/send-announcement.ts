import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { BigFixesEmail } from '../src/app/lib/email/templates-big-fixes';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY!);

async function sendAnnouncement() {
  try {
    // Fetch all admin and tech users
    const users = await prisma.user.findMany({
      where: { role: { in: ['admin', 'tech'] } },
      select: { email: true, name: true },
    });

    if (users.length === 0) {
      console.log('No users found to email.');
      return;
    }

    console.log(`📧 Sending announcement to ${users.length} users...`);
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const html = render(
          BigFixesEmail({
            recipientName: user.name?.split(' ')[0] || 'there',
          })
        );

        const { error } = await resend.emails.send({
          from: process.env.FROM_EMAIL || 'Splash Air <noreply@splashaircrmzw.site>',
          to: [user.email],
          subject: '✅ Critical Data Integrity & Audit Fixes Deployed',
          html,
          tags: ['announcement', 'big-fixes'],
        });

        if (error) {
          console.error(`❌ Failed to send to ${user.email}:`, error.message);
          failed++;
        } else {
          console.log(`✓ Sent to ${user.email}`);
          sent++;
        }

        // Rate limit: ~2 emails/sec to stay under Resend limits
        await new Promise(r => setTimeout(r, 600));
      } catch (err: any) {
        console.error(`❌ Error for ${user.email}:`, err.message);
        failed++;
      }
    }

    console.log(`\n📬 Campaign complete: ${sent} sent, ${failed} failed out of ${users.length}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

sendAnnouncement();
