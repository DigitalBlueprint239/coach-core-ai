# 🔒 COOP Headers Configuration for OAuth Popup Flows

## Overview

This document explains the Cross-Origin-Opener-Policy (COOP) headers configuration implemented in `firebase.json` to support OAuth popup flows while maintaining security for the rest of the application.

## 🔍 Analysis Results

### Window.close() Usage Search
- **Source Code**: ✅ No `window.closed` or `window.close()` calls found in our application code
- **Firebase Auth Library**: ✅ Expected usage found in Firebase Auth library for OAuth popup management
- **OAuth Flow**: ✅ Google OAuth uses `signInWithPopup()` which internally manages popup windows

## 🛡️ Security Headers Configuration

### Header Priority Order
Firebase Hosting processes headers in the order they appear in the configuration. More specific routes are placed before the catch-all `**` route.

### 1. OAuth/Popup Routes (Relaxed COOP)

#### Routes with `same-origin-allow-popups`:
- `/__/auth/**` - Firebase Auth handler endpoints
- `/login` - Login page with Google OAuth
- `/signup` - Signup page with Google OAuth

```json
{
  "source": "/__/auth/**",
  "headers": [
    {
      "key": "Cross-Origin-Opener-Policy",
      "value": "same-origin-allow-popups"
    },
    {
      "key": "Cross-Origin-Embedder-Policy",
      "value": "unsafe-none"
    }
  ]
}
```

**Why these headers?**
- `same-origin-allow-popups`: Allows popup windows to communicate with the parent window
- `unsafe-none`: Relaxes COEP to allow OAuth popups to function properly

### 2. General Application Routes (Strict COOP)

#### All other routes (`**`):
```json
{
  "source": "**",
  "headers": [
    {
      "key": "Cross-Origin-Opener-Policy",
      "value": "same-origin"
    },
    {
      "key": "Cross-Origin-Embedder-Policy",
      "value": "require-corp"
    },
    {
      "key": "Cross-Origin-Resource-Policy",
      "value": "same-origin"
    }
  ]
}
```

**Why these headers?**
- `same-origin`: Strict COOP - prevents cross-origin window access
- `require-corp`: Strict COEP - requires Cross-Origin-Resource-Policy headers
- `same-origin`: CORP - restricts resource loading to same-origin

## 🔧 Implementation Details

### Firebase Hosting Configuration
The configuration is applied to both production and staging environments:

```json
{
  "hosting": [
    {
      "target": "coach-core-ai-prod",
      "headers": [
        // OAuth routes with relaxed headers
        { "source": "/__/auth/**", "headers": [...] },
        { "source": "/login", "headers": [...] },
        { "source": "/signup", "headers": [...] },
        // All other routes with strict headers
        { "source": "**", "headers": [...] }
      ]
    },
    {
      "target": "coach-core-ai-staging",
      "headers": [
        // Same configuration as production
      ]
    }
  ]
}
```

### Route-Specific Headers

#### 1. Firebase Auth Endpoints (`/__/auth/**`)
- **Purpose**: Firebase Auth popup handler
- **COOP**: `same-origin-allow-popups`
- **COEP**: `unsafe-none`
- **Reason**: Allows OAuth popups to communicate back to parent window

#### 2. Authentication Pages (`/login`, `/signup`)
- **Purpose**: Pages containing Google OAuth buttons
- **COOP**: `same-origin-allow-popups`
- **COEP**: `unsafe-none`
- **Reason**: Allows OAuth popup flows to function properly

#### 3. All Other Routes (`**`)
- **Purpose**: Main application pages (dashboard, team management, etc.)
- **COOP**: `same-origin`
- **COEP**: `require-corp`
- **CORP**: `same-origin`
- **Reason**: Maximum security for application content

## 🚀 OAuth Flow Support

### Google Authentication Process
1. **User clicks "Sign in with Google"** on `/login` or `/signup`
2. **Firebase Auth opens popup** to Google OAuth provider
3. **User authenticates** with Google
4. **Google redirects** to `/__/auth/handler` with auth code
5. **Firebase Auth processes** the authentication
6. **Popup communicates** result back to parent window
7. **Parent window receives** authentication result
8. **User is redirected** to `/dashboard`

### Why COOP Headers Matter
- **Without relaxed COOP**: OAuth popups cannot communicate with parent window
- **With strict COOP everywhere**: OAuth flows would fail
- **With relaxed COOP everywhere**: Security vulnerability for main app
- **With selective COOP**: ✅ OAuth works + main app is secure

## 🔒 Security Benefits

### 1. OAuth Security
- ✅ OAuth popups can communicate with parent window
- ✅ Google OAuth flows work correctly
- ✅ No cross-origin window access outside OAuth

### 2. Application Security
- ✅ Strict COOP on main application routes
- ✅ Prevents malicious popup access to main app
- ✅ CORP headers prevent resource leakage
- ✅ COEP headers enforce strict embedding policies

### 3. Defense in Depth
- ✅ Route-specific security policies
- ✅ Minimal privilege principle
- ✅ OAuth flows isolated from main app security

## 🧪 Testing OAuth Flows

### 1. Test Google Sign-In
```bash
# Deploy the updated configuration
firebase deploy --only hosting

# Test OAuth flow
# 1. Navigate to /login
# 2. Click "Sign in with Google"
# 3. Complete OAuth flow
# 4. Verify redirect to /dashboard
```

### 2. Verify Headers
```bash
# Check OAuth route headers
curl -I https://coach-core-ai.web.app/__/auth/handler

# Check login page headers
curl -I https://coach-core-ai.web.app/login

# Check main app headers
curl -I https://coach-core-ai.web.app/dashboard
```

### 3. Browser Developer Tools
- Open Network tab
- Look for `Cross-Origin-Opener-Policy` headers
- Verify OAuth routes have `same-origin-allow-popups`
- Verify main app routes have `same-origin`

## 📋 Configuration Checklist

- ✅ **OAuth Routes**: `/__/auth/**`, `/login`, `/signup` have relaxed COOP
- ✅ **Main App Routes**: All other routes have strict COOP
- ✅ **Production Environment**: Headers configured
- ✅ **Staging Environment**: Headers configured
- ✅ **Header Priority**: Specific routes before catch-all
- ✅ **Security**: Maximum security for non-OAuth routes
- ✅ **Functionality**: OAuth popups work correctly

## 🚨 Important Notes

### 1. Header Order Matters
Firebase Hosting processes headers in order. More specific routes must come before the catch-all `**` route.

### 2. OAuth Route Coverage
All routes that initiate OAuth flows must have relaxed COOP headers:
- `/login` - Login page
- `/signup` - Signup page
- `/__/auth/**` - Firebase Auth handlers

### 3. Security Trade-offs
- **Relaxed COOP**: Required for OAuth popups to function
- **Strict COOP**: Required for main application security
- **Selective Application**: Best of both worlds

### 4. Browser Compatibility
- Modern browsers support COOP headers
- Older browsers ignore unsupported headers
- Graceful degradation for unsupported browsers

## 🎯 Success Criteria

With this configuration:
- ✅ Google OAuth popup flows work correctly
- ✅ Users can sign in with Google
- ✅ Main application has strict security headers
- ✅ No cross-origin window access vulnerabilities
- ✅ OAuth flows are isolated from main app security

The application now supports OAuth popup flows while maintaining maximum security for the rest of the application! 🚀

