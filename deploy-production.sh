#!/bin/bash

# Coach Core AI - Production Deployment Script
# This script builds the app with production environment variables and deploys to Firebase

echo "🚀 Starting production deployment..."

# Set production environment variables
export VITE_FIREBASE_PROJECT_ID=coach-core-ai
export VITE_FIREBASE_API_KEY=AIzaSyB2iWL0UkuLJYpr-II9IpwGWDOMnLcfq_c
export VITE_FIREBASE_AUTH_DOMAIN=coach-core-ai.firebaseapp.com
export VITE_FIREBASE_STORAGE_BUCKET=coach-core-ai.firebasestorage.app
export VITE_FIREBASE_MESSAGING_SENDER_ID=384023691487
export VITE_FIREBASE_APP_ID=1:384023691487:web:931094d7a0da903d6e696a
export VITE_FIREBASE_MEASUREMENT_ID=G-02HW7QDJLY
export NODE_ENV=production
export VITE_USE_EMULATOR=false
export VITE_ENVIRONMENT=production
export VITE_APP_NAME="Coach Core AI"
export VITE_APP_VERSION=1.0.0
export VITE_APP_URL=https://coach-core-ai.web.app

echo "📦 Building application with production configuration..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Deploying to Firebase..."
    firebase deploy --only hosting:coach-core-ai-prod
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "🌐 Your app is live at: https://coach-core-ai.web.app"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
