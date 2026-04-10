# Production Setup Guide

Complete guide to remove all demo data and deploy Splash Air to production.

---

## ⚠️ CRITICAL: Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production` file:

```bash
# Database - Use your actual PostgreSQL connection
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/splashair?schema=public"

# NextAuth.js - Generate secure secret
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://your-domain.com"

# Resend Email
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
FROM_EMAIL="Splash Air <noreply@splashaircrmzw.site>"

# Optional: Monitoring
NEXT_TELEMETRY_DISABLED=1
```

### 2. Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Optional: Create initial admin user
npx tsx scripts/create-admin.ts
```

### 3. Build & Deploy

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Start production server
npm start
```

---

## 📁 Files Changed for Production

### Removed Demo Data:
- ✅ `src/app/data/seed.ts` - Deleted
- ✅ Mock auth provider - Removed from imports
- ✅ Demo job data - Removed from page.tsx
- ✅ Sample customers - Removed

### Production-Ready:
- ✅ Database connections via Prisma
- ✅ Real authentication via NextAuth.js
- ✅ Production email via Resend
- ✅ Environment-based configuration
- ✅ Security headers configured
- ✅ Error handling improved

---

## 🚀 Deployment Options

### Option 1: Dokploy (Recommended)

1. Push code to Git repository
2. Connect repository in Dokploy
3. Set environment variables
4. Deploy

### Option 2: Docker

```bash
# Build image
docker build -t splash-air .

# Run container
docker run -p 3000:3000 --env-file .env.production splash-air
```

### Option 3: VPS (Manual)

```bash
# Clone repository
git clone <your-repo>
cd splash-air-app

# Install dependencies
npm ci

# Build
npm run build

# Start with PM2
pm2 start npm --name "splash-air" -- start
```

---

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Set strong NEXTAUTH_SECRET
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set secure cookies
- [ ] Remove all console.logs
- [ ] Enable production error handling
- [ ] Database connection SSL enabled
- [ ] Resend domain verified

---

## 📊 Post-Deployment

### Initial Setup:
1. Create admin user
2. Add technicians
3. Add customers
4. Configure gas stock
5. Create first job

### Monitoring:
- Check logs: `pm2 logs splash-air`
- Monitor errors: Sentry/Vercel
- Database: Prisma Studio

---

**Ready for production!** 🚀
