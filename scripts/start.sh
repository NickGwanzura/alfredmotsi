#!/bin/sh

echo "========================================="
echo "🚀 Starting Splash Air CRM"
echo "========================================="
echo "📂 Working directory: $(pwd)"
echo ""

# List files to debug
echo "📂 Directory contents:"
ls -la
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

# Run migrations — resolve any already-applied migrations, then deploy
echo "📦 Running database migrations..."
if [ -x "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy 2>&1 || {
    echo "⚠️ Deploy failed, attempting to resolve failed migrations..."
    # Resolve any failed migrations by marking them as applied
    ./node_modules/.bin/prisma migrate resolve --applied 20240328000000_init 2>/dev/null || true
    ./node_modules/.bin/prisma migrate deploy 2>&1 || {
      echo "⚠️ Deploy still failing — using db push as fallback..."
      ./node_modules/.bin/prisma db push --accept-data-loss 2>&1 || echo "⚠️ db push also failed, continuing..."
    }
  }
else
  echo "⚠️ Prisma CLI not found in image, skipping migrations"
fi
echo ""

# Run seed (creates admin users if they don't exist)
echo "🌱 Seeding database..."
if [ -f "./prisma/seed.ts" ]; then
  # Use npx tsx directly (pnpm exec is unreliable in Docker)
  npx --yes tsx ./prisma/seed.ts 2>&1 || echo "⚠️ Seed may have failed, continuing..."
else
  echo "⚠️ Seed file not found, skipping seed"
fi
echo ""

# Start
echo "========================================="
echo "✅ Starting server on port ${PORT:-3000}"
echo "========================================="

exec node server.js
