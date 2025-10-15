# 🔐 Firebase Authentication Setup Guide

## **CRITICAL: Enable Authentication in Firebase Console**

### **Step 1: Access Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `coach-core-ai`
3. Navigate to **Authentication** → **Sign-in method**

### **Step 2: Enable Email/Password Authentication**
1. Click on **Email/Password**
2. Toggle **Enable** to ON
3. Click **Save**

### **Step 3: Enable Google Sign-In**
1. Click on **Google**
2. Toggle **Enable** to ON
3. Select **Project support email**: your-email@domain.com
4. Click **Save**

### **Step 4: Configure OAuth Consent Screen**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `coach-core-ai`
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Fill in required fields:
   - **App name**: Coach Core AI
   - **User support email**: your-email@domain.com
   - **Developer contact**: your-email@domain.com
5. Click **Save and Continue**

### **Step 5: Add Authorized Domains**
1. In Firebase Console → **Authentication** → **Settings**
2. Add to **Authorized domains**:
   - `coach-core-ai.web.app`
   - `coach-core-ai.firebaseapp.com`
   - `localhost` (for development)

### **Step 6: Test Authentication**
Run the test script to verify setup:
```bash
npm run test:auth
```

## **Expected Results**
- ✅ Email/Password signup works
- ✅ Email/Password login works  
- ✅ Google Sign-In works
- ✅ Password reset works
- ✅ User data persists in Firestore

## **Troubleshooting**
- If Google Sign-In fails: Check OAuth consent screen configuration
- If Email/Password fails: Verify email is enabled and domains are authorized
- If Firestore rules fail: Check security rules are deployed

---
**Status**: ⏳ **PENDING** - Manual setup required
**Estimated Time**: 15-30 minutes
**Priority**: 🔴 **CRITICAL**

