#!/bin/bash

# Fix test file type issues
echo "🔧 Fixing test file type issues..."

# Add import to all test files
for file in src/__tests__/*/*.tsx; do
  if ! grep -q "createMockAuthResponse" "$file"; then
    echo "Adding import to $file"
    sed -i '' '1i\
import { createMockAuthResponse } from "../utils/test-types";
' "$file"
  fi
done

# Replace mock objects with proper types
for file in src/__tests__/*/*.tsx; do
  echo "Fixing mock objects in $file"
  sed -i '' 's/user: { uid: '\''test'\'', email: '\''test@example.com'\'', displayName: '\''Test'\'' },/user: createMockUser(),/g' "$file"
  sed -i '' 's/profile: { uid: '\''test'\'', email: '\''test@example.com'\'', displayName: '\''Test'\'', role: '\''coach'\'' }/profile: createMockUserProfile()/g' "$file"
done

echo "✅ Test file types fixed!"



