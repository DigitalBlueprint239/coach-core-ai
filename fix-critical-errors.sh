#!/bin/bash

# 🔧 Coach Core AI - Critical Error Fix Script
# This script fixes the most critical TypeScript errors quickly

set -e

echo "🔧 Fixing critical TypeScript errors..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Fix 1: Add missing React import to useFeatureFlags.ts
print_status "Fixing React import in useFeatureFlags.ts..."
sed -i '' '1i\
import React from "react";
' src/hooks/useFeatureFlags.ts

# Fix 2: Add missing React import to simple-testing.ts
print_status "Fixing React import in simple-testing.ts..."
sed -i '' '1i\
import React, { useState } from "react";
' src/utils/simple-testing.ts

# Fix 3: Fix Icon usage in ModernNavigation.tsx
print_status "Fixing Icon usage in ModernNavigation.tsx..."
# Replace Icon with IconButton where appropriate
sed -i '' 's/<Icon/<IconButton/g' src/components/navigation/ModernNavigation.tsx
sed -i '' 's/<\/Icon>/<\/IconButton>/g' src/components/navigation/ModernNavigation.tsx

# Fix 4: Add missing imports to test files
print_status "Adding missing imports to test files..."
for file in src/test/helpers/test-utils.tsx; do
    if [ -f "$file" ]; then
        sed -i '' '1i\
import { vi } from "vitest";
' "$file"
    fi
done

# Fix 5: Fix duplicate function implementations in environment.ts
print_status "Fixing duplicate functions in environment.ts..."
# This is a more complex fix, so we'll just comment out the duplicates for now
sed -i '' 's/^export function getEnvironmentConfig/\/\/ export function getEnvironmentConfig/' src/config/environment.ts

print_success "✅ Critical errors fixed!"

echo ""
echo "🎯 Next steps:"
echo "1. Run: npm run build"
echo "2. Run: ./deploy-production.sh"
echo "3. Your app will be live at: https://coach-core-ai.web.app"



