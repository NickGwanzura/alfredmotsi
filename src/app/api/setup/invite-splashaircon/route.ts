import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { sendUserInviteEmail, sendCustomEmail } from '@/app/lib/email/send';
import { render } from '@react-email/components';

/**
 * POST /api/setup/invite-splashaircon
 * Creates the splashaircon@gmail.com admin account and sends 2 branded emails.
 * Protected by a secret key to prevent abuse.
 */
export async function POST(request: Request) {
  const { secret } = await request.json().catch(() => ({}));
  if (secret !== 'setup-2026-splash') {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const email = 'splashaircon@gmail.com';
  const tempPassword = 'Admin2026!';

  // 1. Create the user
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, passwordChanged: false, role: 'admin' },
    create: { name: 'Splash Aircon', role: 'admin', email, password: hashedPassword, passwordChanged: false, phone: '' },
  });

  // 2. Send invite email
  const inviteResult = await sendUserInviteEmail({
    to: email,
    userName: 'Splash Aircon',
    tempPassword,
    role: 'admin',
    loginUrl: 'https://splashaircrmzw.site',
  });

  // 3. Send features email
  const featuresHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#093a68,#062d52);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">New Features & Fixes Deployed</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">24 June 2026 · Latest Updates</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <h2 style="margin:0 0 16px;color:#161616;font-size:18px;">✅ What's New</h2>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">🖥️ Role-Specific Dashboards</h3><p style="margin:0;color:#525252;font-size:13px;">Admins see KPIs + quality alerts. Techs see "My Day" with Next Job card.</p></div>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">🏢 Company Settings & Branding</h3><p style="margin:0;color:#525252;font-size:13px;">Configure logo, VAT rate, company details. All PDFs use your branding.</p></div>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">📄 Premium PDFs with Logo</h3><p style="margin:0;color:#525252;font-size:13px;">Invoices, Job Cards, Gas Reports — all include your logo + company details.</p></div>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">📊 Gas Usage CSV & PDF Export</h3><p style="margin:0;color:#525252;font-size:13px;">Export with search/filter, summary stats, and compliance data.</p></div>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">🛠️ Technician Permissions Expanded</h3><p style="margin:0;color:#525252;font-size:13px;">Techs can create jobs, manage customers, log gas usage, access CRM/ODS.</p></div>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">🔧 Invoice & API Fixes</h3><p style="margin:0;color:#525252;font-size:13px;">Invoice CRUD, PDF, and email all working. VAT 15.5%. Spam filter fixed.</p></div>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">📱 Mobile Menu & Toast Notifications</h3><p style="margin:0;color:#525252;font-size:13px;">Mobile sidebar clickable. Global toast feedback on all actions.</p></div>
        <div style="margin-bottom:16px;"><h3 style="margin:0 0 4px;color:#093a68;font-size:14px;">📋 In-App Help Guides</h3><p style="margin:0;color:#525252;font-size:13px;">Contextual banners on every page explaining workflows.</p></div>
        <p style="margin:24px 0 0;color:#525252;font-size:14px;">Log in: <a href="https://splashaircrmzw.site" style="color:#093a68;font-weight:600;">splashaircrmzw.site</a></p>
      </td></tr>
      <tr><td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e0e0e0;"><p style="margin:0;color:#6f6f6f;font-size:11px;text-align:center;">Splash Air CRM</p></td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;

  const featuresResult = await sendCustomEmail({
    to: email,
    subject: '🚀 New Features & Fixes Deployed — Splash Air CRM',
    html: featuresHtml,
    category: 'features-announcement',
    isTransactional: true,
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
    invite: inviteResult.success ? 'sent' : 'failed',
    features: featuresResult.success ? 'sent' : 'failed',
  });
}
