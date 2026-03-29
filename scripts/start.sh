#!/bin/sh

# Startup script for Splash Air CRM
# Designed to be resilient - never exits on non-critical failures

echo "🚀 Starting Splash Air CRM..."

# Run database migrations (with retry logic)
echo "📦 Running database migrations..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  npx prisma migrate deploy
  MIGRATE_STATUS=$?
  
  if [ $MIGRATE_STATUS -eq 0 ]; then
    echo "✅ Database migrations completed"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⚠️ Migration failed (attempt $RETRY_COUNT/$MAX_RETRIES), retrying in 5s..."
  sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Database migrations failed after $MAX_RETRIES attempts"
  echo "⚠️ Continuing anyway - app may not function correctly"
fi

# Optional: Run seed if SEED_DATABASE is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️ Seeding failed, continuing..."
fi

# Set defaults
PORT=${PORT:-3000}
HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "✅ Starting Next.js application on $HOSTNAME:$PORT..."
echo "========================================="

# Start the application
exec node server.js
