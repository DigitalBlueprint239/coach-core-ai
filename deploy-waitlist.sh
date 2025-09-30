#!/bin/bash

# Coach Core AI - Waitlist Page Deployment Script
# This script deploys the standalone waitlist page

echo "🚀 Deploying waitlist page..."

# Copy waitlist.html to dist directory
echo "📁 Copying waitlist.html to dist directory..."
cp public/waitlist.html dist/waitlist.html

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting:coach-core-ai-prod

echo "✅ Waitlist page deployed successfully!"
echo "🌐 Visit: https://coach-core-ai.web.app/waitlist"
