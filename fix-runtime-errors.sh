#!/bin/bash

# 🔧 Coach Core AI - Runtime Error Fix Script
# This script fixes the critical runtime errors

set -e

echo "🔧 Fixing runtime errors..."

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

# Fix 1: Disable Firebase Performance monitoring temporarily
print_status "Disabling Firebase Performance monitoring temporarily..."
cat > src/services/monitoring/performance-monitor.ts << 'EOF'
// Temporary fix - disable Firebase Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  initialize() {
    console.log('Performance monitoring disabled for development');
  }

  trackCustomMetric() {
    // Disabled
  }

  trackCoreWebVital() {
    // Disabled
  }

  trackMemoryUsage() {
    // Disabled
  }

  setupCustomMetrics() {
    // Disabled
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
EOF

# Fix 2: Disable GA4 analytics temporarily
print_status "Disabling GA4 analytics temporarily..."
cat > src/services/analytics/ga4-config.ts << 'EOF'
// Temporary fix - disable GA4 analytics
export class GA4AnalyticsService {
  constructor() {
    console.log('GA4 Analytics disabled for development');
  }

  initialize() {
    // Disabled
  }

  trackEvent() {
    // Disabled
  }

  trackPageView() {
    // Disabled
  }

  trackSignupStarted() {
    // Disabled
  }

  trackSignupCompleted() {
    // Disabled
  }

  trackLogin() {
    // Disabled
  }

  trackLogout() {
    // Disabled
  }

  trackWaitlistSignup() {
    // Disabled
  }

  trackWaitlistSignupSuccess() {
    // Disabled
  }

  trackWaitlistSignupError() {
    // Disabled
  }

  trackSubscriptionStarted() {
    // Disabled
  }

  trackSubscriptionCompleted() {
    // Disabled
  }

  trackSubscriptionCanceled() {
    // Disabled
  }

  trackTrialStarted() {
    // Disabled
  }

  trackTrialEnded() {
    // Disabled
  }

  trackConversion() {
    // Disabled
  }

  getMarketingAttribution() {
    return null;
  }

  getDebugInfo() {
    return { enabled: false };
  }
}

export const ga4Analytics = new GA4AnalyticsService();
EOF

print_success "✅ Runtime errors fixed!"

echo ""
echo "🎯 Next steps:"
echo "1. The app should now run without errors"
echo "2. Performance monitoring is temporarily disabled"
echo "3. Analytics are temporarily disabled"
echo "4. You can re-enable them later when properly configured"



