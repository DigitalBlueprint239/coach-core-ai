#!/bin/bash

# Production Environment Setup Script for Coach Core AI
# This script sets up the production environment with all necessary configurations

set -e

echo "🚀 Starting Production Environment Setup for Coach Core AI..."

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

# Check if required tools are installed
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI is not installed. Installing now..."
        npm install -g firebase-tools
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_success "All requirements satisfied"
}

# Setup production environment variables
setup_env_vars() {
    print_status "Setting up production environment variables..."
    
    if [ ! -f .env.production ]; then
        cat > .env.production << EOF
# Production Environment Variables
REACT_APP_ENVIRONMENT=production

# Firebase Production Configuration
REACT_APP_FIREBASE_API_KEY=your_production_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_production_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_production_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_production_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# AI Service Configuration
REACT_APP_AI_API_KEY=your_ai_api_key_here
REACT_APP_AI_ENDPOINT=https://api.openai.com/v1
REACT_APP_AI_MODEL=gpt-4
REACT_APP_AI_MAX_TOKENS=2000

# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key_here
REACT_APP_STRIPE_ENDPOINT=https://api.stripe.com

# Analytics and Monitoring
REACT_APP_ANALYTICS_ID=your_analytics_id
REACT_APP_SENTRY_DSN=your_sentry_dsn

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_TRACKING=true
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
EOF
        print_success "Created .env.production file"
    else
        print_warning ".env.production already exists. Please review and update manually."
    fi
}

# Setup Firebase production project
setup_firebase_production() {
    print_status "Setting up Firebase production project..."
    
    # Check if already logged in
    if ! firebase projects:list &> /dev/null; then
        print_status "Please log in to Firebase..."
        firebase login
    fi
    
    # Create or select production project
    print_status "Setting up Firebase production configuration..."
    
    if [ ! -f firebase.production.json ]; then
        cat > firebase.production.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
EOF
        print_success "Created firebase.production.json"
    fi
    
    print_warning "Please manually configure your Firebase production project:"
    print_warning "1. Run: firebase use --add"
    print_warning "2. Select or create your production project"
    print_warning "3. Update firebase.production.json with your project ID"
}

# Setup production build configuration
setup_build_config() {
    print_status "Setting up production build configuration..."
    
    # Update package.json scripts for production
    if [ -f package.json ]; then
        # Add production build scripts if they don't exist
        if ! grep -q '"build:production"' package.json; then
            print_status "Adding production build scripts to package.json..."
            # This would require more sophisticated JSON manipulation
            print_warning "Please manually add these scripts to package.json:"
            echo "  \"build:production\": \"REACT_APP_ENVIRONMENT=production vite build\","
            echo "  \"deploy:production\": \"npm run build:production && firebase deploy --config firebase.production.json\","
            echo "  \"test:production\": \"npm run build:production && npm run test\""
        fi
    fi
    
    # Create production Vite config
    if [ ! -f vite.config.production.ts ]; then
        cat > vite.config.production.ts << EOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion'],
          utils: ['date-fns', 'lodash-es'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
EOF
        print_success "Created vite.config.production.ts"
    fi
}

# Setup production security rules
setup_security_rules() {
    print_status "Setting up production security rules..."
    
    # Enhanced Firestore security rules
    if [ ! -f firestore.rules.enhanced ]; then
        cat > firestore.rules.enhanced << EOF
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles - users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Teams - team members can access their teams
    match /teams/{teamId} {
      allow read, write: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         request.auth.uid in resource.data.members);
      allow read: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Plays - users can access plays from their teams
    match /plays/{playId} {
      allow read, write: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid ||
         resource.data.teamId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teams);
      allow read: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Subscriptions - users can only access their own subscription data
    match /subscriptions/{subscriptionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Usage tracking - users can only access their own usage data
    match /usage/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Admin access
    match /{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
EOF
        print_success "Created enhanced Firestore security rules"
    fi
    
    # Enhanced Storage security rules
    if [ ! -f storage.rules.enhanced ]; then
        cat > storage.rules.enhanced << EOF
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload profile pictures
    match /users/{userId}/profile-picture.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Team assets - team members can access
    match /teams/{teamId}/{allPaths=**} {
      allow read: if request.auth != null && 
        (exists(/databases/$(database)/documents/teams/$(teamId)) &&
         (get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId == request.auth.uid ||
          request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members));
      allow write: if request.auth != null && 
        (exists(/databases/$(database)/documents/teams/$(teamId)) &&
         get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId == request.auth.uid);
    }
    
    // Admin access
    match /{allPaths=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
EOF
        print_success "Created enhanced Storage security rules"
    fi
}

# Setup monitoring and analytics
setup_monitoring() {
    print_status "Setting up monitoring and analytics..."
    
    # Create monitoring configuration
    if [ ! -f src/config/monitoring.ts ]; then
        cat > src/config/monitoring.ts << EOF
export const monitoringConfig = {
  // Error tracking
  sentry: {
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_ENVIRONMENT || 'development',
    tracesSampleRate: 0.1,
  },
  
  // Analytics
  analytics: {
    id: process.env.REACT_APP_ANALYTICS_ID,
    enabled: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  },
  
  // Performance monitoring
  performance: {
    enabled: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true',
    sampleRate: 0.1,
  },
  
  // Error tracking
  errorTracking: {
    enabled: process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true',
    logToConsole: process.env.NODE_ENV === 'development',
  },
};
EOF
        print_success "Created monitoring configuration"
    fi
}

# Setup CI/CD pipeline
setup_cicd() {
    print_status "Setting up CI/CD pipeline..."
    
    # GitHub Actions workflow
    if [ ! -d .github/workflows ]; then
        mkdir -p .github/workflows
    fi
    
    if [ ! -f .github/workflows/production-deploy.yml ]; then
        cat > .github/workflows/production-deploy.yml << EOF
name: Production Deploy

on:
  push:
    branches: [ main, production ]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run build:production

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/production'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:production
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '\${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '\${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: '\${{ secrets.FIREBASE_PROJECT_ID }}'
          channelId: live
EOF
        print_success "Created GitHub Actions workflow"
    fi
}

# Main setup function
main() {
    print_status "Starting production environment setup..."
    
    check_requirements
    setup_env_vars
    setup_firebase_production
    setup_build_config
    setup_security_rules
    setup_monitoring
    setup_cicd
    
    print_success "Production environment setup completed!"
    print_status "Next steps:"
    print_status "1. Update .env.production with your actual API keys"
    print_status "2. Configure Firebase production project"
    print_status "3. Set up Stripe production account"
    print_status "4. Configure domain and SSL certificates"
    print_status "5. Set up monitoring and analytics"
    print_status "6. Test the production build: npm run build:production"
    print_status "7. Deploy: npm run deploy:production"
}

# Run main function
main "$@"
