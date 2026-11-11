#!/bin/bash

# Production Deployment Script for Coach Core AI
# This script builds and deploys the application to Firebase

set -e

echo "🚀 Starting production deployment for Coach Core AI..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Please copy env.production.example to .env.local and configure your environment variables."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

print_status "Starting deployment process..."

# Step 1: Install dependencies
print_status "Installing dependencies..."
npm ci --production=false

# Step 2: Run tests
print_status "Running tests..."
npm test -- --watchAll=false --passWithNoTests

# Step 3: Run linting
print_status "Running linting..."
npm run lint -- --fix

# Step 4: Build the application
print_status "Building application..."
npm run build

# Step 5: Deploy to Firebase
print_status "Deploying to Firebase..."

# Deploy Firestore rules and indexes
print_status "Deploying Firestore configuration..."
firebase deploy --only firestore:rules,firestore:indexes

# Deploy Storage rules
print_status "Deploying Storage rules..."
firebase deploy --only storage

# Deploy Functions
print_status "Deploying Cloud Functions..."
firebase deploy --only functions

# Deploy Hosting
print_status "Deploying to Hosting..."
firebase deploy --only hosting

print_success "Deployment completed successfully!"
print_status "Your app is now live at: https://coach-core-ai.web.app"
print_status "Firebase Console: https://console.firebase.google.com/project/coach-core-ai"

# Optional: Run post-deployment checks
if [ "$1" = "--with-checks" ]; then
    print_status "Running post-deployment checks..."
    
    # Check if the app is responding
    sleep 10
    if curl -f -s https://coach-core-ai.web.app > /dev/null; then
        print_success "Application is responding correctly"
    else
        print_warning "Application may not be responding yet (this is normal for new deployments)"
    fi
    
    # Check Cloud Functions health
    if curl -f -s https://us-central1-coach-core-ai.cloudfunctions.net/healthCheck > /dev/null; then
        print_success "Cloud Functions are healthy"
    else
        print_warning "Cloud Functions health check failed"
    fi
fi

echo ""
print_success "🎉 Deployment completed! Your Coach Core AI application is now live in production." 