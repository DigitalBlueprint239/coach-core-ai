# 🌐 Multi-Environment Deployment Guide

## Overview

Coach Core AI supports both staging and production deployments with separate Firebase hosting targets for safe testing and production releases.

## 🎯 Environments

### Production Environment
- **URL**: `https://coach-core-ai.web.app`
- **Branch**: `main`
- **Target**: `coach-core-ai-prod`
- **Purpose**: Live production application
- **Cache**: Long-term caching (1 year)

### Staging Environment
- **URL**: `https://coach-core-ai-staging.web.app`
- **Branch**: `staging`
- **Target**: `coach-core-ai-staging`
- **Purpose**: Testing and preview before production
- **Cache**: Short-term caching (1 hour)

## 🚀 Deployment Methods

### 1. GitHub Actions (Automatic)

#### Production Deployment
```bash
# Push to main branch
git push origin main
# Automatically deploys to production
```

#### Staging Deployment
```bash
# Push to staging branch
git push origin staging
# Automatically deploys to staging
```

### 2. Manual Deployment Script

#### Production
```bash
# Full deployment with testing
./deploy.sh --env=prod

# Fast deployment (build verification only)
./deploy.sh --fast --env=prod
```

#### Staging
```bash
# Full deployment with testing
./deploy.sh --env=staging

# Fast deployment (build verification only)
./deploy.sh --fast --env=staging
```

### 3. Direct Firebase CLI

#### Production
```bash
# Deploy to production
firebase deploy --only hosting:coach-core-ai-prod

# Deploy with force (clear cache)
firebase deploy --only hosting:coach-core-ai-prod --force
```

#### Staging
```bash
# Deploy to staging
firebase deploy --only hosting:coach-core-ai-staging

# Deploy with force (clear cache)
firebase deploy --only hosting:coach-core-ai-staging --force
```

## 🔧 Configuration Files

### firebase.json
```json
{
  "hosting": [
    {
      "target": "coach-core-ai-prod",
      "public": "dist",
      "headers": [
        {
          "source": "/js/**",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    },
    {
      "target": "coach-core-ai-staging",
      "public": "dist",
      "headers": [
        {
          "source": "/js/**",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=3600, immutable"
            }
          ]
        }
      ]
    }
  ]
}
```

### .firebaserc
```json
{
  "projects": {
    "default": "coach-core-ai"
  },
  "targets": {
    "coach-core-ai": {
      "hosting": {
        "coach-core-ai-prod": ["coach-core-ai"],
        "coach-core-ai-staging": ["coach-core-ai-staging"]
      }
    }
  }
}
```

## 📋 Deployment Workflow

### 1. Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"

# 3. Push to staging for testing
git push origin staging

# 4. Test on staging environment
# Visit: https://coach-core-ai-staging.web.app

# 5. Merge to main for production
git checkout main
git merge feature/new-feature
git push origin main
```

### 2. Hotfix Workflow
```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-fix

# 2. Make fix and commit
git add .
git commit -m "Fix critical issue"

# 3. Deploy directly to production
./deploy.sh --env=prod

# 4. Merge back to staging
git checkout staging
git merge hotfix/critical-fix
git push origin staging
```

## 🔍 Environment Differences

### Production
- **Long-term caching**: 1 year for static assets
- **Stable URL**: `coach-core-ai.web.app`
- **Monitoring**: Full Sentry and Firebase Performance
- **Security**: Strict CSP and security headers
- **Performance**: Optimized for speed

### Staging
- **Short-term caching**: 1 hour for static assets
- **Preview URL**: `coach-core-ai-staging.web.app`
- **Debug mode**: Enhanced logging and debugging
- **Testing**: Safe for experimental features
- **Performance**: Balanced for testing

## 🛠️ Setup Instructions

### 1. Firebase Project Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init hosting

# Add hosting targets
firebase target:apply hosting coach-core-ai-prod coach-core-ai
firebase target:apply hosting coach-core-ai-staging coach-core-ai-staging
```

### 2. GitHub Actions Setup

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add `FIREBASE_TOKEN` secret with your Firebase CLI token

### 3. Branch Protection (Recommended)

Set up branch protection rules:

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date
3. Add rule for `staging` branch:
   - Require pull request reviews
   - Allow force pushes

## 📊 Monitoring & Alerts

### Production Monitoring
- **Sentry**: Error tracking and performance monitoring
- **Firebase Performance**: Real-time performance metrics
- **Uptime Monitoring**: External uptime checks
- **Alerts**: Critical error notifications

### Staging Monitoring
- **Sentry**: Error tracking (separate project recommended)
- **Firebase Performance**: Performance testing
- **Debug Logging**: Enhanced debugging information
- **Alerts**: Development team notifications

## 🚨 Troubleshooting

### Common Issues

1. **Deployment Fails**
   ```bash
   # Check Firebase authentication
   firebase login
   
   # Check project configuration
   firebase projects:list
   
   # Check target configuration
   firebase target:list
   ```

2. **Wrong Environment Deployed**
   ```bash
   # Check current branch
   git branch
   
   # Check deploy script flags
   ./deploy.sh --env=staging
   ```

3. **Cache Issues**
   ```bash
   # Force deploy to clear cache
   firebase deploy --only hosting:coach-core-ai-prod --force
   ```

### Debug Commands

```bash
# Check Firebase configuration
firebase use --list

# Check hosting targets
firebase target:list

# Check deployment status
firebase hosting:sites:list

# Test local deployment
firebase serve --only hosting
```

## 📚 Best Practices

### 1. Branch Strategy
- **main**: Production-ready code only
- **staging**: Testing and integration
- **feature/***: Feature development
- **hotfix/***: Critical fixes

### 2. Deployment Strategy
- Always test on staging first
- Use feature flags for gradual rollouts
- Monitor deployment health
- Have rollback plan ready

### 3. Environment Management
- Keep environments in sync
- Use environment-specific configurations
- Monitor both environments
- Document environment differences

## 🎉 Success!

With multi-environment deployment set up, you now have:

- ✅ **Safe Testing**: Test changes on staging before production
- ✅ **Automated Deployments**: GitHub Actions handle deployments
- ✅ **Environment Isolation**: Separate staging and production
- ✅ **Easy Rollbacks**: Quick deployment to previous versions
- ✅ **Monitoring**: Full visibility into both environments

Your Coach Core AI app is now ready for professional multi-environment deployment! 🚀

