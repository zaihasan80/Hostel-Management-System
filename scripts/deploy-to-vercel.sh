#!/bin/bash
# =====================================================
# JTM HMS — Vercel Deployment Script
# =====================================================
# This script deploys the HMS to Vercel.
#
# USAGE:
#   VERCEL_TOKEN=your_vercel_token bash scripts/deploy-to-vercel.sh
#
# PREREQUISITES:
#   1. Create a Vercel token at:
#      https://vercel.com/account/tokens
#   2. Set the SUPABASE password in the env var below (or hardcode it).
# =====================================================

set -euo pipefail

# Check for token
if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "❌ ERROR: VERCEL_TOKEN env var is not set."
  echo ""
  echo "Create a Vercel token at: https://vercel.com/account/tokens"
  echo "Then run:"
  echo "  VERCEL_TOKEN=your_token bash scripts/deploy-to-vercel.sh"
  exit 1
fi

cd "$(dirname "$0")/.."
echo "📦 Working directory: $(pwd)"

# Supabase connection string (password is URL-encoded)
SUPABASE_DB_URL="postgresql://postgres.ltbmddnhqcoacqdckwzk:02.07%40Detector@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

echo "🚀 Deploying to Vercel..."
echo ""

# Set the DATABASE_URL as an env var for the build
export DATABASE_URL="$SUPABASE_DB_URL"

# Deploy to Vercel (production)
# --yes: skip prompts
# --prod: deploy to production
# --token: use the provided token
echo "📋 Running: vercel --prod --yes"
vercel --prod --yes --token "$VERCEL_TOKEN" 2>&1

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Next steps:"
echo "  1. Set the DATABASE_URL environment variable in Vercel dashboard:"
echo "     https://vercel.com/dashboard → your project → Settings → Environment Variables"
echo "     Key: DATABASE_URL"
echo "     Value: $SUPABASE_DB_URL"
echo "  2. Trigger a redeploy for the env var to take effect"
