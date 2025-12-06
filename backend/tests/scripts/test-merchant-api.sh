#!/bin/bash
# Test script for Merchant API
# Run: bash tests/scripts/test-merchant-api.sh

echo "🧪 Testing Merchant API + x402 Inbound Payments"
echo ""

# Check if server is running
if ! curl -s http://localhost:4000/health > /dev/null 2>&1; then
  echo "❌ Server is not running. Please start it with 'npm run dev'"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Build successful"
echo ""

# Run test
echo "🚀 Running merchant API tests..."
echo ""
node dist/tests/integration/test-merchant-api.js

