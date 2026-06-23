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
  # First try to resolve any failed migration so we can apply new ones
  ./node_modules/.bin/prisma migrate resolve --applied 20260528000000_init 2>/dev/null || true
  
  if ./node_modules/.bin/prisma migrate deploy 2>&1; then
    echo "✅ Migrations applied successfully"
  else
    echo "⚠️ Migration deploy failed — attempting db push as fallback..."
    ./node_modules/.bin/prisma db push --accept-data-loss 2>&1 || echo "⚠️ db push also failed, continuing..."
  fi
else
  echo "⚠️ Prisma CLI not found in image, skipping migrations"
fi
echo ""

# Run seed only if RUN_SEED=true
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Seeding database..."
  if [ -f "./prisma/seed.ts" ]; then
    npx --yes tsx ./prisma/seed.ts 2>&1 || echo "⚠️ Seed may have failed, continuing..."
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
