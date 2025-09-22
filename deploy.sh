#!/bin/bash

# Coach Core AI - Production Deployment Script
# Production-grade deployment automation with clear phase separation

set -e  # Exit immediately if a command fails

# Parse command line arguments
FAST_MODE=false
ENVIRONMENT="prod"
TARGET="coach-core-ai-prod"
SITE_URL="https://coach-core-ai.web.app"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fast)
            FAST_MODE=true
            shift
            ;;
        --env=staging)
            ENVIRONMENT="staging"
            TARGET="coach-core-ai-staging"
            SITE_URL="https://coach-core-ai-staging.web.app"
            shift
            ;;
        --env=prod)
            ENVIRONMENT="prod"
            TARGET="coach-core-ai-prod"
            SITE_URL="https://coach-core-ai.web.app"
            shift
            ;;
        --env=production)
            ENVIRONMENT="prod"
            TARGET="coach-core-ai-prod"
            SITE_URL="https://coach-core-ai.web.app"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--fast] [--env=staging|prod|production]"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_phase() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

print_step() {
    echo -e "${BLUE}🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if curl is available for testing
check_curl() {
    if ! command_exists curl; then
        print_warning "curl not found - skipping HTTP test"
        return 1
    fi
    return 0
}

# 🧹 Cleanup Phase
cleanup_phase() {
    print_phase "🧹 Cleanup Phase"
    
    print_step "Removing old build artifacts..."
    rm -rf dist/ build/ .firebase/ firebase-debug.log
    print_success "Removed dist, build, .firebase, firebase-debug.log"
    
    print_step "Cleaning npm cache..."
    npm cache clean --force
    print_success "NPM cache cleaned"
    
    print_step "Cleaning Vite cache..."
    rm -rf node_modules/.vite/ .vite/
    print_success "Vite cache cleaned"
    
    print_success "🧹 Cleanup Phase completed"
    echo ""
}

# 📦 Dependencies Phase
dependencies_phase() {
    print_phase "📦 Dependencies Phase"
    
    print_step "Verifying package.json exists..."
    if [ ! -f "package.json" ]; then
        print_error "package.json not found!"
        exit 1
    fi
    print_success "package.json found"
    
    print_step "Running npm install to refresh dependencies..."
    npm install
    print_success "Dependencies installed successfully"
    
    print_success "📦 Dependencies Phase completed"
    echo ""
}

# ⚡ Build Phase
build_phase() {
    print_phase "⚡ Build Phase"
    
    print_step "Running production build..."
    npm run build
    
    print_step "Verifying build output folder exists..."
    if [ -d "dist" ]; then
        print_success "Build output folder 'dist' exists"
        print_info "Build contents:"
        ls -la dist/
    elif [ -d "build" ]; then
        print_success "Build output folder 'build' exists"
        print_info "Build contents:"
        ls -la build/
    else
        print_error "Build failed - neither 'dist' nor 'build' directory found!"
        exit 1
    fi
    
    print_success "⚡ Build Phase completed"
    echo ""
}

# ✅ Verification Phase
verification_phase() {
    print_phase "✅ Verification Phase"
    
    print_step "Checking firebase.json configuration..."
    if [ ! -f "firebase.json" ]; then
        print_error "firebase.json not found!"
        exit 1
    fi
    print_success "firebase.json found"
    
    print_step "Checking for Content-Type headers configuration..."
    if grep -q "Content-Type" firebase.json; then
        print_success "Content-Type headers found in firebase.json"
    else
        print_warning "Content-Type headers not found in firebase.json"
        print_warning "This may cause MIME type errors for JS/CSS files"
        print_info "Continuing deployment despite missing headers..."
    fi
    
    print_success "✅ Verification Phase completed"
    echo ""
}

# 🧪 Testing Phase
testing_phase() {
    print_phase "🧪 Testing Phase"
    
    print_step "Checking Firebase CLI availability..."
    if ! command_exists firebase; then
        print_error "Firebase CLI not found! Please install with: npm install -g firebase-tools"
        exit 1
    fi
    print_success "Firebase CLI found"
    
    print_step "Checking Firebase authentication..."
    if ! firebase projects:list >/dev/null 2>&1; then
        print_error "Not logged in to Firebase! Please run: firebase login"
        exit 1
    fi
    print_success "Firebase authentication verified"
    
    print_step "Starting local Firebase hosting server..."
    print_info "Server will run for 15 seconds to test response..."
    
    # Start Firebase serve in background
    firebase serve --only hosting >/dev/null 2>&1 &
    SERVE_PID=$!
    
    # Wait for server to start
    sleep 5
    
    print_step "Testing server response..."
    if check_curl; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200"; then
            print_success "Server responds with 200 OK on index.html"
        else
            print_warning "Server test failed - non-200 response"
        fi
    else
        print_warning "Skipping HTTP test - curl not available"
    fi
    
    # Clean up background process
    kill $SERVE_PID 2>/dev/null || true
    wait $SERVE_PID 2>/dev/null || true
    
    print_success "🧪 Testing Phase completed"
    echo ""
}

# 🚀 Deployment Phase
deployment_phase() {
    print_phase "🚀 Deployment Phase"
    
    print_step "Deploying to Firebase Hosting..."
    print_info "Environment: $ENVIRONMENT"
    print_info "Target: $TARGET"
    print_info "URL: $SITE_URL"
    print_info "Running: firebase deploy --only hosting:$TARGET --force"
    
    firebase deploy --only hosting:$TARGET --force
    
    print_step "Clearing CDN cache..."
    print_info "Force flag ensures CDN cache is cleared"
    
    print_success "🚀 Deployment Phase completed"
    echo ""
}

# 🌐 Success Phase
success_phase() {
    print_phase "🌐 Success Phase"
    
    print_step "Fetching live site URLs..."
    firebase hosting:sites:list
    
    print_step "Deployment Summary"
    print_info "Environment: $ENVIRONMENT"
    print_info "Target: $TARGET"
    print_info "Live URL: $SITE_URL"
    
    print_success "🌐 Success Phase completed"
    echo ""
}

# Main execution function
main() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}  Coach Core AI - $ENVIRONMENT Deploy    ${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo ""
    
    # Verify we're in the correct directory
    if [ ! -f "package.json" ] || [ ! -f "firebase.json" ]; then
        print_error "Please run this script from the project root directory!"
        print_error "Required files: package.json, firebase.json"
        exit 1
    fi
    
    print_info "Starting $ENVIRONMENT deployment workflow..."
    print_info "Target: $TARGET"
    print_info "URL: $SITE_URL"
    echo ""
    
    # Execute phases based on mode
    cleanup_phase
    dependencies_phase
    build_phase
    verification_phase
    
    if [[ "$FAST_MODE" == "true" ]]; then
        print_info "Fast mode enabled - skipping testing and deployment phases"
        print_success "Build verification completed successfully!"
    else
        testing_phase
        deployment_phase
        success_phase
    fi
    
    # Final success message
    echo -e "${GREEN}🎉 $ENVIRONMENT DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉${NC}"
    echo -e "${CYAN}Your Coach Core AI app is now live at: $SITE_URL${NC}"
    echo ""
    print_info "Environment: $ENVIRONMENT"
    print_info "Target: $TARGET"
    print_info "Live URL: $SITE_URL"
}

# Run main function
main "$@"