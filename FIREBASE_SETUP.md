# Firebase Setup Guide for Coach Core

## Overview
Coach Core now includes a complete Firebase backend for authentication, data persistence, and real-time synchronization. This guide will help you set up Firebase for your application.

## Prerequisites
- A Google account
- Node.js and npm installed
- Coach Core application code

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "coach-core-app")
4. Choose whether to enable Google Analytics (recommended)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Click "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## Step 3: Create Firestore Database

1. Click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select a location close to your users
5. Click "Done"

## Step 4: Set Up Security Rules

1. In Firestore Database, click "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Team members can read/write team data
    match /teams/{teamId} {
      allow read, write: if request.auth != null && 
        (resource.data.headCoachId == request.auth.uid || 
         request.auth.uid in resource.data.assistantCoachIds);
    }
    
    // Practice plans - team members can access
    match /practicePlans/{planId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/teams/$(resource.data.teamId)) &&
        (get(/databases/$(database)/documents/teams/$(resource.data.teamId)).data.headCoachId == request.auth.uid ||
         request.auth.uid in get(/databases/$(database)/documents/teams/$(resource.data.teamId)).data.assistantCoachIds);
    }
    
    // Plays - team members can access
    match /plays/{playId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/teams/$(resource.data.teamId)) &&
        (get(/databases/$(database)/documents/teams/$(resource.data.teamId)).data.headCoachId == request.auth.uid ||
         request.auth.uid in get(/databases/$(database)/documents/teams/$(resource.data.teamId)).data.assistantCoachIds);
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Firebase Configuration

1. Click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Enter an app nickname (e.g., "Coach Core Web")
6. Click "Register app"
7. Copy the configuration object

## Step 6: Configure Environment Variables

1. Create a `.env.local` file in your project root
2. Add your Firebase configuration:

```bash
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Step 7: Install Dependencies

The Firebase dependencies are already included in the project. If you need to reinstall:

```bash
npm install firebase
```

## Step 8: Test the Setup

1. Start your development server: `npm start`
2. Open the application in your browser
3. Try to create a new account
4. Verify that you can sign in and out

## Development with Emulators

For local development without affecting production data:

1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```

4. Start emulators:
```bash
npm run firebase:emulators
```

## Production Deployment

1. Build your application:
```bash
npm run build
```

2. Deploy to Firebase Hosting:
```bash
firebase deploy
```

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/network-request-failed)"**
   - Check your internet connection
   - Verify Firebase project is active
   - Check if you're using the correct API key

2. **"Firebase: Error (auth/invalid-api-key)"**
   - Verify your API key in .env.local
   - Make sure the key matches your Firebase project

3. **"Firebase: Error (firestore/permission-denied)"**
   - Check your Firestore security rules
   - Verify user authentication status

4. **"Firebase: Error (auth/user-not-found)"**
   - User account doesn't exist
   - Check if you're using the correct email

### Debug Mode

Enable debug logging by adding this to your browser console:
```javascript
localStorage.setItem('firebase:debug', '*');
```

## Security Best Practices

1. **Never commit .env.local to version control**
2. **Use environment-specific Firebase projects** (dev/staging/prod)
3. **Regularly review and update security rules**
4. **Monitor Firebase usage and costs**
5. **Enable Firebase App Check for production**

## Support

If you encounter issues:
1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review [Firebase Console](https://console.firebase.google.com/) for errors
3. Check the browser console for detailed error messages
4. Verify your Firebase project configuration

## Next Steps

Once Firebase is set up:
1. Test user registration and authentication
2. Verify data persistence across sessions
3. Test real-time updates
4. Set up backup and monitoring
5. Configure production environment

