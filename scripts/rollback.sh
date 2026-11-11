#!/bin/bash

# Rollback Script for Coach Core AI
# This script allows you to rollback to a previous deployment

set -e

echo "🔄 Rollback Script for Coach Core AI"

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

# Check if version is provided
if [ -z "$1" ]; then
    print_error "Usage: ./scripts/rollback.sh <version>"
    print_status "Available versions:"
    firebase hosting:releases:list
    exit 1
fi

VERSION=$1

print_warning "This will rollback to version: $VERSION"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Rollback cancelled."
    exit 1
fi

print_status "Starting rollback to version $VERSION..."

# Rollback hosting
print_status "Rolling back hosting..."
firebase hosting:releases:rollback $VERSION

# Rollback functions (if needed)
print_status "Rolling back functions..."
firebase functions:rollback $VERSION

print_success "Rollback completed successfully!"
print_status "Your app has been rolled back to version: $VERSION"
print_status "Check your application at: https://coach-core-ai.web.app" 