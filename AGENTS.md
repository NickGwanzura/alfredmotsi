<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Splash Air CRM - Production Deployment

## Production Admin Credentials

- **Email:** alfred@splashaironline.co.zw
- **Password:** #631168609K86zw

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
- [ ] Admin user seeded
- [ ] Test login with admin credentials
- [ ] Create technicians from dashboard
- [ ] Add customers
- [ ] Start creating jobs

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
