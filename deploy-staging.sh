#!/bin/bash

# Coach Core AI - Staging Deployment Script
# This script deploys the application to staging environment

set -e

echo "🚀 Starting Coach Core AI Staging Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm run test -- --coverage --watchAll=false

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. dist directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to Vercel (staging)
echo "🌐 Deploying to Vercel staging..."
if command -v vercel &> /dev/null; then
    vercel --prod --env staging
else
    echo "⚠️  Vercel CLI not found. Please install it with: npm i -g vercel"
    echo "   Then run: vercel --prod --env staging"
fi

# Deploy to Firebase Hosting (staging)
echo "🔥 Deploying to Firebase Hosting staging..."
if command -v firebase &> /dev/null; then
    firebase use staging
    firebase deploy --only hosting
else
    echo "⚠️  Firebase CLI not found. Please install it with: npm i -g firebase-tools"
    echo "   Then run: firebase use staging && firebase deploy --only hosting"
fi

echo "🎉 Staging deployment completed!"
echo "📊 Check your monitoring dashboards:"
echo "   - Sentry: https://sentry.io/organizations/your-org/projects/coach-core-ai/"
echo "   - Firebase: https://console.firebase.google.com/project/your-project/performance"
echo "   - Vercel: https://vercel.com/dashboard"