# Splash Air CRM — Field Service Management Platform

A full-featured HVAC field service management system for Splash Air Conditioning. Manage jobs, technicians, refrigerant gas inventory, customers, invoices, and compliance reporting.

**Live:** [https://splashaircrmzw.site](https://splashaircrmzw.site)

---

## 📖 Table of Contents

- [Roles & Access](#roles--access)
- [Quick Start (Admin)](#quick-start-admin)
- [Quick Start (Technician)](#quick-start-technician)
- [Feature Guide](#feature-guide)
  - [Onboarding Wizard](#1-onboarding-wizard)
  - [Dashboard](#2-dashboard)
  - [Jobs](#3-jobs)
  - [Calendar](#4-calendar)
  - [Customers](#5-customers)
  - [Invoices](#6-invoices)
  - [Inventory](#7-inventory)
  - [Gas Stock](#8-gas-stock)
  - [Gas Usage](#9-gas-usage)
  - [CRM](#10-crm)
  - [ODS Report](#11-ods-report)
  - [User Management](#12-user-management)
  - [Audit Log](#13-audit-log)
  - [Settings](#14-settings)
- [Company Profile & Branding](#company-profile--branding)
- [PDF Documents](#pdf-documents)
- [Email Notifications](#email-notifications)
- [FAQ](#faq)

---

## Roles & Access

| Feature | Admin | Technician | Client |
|---|---|---|---|
| Dashboard | ✅ Full KPIs | ✅ My Schedule | ❌ |
| Calendar | ✅ All jobs | ✅ All jobs | ❌ |
| Jobs | ✅ All jobs | ✅ Only assigned | ❌ |
| Create Job | ✅ | ✅ | ❌ |
| Delete Job | ✅ | ❌ | ❌ |
| Customers | ✅ | ✅ | ❌ |
| Invoices | ✅ | ❌ | ❌ |
| Inventory | ✅ | ❌ | ❌ |
| Gas Stock | ✅ | ✅ | ❌ |
| Gas Usage | ✅ | ✅ | ❌ |
| CRM | ✅ | ✅ | ❌ |
| ODS Report | ✅ | ✅ | ❌ |
| Users | ✅ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Client Portal | ❌ | ❌ | ✅ |

---

## Quick Start (Admin)

### First-Time Setup

1. **Log in** at [https://splashaircrmzw.site](https://splashaircrmzw.site)
2. **Onboarding Wizard** will appear automatically — complete all 5 steps
   - Enter company name, address, phone, email
   - Upload your company logo
   - Set the VAT rate (default: 15.5%)
3. **Invite technicians**: Go to **Users** → **Invite User** → enter name, email, role (technician) → temporary password is generated and emailed
4. **Add customers**: Go to **Customers** → **Add Customer** → enter details
5. **Add gas stock**: Go to **Gas Stock** → **Add Stock** → select gas type, brand, quantity
6. **Create your first job**: Go to **Jobs** → **Add Job** → fill details → assign a technician

### Daily Operations

- **Dashboard** shows today's jobs, technician status, alerts, and KPI cards
- **Jobs** page shows all scheduled jobs with filtering by status and type
- Click any job to open the **Job Card** — the central workspace for each service call

---

## Quick Start (Technician)

1. **Log in** with credentials sent by your admin
2. If prompted, change your temporary password
3. **My Schedule** shows your assigned jobs for today
4. Click a job to **clock in** when you arrive on site
5. Complete the **Diagnostics** tab with readings (voltage, pressure, temperatures)
6. Log any **Gas Usage** used on the job
7. Capture **Photos** of the work
8. Get **Customer Signature** on completion
9. **Clock out** and **Save Job Card**
10. The job card PDF can be **downloaded** or **emailed** to the customer

---

## Feature Guide

### 1. Onboarding Wizard

Appears automatically on the first admin login after deployment. Guides you through:

| Step | What to enter |
|---|---|
| Welcome | Introduction — click Next |
| Company Details | Name, address, phone, email |
| Branding | Upload logo, set tagline, services, website |
| Finance | VAT rate, tax/VAT number |
| Done | All set — PDFs will use your branding |

To revisit after onboarding: **Settings** page in sidebar.

---

### 2. Dashboard

**Admin view:** KPI cards showing total jobs, on-site now, scheduled, completed. Alert banners for unallocated jobs and diagnostic alerts. Today's jobs list with status badges. Technician status panel (online, on-site, etc.).

**Tech view:** Filtered to show only the technician's assigned jobs. Quick calendar view of their schedule.

---

### 3. Jobs

The core of the platform. Each job is a service call.

**Creating a Job:**
1. Click **Add Job** or **Schedule Job** in sidebar
2. Enter job title, type (installation/maintenance/repair/sales/inspection/callout)
3. Select customer, unit type, issue type, priority
4. Set date, time, lead technician (and optional co-technician)
5. Add scope of work description
6. Optionally set a recurring schedule (every 3/6/12 months)
7. Save → job appears on calendar and jobs list

**Job Card (click any job):**
- **Details tab:** Customer info, address, scope, team, comments
- **Diagnostics tab:** Electrical readings (voltage/current), thermal readings (temps, delta T), pressure test (suction/discharge), refrigerant info, system status
- **Media tab:** Upload photos/PDFs, add job card reference number
- **Sign-Off tab:** Update job status (scheduled → on-site → completed), capture customer signature
- **ODS tab:** Log refrigerant gas usage, track recovered/used/reused quantities
- **Consumables tab:** Record parts and materials used

**Clock In/Out:** Start timing when arriving on site. Duration is tracked. GPS coordinates are captured.

**Communications:** WhatsApp and email buttons to contact the customer. Comments timeline for internal notes.

**PDF Export:** Download the job card PDF or **Email it** directly to the customer via Resend.

---

### 4. Calendar

Monthly calendar view showing all scheduled jobs. Color-coded by job type. Click any date to see the day's jobs. Click a job card to open it.

---

### 5. Customers

Full customer database. Search by name, address, phone, or email.

**Left panel:** Customer cards with active job indicators (amber = active, green = none).

**Right panel (click a customer):**
- Contact details, portal status
- **WhatsApp Compose:** Choose from greeting, service reminder, portal invite, or custom message
- **Email Compose:** Send branded emails via Resend — custom messages, service reminders, or portal invites
- Service history table showing all jobs for this customer

**Add Customer:** Name, email, phone, WhatsApp, billing address, site address.

---

### 6. Invoices

Create and manage invoices.

**Creating an Invoice:**
1. Click **New Invoice**
2. Select customer (optionally link to a job)
3. Set due date and VAT rate
4. Add line items (description, quantity, unit price)
5. Add notes if needed
6. Create → invoice is saved as "draft"

**Invoice Actions:**
- **Download PDF** — generates a branded invoice PDF with company logo
- **Email PDF** — sends the invoice to the customer via Resend
- **Mark Paid** — changes status from draft/sent to paid
- **Delete** — removes the invoice

Statuses: Draft → Sent → Paid / Overdue / Cancelled. VAT defaults to **15.5%**.

---

### 7. Inventory

Track parts, tools, refrigerant cylinders, and consumables stock. Each item has:
- Name, category, brand, SKU
- Stock level, reorder level, reorder quantity
- Cost and selling price
- Supplier info

**Movements:** Record stock in/out/adjustments with notes. Full audit trail.

---

### 8. Gas Stock

Refrigerant gas cylinder tracking. Each stock item records:
- Gas type (from 25+ refrigerants including R-32, R-410A, R-22, R-134a, R-290, R-454B, R-1234yf, CO₂, Ammonia, and more)
- Brand, quantity (kg), remaining
- Supplier and reference number
- Low stock alerts at 20% remaining

**Adjust Stock:** Admin can manually adjust remaining quantity with a reason (audited).

---

### 9. Gas Usage

Log every refrigerant usage transaction. Shows:
- Date/time, gas type, quantity used
- Technician who logged it
- Customer and job reference
- Purpose (e.g. leak repair, system recharge)

**Exports:**
- **CSV** download — all filtered records
- **PDF report** — branded PDF with summary stats and detail table

Usage is automatically deducted from gas stock inventory.

---

### 10. CRM

Customer Relationship Management records. Track all interactions:
- Types: Call, Visit, Complaint, Email, Quote
- Outcomes: Positive, Negative, Pending, Resolved
- Follow-up dates with overdue alerts
- Filter by type and outcome

---

### 11. ODS Report

Ozone Depleting Substances compliance report. Tracks:
- Total refrigerant recovered, used, and reused
- R-22 phase-out tracking
- Jobs with refrigerant data
- Filter by refrigerant type
- ODS classification and GWP ratings

Essential for environmental compliance (Montreal Protocol).

---

### 12. User Management

Invite and manage staff.

**Invite User:** Enter name, email, role (admin or technician), optionally phone and specialty. A temporary password is generated and **emailed** to the user. The user must change their password on first login.

**Manage Users:**
- **Edit** — change name, email, role, phone, specialty
- **Resend Credentials** — generates a new temp password and emails it
- **Remove** — deletes the user account (historical records are preserved)
- **Remove Duplicates** — merges duplicate accounts, keeps the admin

---

### 13. Audit Log

Complete audit trail of all system actions:
- Login events
- Job views, edits, completions, deletions
- Customer creation/updates
- Gas stock adjustments
- User management
- All entries include user, action, timestamp, IP address, and user agent

---

### 14. Settings

Company profile configuration (admin only):
- Company name, address, phone, email, website
- Logo upload (displayed on all PDFs)
- Tagline and services description
- VAT rate and tax number

Changes take effect immediately on all generated documents.

---

## Company Profile & Branding

All generated PDF documents use your company branding:

| Document | What's included |
|---|---|
| Invoice PDF | Logo, company name, address, phone, tagline, website |
| Job Card PDF | Logo, company name, address, phone, services |
| Gas Usage Report PDF | Logo, company name, address, phone |

Configure these in **Settings** → Company Settings.

---

## PDF Documents

Every major record can be exported as a professionally branded PDF:

| Document | How to generate |
|---|---|
| **Job Card** | Open a job → **Download PDF** button or **Email PDF** button |
| **Invoice** | Open an invoice → **Download PDF** or **Email PDF** |
| **Gas Usage Report** | Gas Usage page → **PDF** button (exports filtered data) |

PDFs include your company logo (once uploaded in Settings), full company details, and all relevant record data.

---

## Email Notifications

The system sends branded transactional emails via **Resend**:

| Email Type | When sent |
|---|---|
| User Invite | New user is created with temp password |
| Resend Credentials | Admin clicks "Resend Credentials" |
| Portal Invite | Customer portal invite |
| Customer Email | Composed from Customer DB → Email |
| Job Card | Emailed from Job Card → Email PDF |
| Invoice | Emailed from Invoice → Email PDF |
| Announcement | Admin Dashboard → Send Announcement (24h cooldown) |

**From address:** `Splash Air <noreply@splashaircrmzw.site>`

---

## FAQ

**Q: I forgot my password.**
A: Click "Forgot Password" on the login screen. Enter your email. A reset link will be sent.

**Q: A technician can't log in.**
A: Go to **Users** → find the technician → click the mail icon → **Resend Credentials**. A new temp password will be emailed.

**Q: How do I add a new refrigerant type?**
A: Gas types are pre-configured with 25+ common refrigerants. If you need one not listed, contact system support.

**Q: Can customers see their job history?**
A: Yes. Enable the **Client Portal** for a customer in Customers → Edit → set Portal Code. They can log in with their email and portal code to view jobs and invoices.

**Q: The onboarding wizard doesn't appear.**
A: Go to **Settings** in the sidebar to manually configure your company profile.

**Q: I'm getting an announcement spamming error.**
A: The "Send Announcement" button has a 24-hour cooldown to prevent accidental repeats.

**Q: PDFs aren't showing my logo.**
A: Go to **Settings** → upload your logo → click **Save Settings**. All PDFs generated after that will include it.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Dokploy in production; provide `DATABASE_URL` for local development)
- **ORM:** Prisma
- **Auth:** NextAuth.js (credentials + portal)
- **Email:** Resend
- **PDF:** @react-pdf/renderer
- **Icons:** Lucide React
- **Deployment:** Railway
- **Fonts:** IBM Plex Sans, Grift

---

*Built for Splash Air Conditioning by Spiritus Systems*
