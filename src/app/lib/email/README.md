# Splash Air Email System

## Overview

This email system is built on [Resend](https://resend.com) with [React Email](https://react.email) for templating. It's optimized for deliverability, security, and compliance with email best practices.

**Domain:** `splashair` (verified with Resend)

---

## Quick Start

```typescript
import { sendJobScheduledEmail } from './send';

await sendJobScheduledEmail({
  to: 'customer@splashaircrmzw.site',
  customerName: 'John Doe',
  jobTitle: 'AC Installation',
  jobDate: '2026-04-15',
  jobTime: '09:00',
  jobType: 'Installation',
  jobAddress: '123 Main St',
  technicianName: 'Mike Smith',
  jobId: 'JOB-12345',
});
```

---

## File Structure

```
email/
├── resend.ts              # Resend client configuration
├── send.ts                # Email sending functions (with best practices)
├── standards.ts           # Compliance & deliverability utilities
├── secure-invite.ts       # Secure token-based invitations
├── templates-new.tsx      # Main email templates (React)
├── templates-secure.tsx   # Secure templates (no passwords in email)
├── EMAIL_AUDIT.md         # Full audit report
└── README.md              # This file
```

---

## Email Templates

### Customer Emails

| Template | Purpose | Status |
|----------|---------|--------|
| `JobScheduledEmail` | Appointment confirmation | ✅ Active |
| `JobCompletedEmail` | Work completion report | ✅ Active |
| `StatusUpdateEmail` | Job status changes | ✅ Active |
| `PortalInviteEmail` | Client portal access | ✅ Active |

### Staff Emails

| Template | Purpose | Status |
|----------|---------|--------|
| `TechAssignmentEmail` | New job notification | ✅ Active |
| `UserInviteEmail` | Account creation (⚠️ legacy) | ⚠️ Deprecated |
| `SecureUserInvitationEmail` | Secure token invitation | 🔧 Use this |

### Security Templates

| Template | Purpose |
|----------|---------|
| `PasswordResetEmail` | Password reset link |
| `InvitationExpiredEmail` | Expired invitation notice |
| `AccountSetupCompleteEmail` | Setup confirmation |

---

## Best Practices Enforced

### ✅ Automatically Applied

1. **Plain Text Versions** - All emails include both HTML and plain text
2. **Email Validation** - Content validated before sending
3. **Rate Limiting** - 50 emails/hour per recipient
4. **Deliverability Headers** - SPF/DKIM aligned headers
5. **Reply-To** - Set to `alfred@splashaircrmzw.site`

### 🔧 Security Features

1. **No Passwords in Email** - Use `SecureUserInvitationEmail` + `secure-invite.ts`
2. **Content Sanitization** - Prevents XSS in email content
3. **Token-based Invitations** - Time-limited, single-use tokens

### 📊 Deliverability

1. **Preview Text** - Optimized for email clients
2. **Spam Score Check** - Content analyzed before sending
3. **List-Unsubscribe** - For marketing emails (when enabled)
4. **Mobile Responsive** - All templates work on mobile

---

## Secure Invitation System

### Why Replace Password-in-Email?

**Current (Insecure):**
- Password sent in plain text
- Interceptable by attackers
- No expiration control

**New (Secure):**
- Token-based invitation link
- No sensitive data in email
- 24-hour expiration
- Single-use tokens

### Migration Steps

1. **Update Database** - Create `invitations` table
2. **Install Secure Templates** - Use `templates-secure.tsx`
3. **Implement API** - Create invitation endpoints
4. **Update Frontend** - Build invitation acceptance page
5. **Test & Deploy** - Verify secure flow works

See `secure-invite.ts` for full implementation guide.

---

## Configuration

### Environment Variables

```bash
# Required
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=Splash Air <noreply@splashaircrmzw.site>

# Optional
NEXT_PUBLIC_APP_URL=https://splashaircrmzw.site
```

### Email Config (`standards.ts`)

```typescript
{
  from: FROM_EMAIL,
  replyTo: 'alfred@splashaircrmzw.site',
  company: {
    name: 'Splash Air Conditioning',
    email: 'alfred@splashaircrmzw.site',
    website: 'https://splashaircrmzw.site',
  },
  rateLimit: {
    window: 60 * 60 * 1000,  // 1 hour
    max: 50,                 // 50 emails per recipient
  },
}
```

---

## Sending Functions

### Job Emails

```typescript
sendJobScheduledEmail(params)      // Customer appointment confirmation
sendJobCompletedEmail(params)      // Work completion report
sendStatusUpdateEmail(params)      // Job status changes
```

### Portal Emails

```typescript
sendPortalInviteEmail(params)      // Client portal access
```

### Staff Emails

```typescript
sendTechAssignmentEmail(params)    // Technician job notification
sendUserInviteEmail(params)        // ⚠️ Legacy - use secure invitation instead
```

### Generic

```typescript
sendCustomEmail({
  to: 'user@splashaircrmzw.site',
  subject: 'Hello',
  html: '<p>Email content</p>',
  category: 'custom',
  isTransactional: true,
});
```

---

## Validation

### Email Content Validation

```typescript
import { validateEmailContent } from './standards';

const result = validateEmailContent({
  to: 'user@splashaircrmzw.site',
  subject: 'Hello',
  html: '<p>Content</p>',
});

if (!result.valid) {
  console.error(result.errors);
}
```

Checks:
- Email format
- Subject length (≤78 chars)
- Spam words
- Excessive punctuation
- ALL CAPS ratio

---

## Rate Limiting

Built-in rate limiting prevents abuse:
- 50 emails per recipient per hour
- Automatic retry-after calculation
- In-memory storage (reset on restart)

```typescript
import { checkRateLimit } from './standards';

const { allowed, retryAfter } = checkRateLimit('user@splashaircrmzw.site');
if (!allowed) {
  console.log(`Rate limited. Retry in ${retryAfter} minutes`);
}
```

---

## HTML to Text Conversion

All emails automatically include plain text versions:

```typescript
import { htmlToText } from './standards';

const text = htmlToText('<h1>Hello</h1><p>World</p>');
// Result: "Hello\n===\n\nWorld"
```

---

## Audit Report

See `EMAIL_AUDIT.md` for:
- Complete security analysis
- DNS configuration recommendations
- Compliance checklist
- Testing procedures

---

## Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set
2. Verify domain `splashair` is verified in Resend dashboard
3. Check logs for validation errors
4. Ensure recipient email is valid

### Emails Going to Spam

1. Check spam score with [Mail Tester](https://www.mail-tester.com/)
2. Verify SPF, DKIM, DMARC records
3. Check content for spam words
4. Ensure List-Unsubscribe for marketing emails

### Rate Limit Errors

Recipient limited to 50 emails/hour. Use `checkRateLimit()` to check before sending.

---

## DNS Records

Ensure these records are configured for `splashair`:

| Record | Purpose |
|--------|---------|
| SPF | Authorize Resend IPs |
| DKIM | Cryptographic signature |
| DMARC | Policy enforcement |

Verify at: https://resend.com/domains

---

## Support

- **Resend Docs:** https://resend.com/docs
- **React Email:** https://react.email/docs
- **Splash Air:** alfred@splashaircrmzw.site
