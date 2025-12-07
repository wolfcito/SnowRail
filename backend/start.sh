#!/bin/bash
set -e

# Navigate to backend directory (wherever we are)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || exit 1

echo "📂 Current directory: $(pwd)"
echo "📦 Checking for dist/server.js..."

# Verify dist/server.js exists
if [ ! -f "dist/server.js" ]; then
  echo "❌ ERROR: dist/server.js not found in $(pwd)"
  echo "📋 Listing dist/ contents:"
  ls -la dist/ 2>/dev/null || echo "dist/ directory does not exist"
  exit 1
fi

echo "✅ Found dist/server.js"

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "🔄 Running Prisma migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations complete"
else
  echo "⚠️  WARNING: DATABASE_URL not set, skipping migrations"
fi

# Start server
echo "🚀 Starting server..."
exec node --max-old-space-size=512 dist/server.js

