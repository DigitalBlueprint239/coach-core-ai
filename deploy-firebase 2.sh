#!/bin/bash

# Firebase Deployment Script for Coach Core AI
# This script ensures all Firebase configurations are properly deployed

echo "🚀 Deploying Firebase Configuration for Coach Core AI..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged into Firebase. Please login first:"
    echo "   firebase login"
    exit 1
fi

echo "✅ Firebase CLI ready"

# Deploy Firestore rules
echo "📋 Deploying Firestore rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully"
else
    echo "❌ Firestore rules deployment failed"
    exit 1
fi

# Deploy Firestore indexes (if they exist)
if [ -f "firestore.indexes.json" ]; then
    echo "📊 Deploying Firestore indexes..."
    firebase deploy --only firestore:indexes
    
    if [ $? -eq 0 ]; then
        echo "✅ Firestore indexes deployed successfully"
    else
        echo "❌ Firestore indexes deployment failed"
        exit 1
    fi
fi

echo ""
echo "🎉 Firebase deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test the waitlist signup at http://localhost:3000"
echo "2. Verify emails are stored in Firestore console"
echo "3. Check that the new security rules are working"
