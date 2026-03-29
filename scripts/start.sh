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

# Set defaults
PORT=${PORT:-3000}
HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "✅ Starting Next.js application on $HOSTNAME:$PORT..."
exec node server.js
