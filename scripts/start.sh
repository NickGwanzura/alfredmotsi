#!/bin/sh
set -e

echo "🚀 Starting Splash Air CRM..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Optional: Run seed if SEED_DATABASE is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed
fi

# Start the application
echo "✅ Starting Next.js application..."
exec node server.js
