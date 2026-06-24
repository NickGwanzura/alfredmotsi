// Run: node scripts/send-invite.js
// Creates user + sends invite email to splashaircon@gmail.com
// Then sends a second email listing recent features/fixes
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const https = require('https');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function sendEmailViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('⚠️ RESEND_API_KEY not set, skipping email');
    return;
  }

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      from: process.env.FROM_EMAIL || 'Splash Air <noreply@splashaircrmzw.site>',
      to: [to],
      subject,
      html,
    });

    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { console.log(`✅ Email sent to ${to}:`, res.statusCode); resolve(data); });
    });
    req.on('error', (e) => { console.log('❌ Email failed:', e.message); reject(e); });
    req.write(postData);
    req.end();
  });
}

async function main() {
  const email = 'splashaircon@gmail.com';
  const tempPassword = 'Admin2026!';

  // 1. Create or update the user
  const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, passwordChanged: false },
    create: {
      name: 'Splash Aircon',
      role: 'admin',
      email,
      password: hashedPassword,
      passwordChanged: false,
      phone: '',
    },
  });
  console.log(`✅ User ${user.email} created/updated as ${user.role}`);

  // 2. Send invite email
  const loginUrl = 'https://splashaircrmzw.site';
  const inviteHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#093a68,#062d52);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">Splash Air CRM</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">Field Service Management Platform</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px;color:#161616;font-size:20px;">You're Invited!</h2>
          <p style="margin:0 0 16px;color:#525252;font-size:14px;line-height:1.6;">Hi there,</p>
          <p style="margin:0 0 16px;color:#525252;font-size:14px;line-height:1.6;">An Administrator account has been created for you on the <strong>Splash Air CRM</strong> platform.</p>
          <p style="margin:0 0 8px;color:#525252;font-size:14px;"><strong>Email:</strong> ${email}</p>
          <p style="margin:0 0 24px;color:#525252;font-size:14px;"><strong>Temporary Password:</strong> <code style="background:#f4f4f5;padding:4px 8px;border-radius:4px;font-size:16px;letter-spacing:1px;">${tempPassword}</code></p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:linear-gradient(135deg,#093a68,#062d52);border-radius:8px;padding:12px 32px;">
              <a href="${loginUrl}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Login to Splash Air CRM →</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#6f6f6f;font-size:12px;">You will be prompted to change your password on first login.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e0e0e0;">
          <p style="margin:0;color:#6f6f6f;font-size:11px;text-align:center;">Splash Air Conditioning</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmailViaResend(email, 'You\'ve been invited to Splash Air CRM', inviteHtml);
  console.log('✅ Invite email sent');

  // 3. Send second email with features/fixes
  const featuresHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#093a68,#062d52);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">New Features & Fixes Deployed</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">24 June 2026 · Latest Updates</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px;color:#161616;font-size:18px;">✅ What's New (Last Hour)</h2>
          
          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">🖥️ Role-Specific Dashboards</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">Admins see a full operations dashboard with KPIs, alert monitoring, and quality oversight. Technicians see a personalised "My Day" view with their Next Job, today's schedule, and quick actions.</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">🏢 Company Settings & Onboarding Wizard</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">New Settings page to configure your company name, logo, VAT rate, and branding. All PDFs (invoices, job cards, gas reports) now include your logo and company details.</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">📄 Premium PDF Documents</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">Invoices, Job Cards, and Gas Usage Reports now include your company logo, full address, and contact details. Job Cards can be emailed directly to customers as branded PDF attachments.</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">📊 Gas Usage CSV & PDF Export</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">Export refrigerant usage logs as CSV or comprehensive PDF reports with summary statistics. Search and filter by customer, gas type, and technician.</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">🛠️ Technician Permissions Expanded</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">Technicians can now create jobs, manage customers, log gas usage, and access CRM and ODS reports — everything they need to complete their work without admin bottlenecks.</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">🔧 Invoice & API Fixes</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">Invoice creation, deletion, email, and PDF generation all fixed and working. VAT defaults to 15.5%. Email spam filter corrected (no more false positives on "Specialists").</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">📱 Mobile Menu Fix</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">Sidebar navigation is now fully clickable on mobile — the grey overlay no longer blocks taps on menu items.</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">💬 Toast Notifications</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">New global toast notification system provides feedback on all actions (save, delete, send email) with auto-dismiss.</p>
          </div>

          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#093a68;font-size:14px;">📋 In-App Help Guides</h3>
            <p style="margin:0;color:#525252;font-size:13px;line-height:1.5;">Every major page now has a contextual help banner explaining what to do on that screen. Dismissible and ready to guide new users.</p>
          </div>

          <p style="margin:24px 0 0;color:#525252;font-size:14px;line-height:1.6;">
            Log in to see everything in action: <a href="https://splashaircrmzw.site" style="color:#093a68;font-weight:600;">splashaircrmzw.site</a>
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e0e0e0;">
          <p style="margin:0;color:#6f6f6f;font-size:11px;text-align:center;">Splash Air CRM · Built by Spiritus Systems</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmailViaResend(email, '🚀 New Features & Fixes Deployed — Splash Air CRM', featuresHtml);
  console.log('✅ Features email sent');
  console.log('\n🎉 Done! User created and both emails sent.');
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
