#!/bin/bash

# Firebase Deployment Script for Coach Core
# This script builds and deploys the application to Firebase Hosting

set -e  # Exit on any error

echo "🚀 Starting Firebase deployment for Coach Core..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please log in to Firebase..."
    firebase login
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting

echo "🎉 Deployment completed successfully!"
echo "🌐 Your app should be live in a few minutes"
echo "📊 Check Firebase Console for deployment status"

