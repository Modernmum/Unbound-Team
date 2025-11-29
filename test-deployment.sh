#!/bin/bash

# Test Unbound.team Backend Deployment
# Usage: ./test-deployment.sh <your-railway-url>

if [ -z "$1" ]; then
  echo "Usage: ./test-deployment.sh <railway-url>"
  echo "Example: ./test-deployment.sh https://unbound-team-production.up.railway.app"
  exit 1
fi

URL=$1

echo "🚀 Testing Unbound.team Backend Deployment"
echo "URL: $URL"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
curl -s "$URL/health" | jq '.'
echo ""

# Test 2: Root Endpoint
echo "2️⃣ Testing Root Endpoint..."
curl -s "$URL/" | jq '.'
echo ""

# Test 3: AI Stats
echo "3️⃣ Testing AI Stats..."
curl -s "$URL/api/ai/stats" | jq '.'
echo ""

# Test 4: Queue Stats
echo "4️⃣ Testing Queue Stats..."
curl -s "$URL/api/queue/stats" | jq '.'
echo ""

echo "✅ All tests complete!"
echo ""
echo "If all tests passed, your backend is live and ready!"
echo "Next step: Update Vercel with NEXT_PUBLIC_API_URL=$URL"
