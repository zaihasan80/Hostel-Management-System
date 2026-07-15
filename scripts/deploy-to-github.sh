#!/bin/bash
# =====================================================
# JTM HMS — GitHub Deployment Script
# =====================================================
# This script pushes the HMS codebase to your GitHub repo.
#
# USAGE:
#   GH_TOKEN=ghp_your_personal_access_token bash scripts/deploy-to-github.sh
#
# PREREQUISITES:
#   1. Create a Personal Access Token (PAT) at:
#      https://github.com/settings/tokens/new?scopes=repo,workflow
#   2. Make sure the repo https://github.com/zaihasan80/Hostel-Management-System.git exists
#      (create it as an EMPTY repo — no README, no .gitignore, no license)
#   3. Run this script with the token as an env var.
# =====================================================

set -euo pipefail

REPO_URL="https://github.com/zaihasan80/Hostel-Management-System.git"
BRANCH="deploy-main"

# Check for token
if [ -z "${GH_TOKEN:-}" ]; then
  echo "ERROR: GH_TOKEN env var is not set."
  echo ""
  echo "Create a Personal Access Token at:"
  echo "  https://github.com/settings/tokens/new?scopes=repo,workflow"
  echo ""
  echo "Then run:"
  echo "  GH_TOKEN=ghp_xxxxxxxxxxxx bash scripts/deploy-to-github.sh"
  exit 1
fi

cd "$(dirname "$0")/.."
echo "Working directory: $(pwd)"
echo "Target repo: $REPO_URL"
echo ""

# Verify we're on the deploy-main branch with a single clean commit
CURRENT=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT" != "$BRANCH" ]; then
  echo "Switching to $BRANCH..."
  git checkout "$BRANCH"
fi

echo "Commit to push:"
git log --oneline -1
echo ""

# Verify no password traces (flags real passwords, ignores <placeholder> templates)
echo "Scanning for credential leaks..."
LEAKS=$(git grep -lE "DATABASE_URL=\"postgresql://[^<]+:[^<>@ ]+@" "$BRANCH" 2>/dev/null | grep -vE "\.env\.example|deploy-to-github\.sh|SUPABASE_SETUP\.md|README\.md" || true)
if [ -n "$LEAKS" ]; then
  echo "ERROR: Real password traces found in these files:"
  echo "$LEAKS"
  exit 1
fi
echo "OK - No credential leaks detected."
echo ""

# Verify .env is not tracked
if git ls-tree -r "$BRANCH" --name-only | grep -q "^\.env$"; then
  echo "ERROR: .env file is tracked in the commit. Aborting."
  exit 1
fi
echo "OK - .env is not tracked."
echo ""

# Push using the token in the URL (will be redacted in logs)
echo "Pushing to GitHub..."
git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/zaihasan80/Hostel-Management-System.git"
git push -u origin "$BRANCH:main" --force
git remote set-url origin "$REPO_URL"

echo ""
echo "SUCCESS! Your code is now on GitHub."
echo ""
echo "Next steps:"
echo "  1. Visit: https://github.com/zaihasan80/Hostel-Management-System"
echo "  2. To deploy on Vercel:"
echo "     a. Go to https://vercel.com/new"
echo "     b. Import the repo"
echo "     c. Add environment variable DATABASE_URL with your Supabase connection string"
echo "     d. Click Deploy"
echo "  3. To deploy on Netlify:"
echo "     a. Go to https://app.netlify.com/start"
echo "     b. Import the repo"
echo "     c. Add environment variable DATABASE_URL"
echo "     d. Click Deploy site"
