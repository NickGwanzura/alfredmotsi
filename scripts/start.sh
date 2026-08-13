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
  # Production must start only when the reviewed migration chain is applied.
  # Never fall back to `prisma db push`: it bypasses migration history and can
  # silently introduce schema drift or data-loss decisions.
  if ./node_modules/.bin/prisma migrate deploy; then
    echo "✅ Migrations applied successfully"
  else
    echo "❌ Migration deployment failed; refusing to start with an unverified schema"
    exit 1
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
