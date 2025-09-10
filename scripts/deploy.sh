#!/bin/bash

# Pre-deployment script to verify build before deploying to Vercel
# Usage: ./scripts/deploy.sh [--prod]

echo "🔍 Pre-deployment checks starting..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi

# Run TypeScript compilation check
echo "📝 Checking TypeScript compilation..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed. Fix errors before deploying."
    exit 1
fi
echo "✅ TypeScript check passed"

# Run ESLint
echo "🔍 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️  ESLint found issues. Consider fixing them."
    # Don't exit on lint warnings since they're just warnings
fi

# Run the build
echo "🏗️  Testing production build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi
echo "✅ Build successful"

# If all checks pass, deploy
echo "🚀 All checks passed! Deploying to Vercel..."

if [ "$1" == "--prod" ]; then
    echo "Deploying to production..."
    vercel --prod
else
    echo "Deploying to preview..."
    vercel
fi