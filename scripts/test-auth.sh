#!/bin/bash

# Authentication Testing Script for Coach Core AI
# This script tests the production authentication flow

set -e

echo "🔐 Testing Production Authentication Flow for Coach Core AI"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed. Please install it to run authentication tests."
    exit 1
fi

# Test URLs
APP_URL="https://coach-core-ai.web.app"
FUNCTIONS_URL="https://us-central1-coach-core-ai.cloudfunctions.net"

print_status "Starting authentication flow tests..."

# Test 1: Check if app is accessible
print_status "Test 1: Checking app accessibility..."
if curl -f -s "$APP_URL" > /dev/null; then
    print_success "App is accessible"
else
    print_error "App is not accessible"
    exit 1
fi

# Test 2: Check if Cloud Functions are responding
print_status "Test 2: Checking Cloud Functions health..."
if curl -f -s "$FUNCTIONS_URL/healthCheck" > /dev/null; then
    print_success "Cloud Functions are healthy"
else
    print_warning "Cloud Functions health check failed"
fi

# Test 3: Check Firebase Auth configuration
print_status "Test 3: Checking Firebase Auth configuration..."
AUTH_CONFIG=$(curl -s "$APP_URL" | grep -o "firebaseConfig.*" | head -1)
if [ ! -z "$AUTH_CONFIG" ]; then
    print_success "Firebase Auth configuration found"
else
    print_warning "Firebase Auth configuration not found in app"
fi

# Test 4: Check if authentication providers are enabled
print_status "Test 4: Checking authentication providers..."
# This would require Firebase Admin SDK access
print_warning "Manual verification required: Check Firebase Console > Authentication > Sign-in method"

# Test 5: Test sign-up flow (simulation)
print_status "Test 5: Testing sign-up flow..."
print_warning "Manual test required: Visit $APP_URL and test sign-up process"

# Test 6: Test sign-in flow (simulation)
print_status "Test 6: Testing sign-in flow..."
print_warning "Manual test required: Visit $APP_URL and test sign-in process"

# Test 7: Check security rules
print_status "Test 7: Checking Firestore security rules..."
if firebase firestore:rules:test firestore.rules > /dev/null 2>&1; then
    print_success "Firestore security rules are valid"
else
    print_error "Firestore security rules have issues"
fi

# Test 8: Check storage rules
print_status "Test 8: Checking Storage security rules..."
if firebase storage:rules:test storage.rules > /dev/null 2>&1; then
    print_success "Storage security rules are valid"
else
    print_error "Storage security rules have issues"
fi

echo ""
print_success "🎉 Authentication flow tests completed!"
echo ""
print_status "📋 Manual Testing Checklist:"
echo "1. ✅ Visit $APP_URL"
echo "2. ✅ Test user registration"
echo "3. ✅ Test user login"
echo "4. ✅ Test password reset"
echo "5. ✅ Test email verification"
echo "6. ✅ Test Google OAuth (if enabled)"
echo "7. ✅ Test protected routes"
echo "8. ✅ Test logout functionality"
echo ""
print_status "🔍 Firebase Console: https://console.firebase.google.com/project/coach-core-ai/authentication"
print_status "📊 Analytics: https://console.firebase.google.com/project/coach-core-ai/analytics" 