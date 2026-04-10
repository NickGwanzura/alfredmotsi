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

# Run migrations
echo "📦 Running database migrations..."
if [ -x "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy 2>&1 || echo "⚠️ Migrations may have failed, continuing..."
else
  echo "⚠️ Prisma CLI not found in image, skipping migrations"
fi
echo ""

# Run seed (creates admin users if they don't exist)
echo "🌱 Seeding database..."
if [ -f "./prisma/seed.ts" ]; then
  # Use tsx to run the seed script
  if [ -x "./node_modules/.bin/tsx" ]; then
    ./node_modules/.bin/tsx ./prisma/seed.ts 2>&1 || echo "⚠️ Seed may have failed, continuing..."
  else
    echo "⚠️ tsx not found, trying npx..."
    npx tsx ./prisma/seed.ts 2>&1 || echo "⚠️ Seed may have failed, continuing..."
  fi
else
  echo "⚠️ Seed file not found, skipping seed"
fi
echo ""

# Start
echo "========================================="
echo "✅ Starting server on port ${PORT:-3000}"
echo "========================================="

exec node server.js
