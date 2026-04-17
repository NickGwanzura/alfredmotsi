import { NextResponse } from 'next/server';
import { auth, isAdmin } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';
import { sendCustomEmail } from '@/app/lib/email/send';
import { COMPANY, COMPANY_PHONE_LINE, COMPANY_SERVICES_LINE } from '@/app/lib/pdf/company';

/**
 * POST /api/admin/announce-update
 * One-shot announcement: emails all admin users a summary of the latest
 * platform updates. Any admin can trigger it by calling this endpoint while
 * logged in (e.g. from the browser console).
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

  const subject = 'Splash Air CRM — New features & updates (April 2026)';
  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#161616;line-height:1.55">
      <div style="border-bottom:2px solid #0f62fe;padding-bottom:12px;margin-bottom:20px">
        <h1 style="margin:0;color:#0f62fe;font-size:22px">${COMPANY.name}</h1>
        <p style="margin:4px 0 0;font-size:12px;color:#525252">${COMPANY.address} · ${COMPANY_PHONE_LINE}</p>
      </div>

      <h2 style="font-size:18px;margin-top:0">Platform updates are live</h2>
      <p>Hello team,</p>
      <p>A batch of improvements has just been deployed. Here's what's new:</p>

      <h3 style="color:#0f62fe;font-size:15px;margin-top:24px;margin-bottom:6px">Job Completion</h3>
      <ul style="padding-left:18px;margin:0">
        <li>Customers now receive a completion email automatically when a job is marked done</li>
        <li>A branded Job Card PDF is attached to every completion email — sent to both admins and the customer</li>
        <li>New endpoint to download any Job Card as PDF on demand</li>
      </ul>

      <h3 style="color:#0f62fe;font-size:15px;margin-top:20px;margin-bottom:6px">User Management (CRUD)</h3>
      <ul style="padding-left:18px;margin:0">
        <li>Edit full user profile — name, email, role, phone, specialty</li>
        <li><strong>Resend Credentials</strong> button emails a new temporary password to any user</li>
        <li><strong>Remove Duplicates</strong> button cleans up accounts sharing the same email (keeps the oldest)</li>
        <li>Duplicate accounts are now flagged in the users table</li>
      </ul>

      <h3 style="color:#0f62fe;font-size:15px;margin-top:20px;margin-bottom:6px">PDF Branding</h3>
      <ul style="padding-left:18px;margin:0">
        <li>All generated PDFs now carry the official company header & footer:</li>
        <li style="list-style:none;padding-left:12px;color:#525252;font-size:13px">
          ${COMPANY.name}<br/>
          Address: ${COMPANY.address}<br/>
          Phone: ${COMPANY_PHONE_LINE}<br/>
          Services: ${COMPANY_SERVICES_LINE}
        </li>
      </ul>

      <h3 style="color:#0f62fe;font-size:15px;margin-top:20px;margin-bottom:6px">Technician Job Cards</h3>
      <ul style="padding-left:18px;margin:0">
        <li>Technicians can log gas usage directly from the job card (ODS tab)</li>
        <li>Materials with quantities and units can be recorded per job</li>
        <li>Gas stock and usage now surface real error messages when something fails</li>
      </ul>

      <p style="margin-top:24px">If you run into anything unexpected, reply to this email and we'll look into it.</p>

      <div style="border-top:1px solid #e0e0e0;padding-top:12px;margin-top:28px;font-size:11px;color:#6f6f6f;text-align:center">
        ${COMPANY.name} · ${COMPANY.address} · ${COMPANY_PHONE_LINE}<br/>
        ${COMPANY_SERVICES_LINE}
      </div>
    </div>
  `;

  const results = await Promise.allSettled(
    admins.map(a =>
      sendCustomEmail({ to: a.email, subject, html, category: 'platform-update', isTransactional: true })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[announce-update] sent ${sent}/${admins.length} admin update emails`);

  return NextResponse.json({ ok: true, sent, total: admins.length });
}
