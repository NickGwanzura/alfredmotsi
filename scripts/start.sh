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
npx prisma migrate deploy 2>&1 || echo "⚠️ Migrations may have failed, continuing..."
echo ""

# Start
echo "========================================="
echo "✅ Starting server on port ${PORT:-3000}"
echo "========================================="

exec node server.js
