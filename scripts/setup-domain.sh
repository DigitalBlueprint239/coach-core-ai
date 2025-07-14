#!/bin/bash

# Setup Custom Domain for Coach Core AI
# This script configures a custom domain with automatic SSL certificates

set -e

echo "🚀 Setting up custom domain for Coach Core AI..."

# Check if domain is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/setup-domain.sh <your-domain.com>"
    echo "Example: ./scripts/setup-domain.sh coachcore.ai"
    exit 1
fi

DOMAIN=$1

echo "📝 Configuring domain: $DOMAIN"

# Add custom domain to Firebase Hosting
echo "🔗 Adding custom domain to Firebase Hosting..."
firebase hosting:sites:add $DOMAIN

# Configure the domain
echo "⚙️  Configuring domain settings..."
firebase hosting:channel:deploy production --only hosting:$DOMAIN

echo "🔒 SSL certificate will be automatically provisioned by Firebase"
echo "⏳ DNS verification may take up to 24 hours"

# Display next steps
echo ""
echo "✅ Domain setup initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Add the following DNS records to your domain provider:"
echo "   - Type: A"
echo "   - Name: @"
echo "   - Value: 151.101.1.195"
echo "   - Type: A"
echo "   - Name: @"
echo "   - Value: 151.101.65.195"
echo ""
echo "2. Add CNAME record:"
echo "   - Type: CNAME"
echo "   - Name: www"
echo "   - Value: $DOMAIN"
echo ""
echo "3. Wait for DNS propagation (up to 24 hours)"
echo "4. SSL certificate will be automatically provisioned"
echo ""
echo "🔍 Check status with: firebase hosting:sites:list" 