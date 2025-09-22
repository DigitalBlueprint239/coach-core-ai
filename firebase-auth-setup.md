# Firebase Authentication Setup Guide

## CRITICAL: Enable Email/Password Authentication

To fix the authentication issues, you need to manually enable email/password authentication in Firebase Console:

### Step 1: Access Firebase Console
1. Go to: https://console.firebase.google.com/project/coach-core-ai/overview
2. Click on "Authentication" in the left sidebar
3. Click on "Sign-in method" tab

### Step 2: Enable Email/Password Provider
1. Find "Email/Password" in the list of providers
2. Click on it to expand
3. Click the toggle switch to **ENABLE** it
4. Configure the following settings:
   - ✅ **Email link (passwordless sign-in)**: Optional
   - ✅ **Email/password**: **ENABLE THIS**
   - **Password requirements**:
     - Minimum length: 8 characters
     - Require uppercase: Yes
     - Require lowercase: Yes
     - Require numbers: Yes
     - Require special characters: Yes

### Step 3: Save Changes
1. Click "Save" button
2. Wait for the changes to take effect

### Step 4: Test Authentication
1. Go to: https://coach-core-ai.web.app/
2. Try to sign up with email/password
3. Verify that authentication works

## Current Status
- ✅ **Firebase Project**: coach-core-ai (active)
- ✅ **Environment Variables**: .env file created with real credentials
- ✅ **App Deployed**: Latest fixes deployed to Firebase Hosting
- ❌ **Email/Password Auth**: Needs to be enabled in Firebase Console

## Next Steps After Enabling Auth
1. Test email/password sign-up
2. Test team management page (should now load)
3. Test practice planner dropdowns (should now work)
4. Begin Phase 2: Core feature development
