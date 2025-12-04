#!/bin/bash
# Automated Railway Setup Script
# Sets all environment variables from .env to Railway

set -e

echo "🚀 Setting up Railway environment variables..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found in backend directory"
    exit 1
fi

echo "📋 Reading variables from .env..."
echo ""

# Extract and set each variable
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
        continue
    fi

    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//')

    echo "Setting: $key"
    railway variables --set "$key=$value" 2>/dev/null || echo "  ⚠️  Failed to set $key"
done < .env

echo ""
echo "✅ Environment variables set!"
echo ""
echo "🔄 Triggering Railway redeploy..."
railway up --detach

echo ""
echo "✅ Setup complete! Railway will redeploy with new variables."
echo "   Check status: railway logs"
