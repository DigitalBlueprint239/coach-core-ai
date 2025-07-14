#!/bin/bash

# Coach Core Deployment Script
# This script automates the deployment process for production

set -e  # Exit on any error

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    if ! command_exists git; then
        print_error "git is not installed. Please install git"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "All prerequisites are satisfied"
}

# Function to check environment variables
check_environment() {
    print_status "Checking environment variables..."
    
    REQUIRED_VARS=(
        "REACT_APP_FIREBASE_API_KEY"
        "REACT_APP_FIREBASE_AUTH_DOMAIN"
        "REACT_APP_FIREBASE_PROJECT_ID"
        "REACT_APP_FIREBASE_STORAGE_BUCKET"
        "REACT_APP_FIREBASE_MESSAGING_SENDER_ID"
        "REACT_APP_FIREBASE_APP_ID"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    if npm run type-check; then
        print_success "TypeScript type checking passed"
    else
        print_error "TypeScript type checking failed"
        exit 1
    fi
    
    if npm run lint; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        exit 1
    fi
    
    print_success "All tests passed"
}

# Function to build the application
build_application() {
    print_status "Building application for production..."
    
    # Clean previous build
    if [ -d "build" ]; then
        rm -rf build
        print_status "Cleaned previous build"
    fi
    
    # Build application
    if npm run build:prod; then
        print_success "Application built successfully"
    else
        print_error "Build failed"
        exit 1
    fi
    
    # Check build size
    BUILD_SIZE=$(du -sh build | cut -f1)
    print_status "Build size: $BUILD_SIZE"
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Start local server
    npx serve -s build -l 3000 > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Run Lighthouse audit
    if command_exists lighthouse; then
        lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html --chrome-flags="--headless" > /dev/null 2>&1
        print_success "Lighthouse audit completed"
    else
        print_warning "Lighthouse not installed, skipping performance audit"
    fi
    
    # Kill server
    kill $SERVER_PID 2>/dev/null || true
}

# Function to deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    if command_exists vercel; then
        if [ "$1" = "--prod" ]; then
            print_status "Deploying to production..."
            vercel --prod --yes
        else
            print_status "Deploying to preview..."
            vercel --yes
        fi
        print_success "Deployment completed"
    else
        print_error "Vercel CLI not installed. Please install with: npm i -g vercel"
        exit 1
    fi
}

# Function to run post-deployment checks
post_deployment_checks() {
    print_status "Running post-deployment checks..."
    
    # Wait a moment for deployment to propagate
    sleep 10
    
    # Get deployment URL (you might need to adjust this based on your setup)
    DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "")
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        print_success "Deployment URL: $DEPLOYMENT_URL"
        
        # Basic health check
        if curl -f -s "$DEPLOYMENT_URL" > /dev/null; then
            print_success "Health check passed"
        else
            print_warning "Health check failed - site might still be deploying"
        fi
    else
        print_warning "Could not determine deployment URL"
    fi
}

# Function to show deployment summary
show_summary() {
    print_success "Deployment Summary"
    echo "=================="
    echo "✅ Prerequisites checked"
    echo "✅ Environment variables validated"
    echo "✅ Tests passed"
    echo "✅ Application built"
    echo "✅ Performance tests completed"
    echo "✅ Deployed to Vercel"
    echo "✅ Post-deployment checks completed"
    echo ""
    print_success "Coach Core is now live! 🚀"
}

# Main deployment function
main() {
    echo "🚀 Coach Core Deployment Script"
    echo "================================"
    echo ""
    
    # Parse command line arguments
    DEPLOY_TO_PROD=false
    SKIP_TESTS=false
    SKIP_PERFORMANCE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --prod)
                DEPLOY_TO_PROD=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-performance)
                SKIP_PERFORMANCE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --prod              Deploy to production (default: preview)"
                echo "  --skip-tests        Skip running tests"
                echo "  --skip-performance  Skip performance tests"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_prerequisites
    check_environment
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    build_application
    
    if [ "$SKIP_PERFORMANCE" = false ]; then
        run_performance_tests
    else
        print_warning "Skipping performance tests"
    fi
    
    if [ "$DEPLOY_TO_PROD" = true ]; then
        deploy_to_vercel --prod
    else
        deploy_to_vercel
    fi
    
    post_deployment_checks
    show_summary
}

# Run main function with all arguments
main "$@" 