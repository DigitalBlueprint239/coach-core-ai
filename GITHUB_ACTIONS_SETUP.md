# 🚀 GitHub Actions Setup Guide

## Overview

This project includes automated CI/CD deployment via GitHub Actions that automatically builds and deploys your Coach Core AI application to Firebase Hosting on every push to the `main` branch.

## 🔧 Workflow Features

### ✅ What the Workflow Does

1. **📥 Checkout Code** - Gets the latest code from your repository
2. **🔧 Setup Node.js v18** - Installs Node.js with built-in caching
3. **📦 Install Dependencies** - Runs `npm ci` for clean, reproducible builds
4. **🔍 Verify Files** - Checks for required files (package.json, firebase.json, deploy.sh)
5. **🔨 Build Application** - Runs `npm run build` to create production bundle
6. **📁 Verify Build** - Ensures dist directory and index.html exist
7. **🔧 Setup Firebase CLI** - Installs Firebase CLI globally
8. **🔐 Authenticate** - Logs in to Firebase using your token
9. **🚀 Deploy** - Runs `./deploy.sh --fast` for verification
10. **🌐 Deploy to Firebase** - Deploys to Firebase Hosting
11. **✅ Success** - Reports deployment success and URL

### 🚀 Performance Optimizations

- **Node.js Caching**: Uses `actions/setup-node@v4` with `cache: 'npm'`
- **NPM Cache**: Additional caching for `~/.npm` directory
- **Dependency Caching**: Caches based on `package-lock.json` hash
- **Fast Builds**: Subsequent runs are significantly faster

## 🔐 Required Setup

### 1. Generate Firebase Token

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login and generate token
firebase login:ci

# Copy the generated token (you'll need this for GitHub secrets)
```

### 2. Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_TOKEN`
5. Value: Paste the token from step 1
6. Click **Add secret**

### 3. Verify Project Configuration

Ensure your `firebase.json` is configured for the correct project:

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 🎯 Workflow Triggers

The workflow runs on:

- **Push to main**: `on: push: branches: [ main ]`
- **Pull requests to main**: `on: pull_request: branches: [ main ]`

## 📊 Build Summary

Each workflow run generates a summary with:

- Node.js and NPM versions
- Build status
- Deployment URL
- Build size and file count

## 🔍 Troubleshooting

### Common Issues

1. **Firebase Authentication Failed**
   - Verify `FIREBASE_TOKEN` secret is correctly set
   - Ensure token is valid and not expired
   - Check Firebase project permissions

2. **Build Failed**
   - Check for TypeScript errors
   - Verify all dependencies are in package.json
   - Ensure build script exists

3. **Deploy Failed**
   - Verify firebase.json configuration
   - Check Firebase project exists
   - Ensure hosting is enabled

### Debug Steps

1. Check the **Actions** tab in your GitHub repository
2. Click on the failed workflow run
3. Review the step-by-step logs
4. Look for error messages in red

## 🚀 Manual Testing

You can test the workflow locally:

```bash
# Test the build process
npm ci
npm run build

# Test the deployment script
./deploy.sh --fast

# Test Firebase deployment
firebase deploy --only hosting
```

## 📈 Monitoring

- **Workflow Status**: Check the Actions tab for run status
- **Deployment URL**: https://coach-core-ai.web.app
- **Build Logs**: Available in GitHub Actions interface
- **Firebase Console**: Monitor deployments in Firebase Console

## 🔄 Workflow File Location

The workflow is defined in:
```
.github/workflows/deploy.yml
```

## 🎉 Success!

Once set up, every push to `main` will automatically:
1. Build your application
2. Deploy to Firebase Hosting
3. Make it available at https://coach-core-ai.web.app

No manual intervention required! 🚀

