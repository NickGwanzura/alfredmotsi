<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Splash Air CRM - Production Deployment

## Production Admin Credentials

- **Email:** alfred@splashaircrmzw.site
- **Password:** #631168609K86zw

## Email Configuration (Resend)

The platform uses [Resend](https://resend.com) for transactional emails with beautifully branded templates.

### Setup

1. **Create Resend Account:** https://resend.com
2. **Add and verify your domain** (e.g., splashair)
3. **Generate an API key**
4. **Add to environment variables:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   FROM_EMAIL=Splash Air <noreply@splashaircrmzw.site>
   ```

### Email Templates

All emails feature the Splash Air brand with professional styling:

| Template | Trigger | Recipient |
|----------|---------|-----------|
| **Job Scheduled** | When admin creates a new job | Customer |
| **Job Completed** | When technician marks job complete | Customer |
| **Status Update** | When job status changes | Customer |
| **Portal Invite** | When admin enables portal access | Customer |
| **Tech Assignment** | When admin assigns technician | Technician |
| **User Invite** | When admin creates new user | New User |

### Email Features

- ✅ Professional branded design with Splash Air logo
- ✅ Responsive layout for mobile/desktop
- ✅ All job details clearly formatted
- ✅ Direct links to portal and tracking
- ✅ Contact information included
- ✅ Technician details with phone numbers

### API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/email/job-scheduled` | POST | Job scheduled notification | Admin |
| `/api/email/job-completed` | POST | Job completion report | Admin/Tech |
| `/api/email/status-update` | POST | Status change notification | Admin/Tech |
| `/api/email/portal-invite` | POST | Portal access invitation | Admin |
| `/api/email/tech-assignment` | POST | New assignment notification | Admin |
| `/api/email/user-invite` | POST | New user credentials | Admin |

### Client-Side Usage

Import the email client helper:

```typescript
import { 
  sendJobScheduledEmail,
  sendJobCompletedEmail,
  sendPortalInviteEmail,
  formatEmailDate,
  formatEmailTime 
} from '@/app/lib/email/client';

// Send job scheduled email
const result = await sendJobScheduledEmail({
  to: customer.email,
  customerName: customer.name,
  jobTitle: job.title,
  jobDate: formatEmailDate(job.date),
  jobTime: formatEmailTime(job.time),
  jobType: job.type,
  jobAddress: getCustomerAddress(customer),
  technicianName: tech.name,
  technicianPhone: tech.phone,
  jobId: job.id,
});

if (result.success) {
  console.log('Email sent successfully');
} else {
  console.error('Email failed:', result.error);
}
```

---

## Dokploy Deployment

This application is configured for deployment on [Dokploy](https://dokploy.com/).

**Repository:** https://github.com/NickGwanzura/alfredmotsi.git

### Prerequisites

- A server with Dokploy installed
- PostgreSQL database created in Dokploy
- Domain configured (recommended for production)

### PostgreSQL Database Setup

1. **Create Database in Dokploy:**
   - Go to "Databases" → "Create Database"
   - Type: PostgreSQL
   - Name: `splash-air-db`
   - Database: `postgres`
   - User: `postgres`
   - Password: auto-generated

2. **Copy Internal Connection URL:**
   - Example: `postgresql://postgres:sw8tyr3sx2ghdh2k@splash-splash-air-crm-xghzwi:5432/postgres`
   - This goes in your app Environment Variables as `DATABASE_URL`

### Environment Variables

Add these in the Dokploy dashboard:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_DB_HOST:5432/postgres
NEXTAUTH_SECRET=your-generated-secret-key
NEXTAUTH_URL=https://your-domain.com
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=Splash Air <noreply@splashaircrmzw.site>
NODE_ENV=production
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### First Time Setup

1. **Deploy the application**
2. **Run migrations** (automatic on container start)
3. **Seed the admin user:**
   ```bash
   npx prisma db seed
   ```

This creates the admin user with production credentials.

### Configuration Files

- `Dockerfile` - Multi-stage build optimized for Next.js
- `docker-compose.yml` - Local development with PostgreSQL
- `next.config.ts` - Updated with `output: 'standalone'` for Docker
- `prisma/schema.prisma` - Database schema

### Production Checklist

- [ ] Database created in Dokploy
- [ ] Environment variables configured
- [ ] Domain pointed to Dokploy server
- [ ] SSL certificate configured
- [ ] Resend account created and domain verified
- [ ] Resend API key added to environment variables
- [ ] Admin user seeded
- [ ] Test login with admin credentials
- [ ] Create technicians from dashboard
- [ ] Add customers
- [ ] Start creating jobs
- [ ] Test email sending

### Logs

View logs in Dokploy dashboard or via CLI:
```bash
docker logs splash-air-app
```

---

## Authentication

The platform uses NextAuth.js with:
- JWT-based sessions (8-hour expiry)
- bcrypt password hashing
- Role-based access control (admin, tech, client)

### User Roles

- **Admin:** Full access to all features
- **Tech:** Access to schedule, calendar, and assigned jobs
- **Client:** Portal access (future feature)

---

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models:

- **User** - Staff accounts (admin, technicians)
- **Customer** - Client companies with portal codes
- **Job** - Service jobs with status tracking
- **GasStockItem** - Refrigerant inventory
- **GasUsageRecord** - Gas consumption tracking
- **CRMRecord** - Customer interactions

Run Prisma Studio to explore:
```bash
npx prisma studio
```
