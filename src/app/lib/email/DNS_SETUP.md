# DNS Configuration Guide for Email Deliverability

## Overview

This guide covers the DNS records required for optimal email deliverability with Resend. Configure these records for your verified domain in your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.)

---

## Required Records

### 1. SPF Record (Sender Policy Framework)

**Purpose:** Authorizes Resend's servers to send email on behalf of your domain

**Record Type:** TXT  
**Host/Name:** `@` (root domain) or your subdomain  
**Value:**
```
v=spf1 include:_spf.resend.com ~all
```

**If you already have an SPF record**, add `include:_spf.resend.com` before the `~all` or `-all`:
```
v=spf1 include:_spf.google.com include:_spf.resend.com ~all
```

**Verification:**
```bash
dig TXT yourdomain.com | grep spf
```

---

### 2. DKIM Record (DomainKeys Identified Mail)

**Purpose:** Cryptographic signature to verify email authenticity

**Record Type:** TXT  
**Host/Name:** `resend._domainkey`  
**Value:** (Get from Resend Dashboard)

1. Go to https://resend.com/domains
2. Click on your domain
3. Copy the DKIM record provided

**Example:**
```
Host: resend._domainkey.yourdomain.com
Type: TXT
Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1TaNgLlSyQMNWVLNLvyY/neDgaL2oqQE8T5illKqCgDtFHc8eHVAU+nlcaGmrKmDMw9dbgiGk1ocgZ56NR4ycfUHwQhvQPMUZw0cveel/8EAGoi/UyPmqfcPibytH81NFtTMAxUeM4Op8A6iHkvAMj5qLf4YRNsTkKAKW3OkwPQIDAQAB
```

**Verification:**
```bash
dig TXT resend._domainkey.yourdomain.com
```

---

### 3. DMARC Record (Domain-based Message Authentication)

**Purpose:** Policy for handling emails that fail SPF/DKIM checks

**Record Type:** TXT  
**Host/Name:** `_dmarc`  
**Value:**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; sp=quarantine; adkim=r; aspf=r
```

**Policy Options:**
- `p=none` - Monitor only (recommended for initial setup)
- `p=quarantine` - Send to spam (recommended after testing)
- `p=reject` - Reject completely (maximum protection)

**Gradual Implementation:**

**Week 1-2 (Monitoring):**
```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

**Week 3-4 (Quarantine):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=25
```

**Week 5+ (Full Protection):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; sp=quarantine
```

**Verification:**
```bash
dig TXT _dmarc.yourdomain.com
```

---

## Optional Records

### 4. BIMI Record (Brand Indicators for Message Identification)

**Purpose:** Display your logo in email clients (Gmail, Yahoo)

**Requirements:**
- SVG logo file (square, under 32KB)
- VMC certificate (for Gmail - optional but recommended)

**Record Type:** TXT  
**Host/Name:** `default._bimi`  
**Value:**
```
v=BIMI1; l=https://yourdomain.com/logo.svg;
```

**With VMC certificate:**
```
v=BIMI1; l=https://yourdomain.com/logo.svg; a=https://yourdomain.com/certificate.pem;
```

**Logo Requirements:**
- Format: SVG Tiny 1.2
- Size: Square aspect ratio
- File size: Maximum 32KB
- Background: Solid or transparent

---

### 5. MX Records (Mail Exchange)

**Purpose:** Required if you want to RECEIVE emails at your domain

**Note:** Only needed if using this domain for incoming mail. Not required for Resend sending only.

**Example (Google Workspace):**
```
Host: @
Priority: 1
Value: aspmx.l.google.com

Host: @
Priority: 5
Value: alt1.aspmx.l.google.com
```

---

## DNS Configuration by Provider

### Cloudflare

1. Log in to Cloudflare Dashboard
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add Record**
5. Add each TXT record above
6. Proxy status: **DNS only** (gray cloud)

### GoDaddy

1. Log in to GoDaddy
2. Go to **My Products** → **DNS**
3. Click **Manage** next to your domain
4. Click **Add** to add new records
5. Select **TXT** type
6. Enter host and value

### Namecheap

1. Log in to Namecheap
2. Go to **Domain List** → **Manage**
3. Click **Advanced DNS**
4. Click **Add New Record**
5. Select **TXT Record**
6. Enter host and value

