<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Deployment

## Dokploy Deployment

This application is configured for deployment on [Dokploy](https://dokploy.com/).

**Repository:** https://github.com/NickGwanzura/alfredmotsi.git

### Prerequisites

- A server with Dokploy installed
- PostgreSQL database created in Dokploy
- Domain configured (optional but recommended)

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

3. **Run Migrations:**
   After first deploy, run migrations via Dokploy terminal:
   ```bash
   npx prisma migrate deploy
   ```

### Deployment Steps

1. **Repository is already on GitHub:** https://github.com/NickGwanzura/alfredmotsi.git

2. **In Dokploy Dashboard:**
   - Create a new Application
   - Select your Git provider and repository
   - Branch: `main` (or your preferred branch)
   - Build type: `Dockerfile`
   - Dockerfile path: `Dockerfile`

3. **Environment Variables** (if needed):
   - Add any required environment variables in the Dokploy dashboard
   - The app runs with `NODE_ENV=production` by default

4. **Deploy**:
   - Click "Deploy" or enable auto-deploy on push
   - The app will be built and served on port 3000

### Configuration Files

- `Dockerfile` - Multi-stage build optimized for Next.js
- `docker-compose.yml` - Service configuration
- `dokploy.json` - Dokploy-specific configuration
- `next.config.ts` - Updated with `output: 'standalone'` for Docker

### Health Check

The container includes a health check that verifies the app is responding on port 3000.

### Ports

- **3000**: Next.js application (exposed and mapped)

### Logs

View logs in Dokploy dashboard or via CLI:
```bash
docker logs splash-air-app
```
