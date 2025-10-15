# 🔧 Firebase Authentication Setup Guide

## **Issue: `auth/operation-not-allowed` Error**

This error means Google authentication is not enabled in your Firebase project.

## **Step 1: Enable Google Authentication in Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`coach-core-demo` or your project name)
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Click **Enable**
6. Add your **Project support email**
7. Click **Save**

## **Step 2: Verify Firebase Project Configuration**

Make sure your `.env.local` file has the correct Firebase credentials:

```bash
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## **Step 3: Check Authorized Domains**

1. In Firebase Console, go to **Authentication** → **Settings**
2. Under **Authorized domains**, make sure `localhost` is listed
3. Add `localhost` if it's missing

## **Step 4: Test Authentication**

After enabling Google auth, test the sign-in flow:
1. Go to `http://localhost:3000/login`
2. Click "Sign in with Google"
3. Complete the Google sign-in
4. You should be redirected to `/dashboard`

## **Common Issues & Solutions**

### **Issue: Still getting `auth/operation-not-allowed`**
- Make sure you're using the correct Firebase project
- Verify Google auth is enabled in the correct project
- Check that your `.env.local` has the right project ID

### **Issue: Redirected back to landing page**
- Check browser console for authentication errors
- Verify the auth state listener is working
- Check if user profile creation is failing

### **Issue: Google sign-in popup blocked**
- Allow popups for localhost:3000
- Check if ad blockers are interfering
- Try incognito mode

## **Testing the Fix**

1. **Enable Google Auth** in Firebase Console
2. **Restart dev server**: `npm run dev`
3. **Test sign-in flow**:
   - Go to `/login`
   - Click "Sign in with Google"
   - Complete authentication
   - Should redirect to `/dashboard`
4. **Test protected routes**:
   - `/team` - Team management
   - `/play-designer` - Play designer
   - `/dashboard` - Main dashboard

## **Next Steps**

Once authentication is working:
1. Test all MVP features
2. Verify user data persistence
3. Test team management CRUD
4. Test play designer functionality
5. Deploy to production

---

**Need Help?** Check the browser console for specific error messages and verify your Firebase project configuration.