### Route 53 (AWS)

1. Go to Route 53 Console
2. Click **Hosted zones**
3. Select your domain
4. Click **Create record**
5. Select **Simple routing**
6. Add TXT records

---

## Verification Commands

### Check All Records

```bash
# SPF
 dig TXT yourdomain.com | grep spf

# DKIM
dig TXT resend._domainkey.yourdomain.com

# DMARC
dig TXT _dmarc.yourdomain.com

# BIMI (if configured)
dig TXT default._bimi.yourdomain.com
```

### Online Tools

- **Google Admin Toolbox:** https://toolbox.googleapps.com/apps/checkmx/
- **MX Toolbox:** https://mxtoolbox.com/spf.aspx
- **DMARC Analyzer:** https://dmarcian.com/dmarc-inspector/
- **Mail Tester:** https://www.mail-tester.com/

---

## Troubleshooting

### SPF Issues

**Error:** "Multiple SPF records found"
**Fix:** Merge into single record:
```
# WRONG - Multiple records
v=spf1 include:_spf.google.com ~all
v=spf1 include:_spf.resend.com ~all

# CORRECT - Single merged record
v=spf1 include:_spf.google.com include:_spf.resend.com ~all
```

### DKIM Issues

**Error:** "DKIM signature failed"
**Check:**
1. Record propagation (can take 24-48 hours)
2. Correct selector (`resend._domainkey`)
3. Full key copied without breaks

### DMARC Issues

**Error:** "DMARC policy not found"
**Check:**
1. Record at `_dmarc.yourdomain.com`
2. Correct formatting (semicolons between tags)
3. Valid email address for reports

---

## Testing Your Setup

### 1. Send Test Email

```typescript
import { sendCustomEmail } from './send';

await sendCustomEmail({
  to: 'your-personal-email@gmail.com',
  subject: 'DNS Test',
  html: '<p>Testing email setup</p>',
});
```

### 2. Check Headers

In Gmail:
1. Open email
2. Click **More** (three dots)
3. Click **Show original**
4. Look for:
   - `spf=pass`
   - `dkim=pass`
   - `dmarc=pass`

### 3. Use Mail Tester

1. Go to https://www.mail-tester.com/
2. Copy the temporary email address
3. Send test email to that address
4. Click **Check your score**
5. Aim for 9-10/10

---

## Expected Propagation Time

| Record Type | Typical Time |
|-------------|--------------|
| SPF | 15 minutes - 2 hours |
| DKIM | 15 minutes - 4 hours |
| DMARC | 15 minutes - 4 hours |
| BIMI | 24-48 hours |

**Note:** TTL (Time To Live) settings affect propagation. Lower TTL = faster updates.

---

## Security Best Practices

1. **Use `-all` instead of `~all` in SPF** (once confident in setup)
   - `~all` = Soft fail (mark as suspicious)
   - `-all` = Hard fail (reject completely)

2. **Monitor DMARC Reports**
   - Set up mailbox for `rua` reports
   - Review weekly for unauthorized senders

3. **Rotate DKIM Keys**
   - Regenerate annually
   - Update in Resend dashboard
   - Update DNS record

4. **Use Subdomain for Email**
   - Example: `mail.yourdomain.com` or `notifications.yourdomain.com`
   - Protects main domain reputation

---

## Complete Example Configuration

```dns
; SPF Record
@ IN TXT "v=spf1 include:_spf.resend.com ~all"

; DKIM Record (from Resend dashboard)
resend._domainkey IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1TaNgLlSyQMNWVLNLvyY/neDgaL2oqQE8T5illKqCgDtFHc8eHVAU+nlcaGmrKmDMw9dbgiGk1ocgZ56NR4ycfUHwQhvQPMUZw0cveel/8EAGoi/UyPmqfcPibytH81NFtTMAxUeM4Op8A6iHkvAMj5qLf4YRNsTkKAKW3OkwPQIDAQAB"

; DMARC Record
_dmarc IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com"

; Optional BIMI
default._bimi IN TXT "v=BIMI1; l=https://yourdomain.com/logo.svg"
```

---

## Support

- **Resend Support:** support@resend.com
- **Documentation:** https://resend.com/docs/dashboard/domains/introduction
- **DNS Provider:** Contact your domain registrar's support
