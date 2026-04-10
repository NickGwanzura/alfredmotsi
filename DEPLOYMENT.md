# Splash Air - Production Deployment Guide

## Prerequisites

- Docker and Docker Compose (for local/production Docker deployment)
- Node.js 20+ (for local development)
- PostgreSQL 16+ (for manual database setup)
- Resend account with verified domain (splashaircrmzw.site)

---

## Quick Start (Docker Compose)

1. **Clone and navigate to the project:**
   ```bash
   cd splash-air-app
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

5. **Access the application:**
   - App: http://localhost:3000
   - Database: localhost:5432

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@db:5432/splashair` |
| `NEXTAUTH_SECRET` | Random secret for JWT encryption | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your app URL | `https://splashaircrmzw.site` |
| `RESEND_API_KEY` | Resend API key for email | `re_xxxxxxxx` |
| `FROM_EMAIL` | Verified sender email | `noreply@splashaircrmzw.site` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

---

## Database Setup

### Initial Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with admin user only
npx prisma db seed
```

### Production Database Checklist

- [ ] Use strong PostgreSQL password
- [ ] Enable SSL connections
- [ ] Set up automated backups
- [ ] Configure connection pooling (PgBouncer recommended)

---

## Email Configuration (Resend)

1. **Verify domain in Resend:**
   - Add `splashaircrmzw.site` domain
   - Complete DNS verification
   - Verify sender email

2. **Test email sending:**
   ```bash
   curl -X POST http://localhost:3000/api/email/user-invite \
     -H "Content-Type: application/json" \
     -d '{"to":"test@splashaircrmzw.site","name":"Test User"}'
   ```

---

## Dokploy Deployment

1. **Push to Git repository**

2. **Create new project in Dokploy:**
   - Select "Web Service"
   - Choose your repository
   - Select branch `main`

3. **Configure environment variables** in Dokploy dashboard

4. **Add PostgreSQL service** and link to app

5. **Deploy!**

---

## First Admin Setup

After deployment, create the first admin user:

```bash
# Using Prisma Studio (interactive)
npx prisma studio

# Or via API (create a temporary setup endpoint)
```

Default admin credentials (set via environment or create manually):
- Email: `alfred@splashaircrmzw.site`
- Password: Set during first login or via invitation

---

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Database connections working
- [ ] Email sending verified
- [ ] Admin login functional
- [ ] SSL certificate active
- [ ] Domain DNS configured
- [ ] Backups scheduled
- [ ] Monitoring enabled

---

## Troubleshooting

### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull
```

### Email Not Sending
- Verify RESEND_API_KEY is set
- Check domain verification status in Resend dashboard
- Review application logs for errors

---

## Support

For deployment issues, check:
1. Application logs: `docker-compose logs -f app`
2. Database logs: `docker-compose logs -f db`
3. Resend dashboard for email delivery status
