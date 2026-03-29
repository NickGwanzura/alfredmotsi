#!/bin/sh

# Startup script for Splash Air CRM
# Defensive: Ensures Prisma Client exists before starting

echo "========================================="
echo "🚀 Starting Splash Air CRM..."
echo "========================================="

# Check if Prisma Client is generated
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "⚠️ Prisma Client not found in node_modules/.prisma/client"
  echo "📦 Generating Prisma Client..."
  
  # Generate Prisma Client as fallback
  npx prisma generate 2>&1
  
  if [ $? -ne 0 ]; then
    echo "❌ Prisma Client generation failed!"
    echo "   Ensure DATABASE_URL is set and database is reachable"
    exit 1
  fi
  
  echo "✅ Prisma Client generated successfully"
else
  echo "✅ Prisma Client found in node_modules/.prisma/client"
fi

# Verify Prisma Client can be imported
echo "🔍 Verifying Prisma Client..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('✅ Prisma Client initialized successfully');
process.exit(0);
" 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Prisma Client failed to initialize"
  echo "   Attempting regeneration..."
  npx prisma generate 2>&1 || exit 1
fi

# Run database migrations with retry logic
echo "📦 Running database migrations..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  npx prisma migrate deploy 2>&1
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
  npx prisma db seed 2>&1 || echo "⚠️ Seeding failed, continuing..."
fi

# Set defaults
PORT=${PORT:-3000}
HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "========================================="
echo "✅ Starting Next.js application"
echo "   Port: $PORT"
echo "   Host: $HOSTNAME"
echo "   Node: $(node -v)"
echo "========================================="

# Start the application
exec node server.js
