# Firebase Setup Guide

## Fixing the "Missing or insufficient permissions" Error

The error you're experiencing is caused by a configuration mismatch between your Firebase setup and environment variables.

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

### For Create React App:
```bash
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### For Vite:
```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## How to Get These Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. Click on your web app or create a new one
7. Copy the configuration values

## What Was Fixed

1. **Configuration Consolidation**: Updated `firebase-config.ts` to support both Vite and Create React App environment variables
2. **Enhanced Error Handling**: Improved the `handleSocialLogin` method with better error handling and fallback profile creation
3. **Security Rules Update**: Modified Firestore rules to explicitly allow user profile creation
4. **Debug Logging**: Added console logs to help troubleshoot authentication issues

## Testing the Fix

1. Restart your development server
2. Clear your browser's local storage and cookies for the app
3. Try signing in with Google again
4. Check the browser console for any error messages

## If the Error Persists

1. Check that your `.env` file is in the project root
2. Verify that your Firebase project has Google Authentication enabled
3. Ensure your Firebase project's Firestore database is created
4. Check that the security rules have been deployed to Firebase

## Common Issues

- **Environment variables not loading**: Make sure to restart your dev server after creating `.env`
- **Wrong project ID**: Double-check that you're using the correct Firebase project
- **Authentication not enabled**: Ensure Google sign-in is enabled in Firebase Authentication settings
