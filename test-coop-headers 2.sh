#!/bin/bash

# COOP Headers Test Script
# Tests the Cross-Origin-Opener-Policy headers configuration

echo "🔒 Testing COOP Headers Configuration"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test headers
test_headers() {
    local url=$1
    local expected_coop=$2
    local description=$3
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo "URL: $url"
    
    # Get headers
    headers=$(curl -s -I "$url" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Extract COOP header
        coop_header=$(echo "$headers" | grep -i "cross-origin-opener-policy" | cut -d: -f2 | tr -d ' \r\n')
        
        if [ -n "$coop_header" ]; then
            if [ "$coop_header" = "$expected_coop" ]; then
                echo -e "${GREEN}✅ PASS: COOP header is '$coop_header'${NC}"
            else
                echo -e "${RED}❌ FAIL: Expected '$expected_coop', got '$coop_header'${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  WARNING: No COOP header found${NC}"
        fi
        
        # Extract COEP header
        coep_header=$(echo "$headers" | grep -i "cross-origin-embedder-policy" | cut -d: -f2 | tr -d ' \r\n')
        if [ -n "$coep_header" ]; then
            echo "   COEP: $coep_header"
        fi
        
        # Extract CORP header
        corp_header=$(echo "$headers" | grep -i "cross-origin-resource-policy" | cut -d: -f2 | tr -d ' \r\n')
        if [ -n "$corp_header" ]; then
            echo "   CORP: $corp_header"
        fi
    else
        echo -e "${RED}❌ FAIL: Could not connect to $url${NC}"
    fi
    
    echo ""
}

# Test URLs
PROD_BASE="https://coach-core-ai.web.app"
STAGING_BASE="https://coach-core-ai-staging.web.app"

echo -e "${YELLOW}Testing Production Environment${NC}"
echo "=================================="
test_headers "$PROD_BASE/__/auth/handler" "same-origin-allow-popups" "Firebase Auth Handler (should allow popups)"
test_headers "$PROD_BASE/login" "same-origin-allow-popups" "Login Page (should allow popups)"
test_headers "$PROD_BASE/signup" "same-origin-allow-popups" "Signup Page (should allow popups)"
test_headers "$PROD_BASE/dashboard" "same-origin" "Dashboard (should be strict)"
test_headers "$PROD_BASE/team" "same-origin" "Team Page (should be strict)"

echo ""
echo -e "${YELLOW}Testing Staging Environment${NC}"
echo "=================================="
test_headers "$STAGING_BASE/__/auth/handler" "same-origin-allow-popups" "Firebase Auth Handler (should allow popups)"
test_headers "$STAGING_BASE/login" "same-origin-allow-popups" "Login Page (should allow popups)"
test_headers "$STAGING_BASE/signup" "same-origin-allow-popups" "Signup Page (should allow popups)"
test_headers "$STAGING_BASE/dashboard" "same-origin" "Dashboard (should be strict)"
test_headers "$STAGING_BASE/team" "same-origin" "Team Page (should be strict)"

echo ""
echo -e "${GREEN}🎉 COOP Headers Test Complete!${NC}"
echo ""
echo "Expected Results:"
echo "- OAuth routes (/__/auth/**, /login, /signup): same-origin-allow-popups"
echo "- Main app routes (/dashboard, /team, etc.): same-origin"
echo ""
echo "If any tests fail, the Firebase Hosting configuration may need to be redeployed:"
echo "  firebase deploy --only hosting"

