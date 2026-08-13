#!/bin/sh

echo "========================================="
echo "🚀 Starting Splash Air CRM"
echo "========================================="
echo ""

# Check server.js
echo "🔍 Checking server.js..."
if [ -f "server.js" ]; then
  echo "✅ server.js found"
else
  echo "❌ server.js NOT FOUND"
  echo "   Cannot start application"
  exit 1
fi
echo ""

# Run database migrations (safe, versioned)
echo "📦 Running database migrations..."
if [ -x "./node_modules/.bin/prisma" ]; then
  # Clean up stale migration tracking for fresh databases
  echo "   Checking if schema needs to be pushed..."
  
  # Try migrate deploy first
  if ./node_modules/.bin/prisma migrate deploy 2>&1; then
    echo "✅ Migrations applied successfully"
  else
    echo "⚠️ Migrate deploy failed — checking if tables exist..."
    # Check if users table exists; if not, push schema on a fresh database.
    if node -e "const {PrismaClient} = require('@prisma/client'); (async()=>{try{await new PrismaClient().\$queryRawUnsafe('SELECT 1 FROM \"users\" LIMIT 1'); console.log('TABLES_EXIST')}catch(e){console.log('NO_TABLES')}; await new PrismaClient().\$disconnect()})()" 2>&1 | grep -q "NO_TABLES"; then
      echo "   Tables don't exist — pushing schema (fresh DB)..."
      # Reset migration tracking first
      ./node_modules/.bin/prisma migrate resolve --applied 20260528000000_init 2>/dev/null || true
      ./node_modules/.bin/prisma db push 2>&1 || echo "⚠️ db push also failed, continuing..."
    else
      # Tables exist (production data). Never use --accept-data-loss here: a
      # non-destructive push applies safe drift and refuses any destructive change.
      echo "   Tables exist — attempting non-destructive schema sync..."
      ./node_modules/.bin/prisma db push 2>&1 || echo "⚠️ db push also failed, continuing..."
    fi
  fi
else
  echo "⚠️ Prisma CLI not found in image, skipping migrations"
fi
echo ""

# Run seed only if RUN_SEED=true
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Seeding database..."
  # First try the JS-based reset (handles enum issues, works without tsx)
  if [ -f "./scripts/reset-admin.js" ]; then
    echo "   Running reset-admin.js..."
    node ./scripts/reset-admin.js 2>&1 && echo "✅ Admin reset complete" || echo "⚠️ Admin reset failed, falling back..."
  fi
  
  # Also try the tsx seed for other data (may fail if tsx not available)
  if [ -f "./prisma/seed.ts" ]; then
    npx --yes tsx ./prisma/seed.ts 2>&1 || echo "⚠️ TSX seed may have failed, continuing..."
  else
    echo "⚠️ Seed file not found, skipping seed"
  fi
  echo ""
else
  echo "⏭️  Seed skipped (set RUN_SEED=true to seed)"
fi

# Start
echo "========================================="
echo "✅ Starting server on port ${PORT:-3000}"
echo "========================================="

exec node server.js
