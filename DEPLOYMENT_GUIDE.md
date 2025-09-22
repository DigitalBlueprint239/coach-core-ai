# 🚀 Play Designer Integration - Deployment Guide

## 📋 **Prerequisites**

Before deploying, ensure you have:

- ✅ Node.js 16+ installed
- ✅ Firebase project set up
- ✅ OpenAI API key (optional, for AI features)
- ✅ Git repository configured

## 🔧 **Step 1: Environment Configuration**

Create a `.env.local` file in your project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# OpenAI Configuration (for AI features)
VITE_OPENAI_API_KEY=your-openai-api-key

# App Configuration
VITE_APP_NAME="Coach Core AI"
VITE_APP_VERSION="1.0.0"
VITE_APP_ENVIRONMENT="production"

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_COLLABORATION=true
```

## 🔥 **Step 2: Firebase Setup**

### 2.1 Initialize Firebase (if not already done)

```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 2.2 Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 2.3 Enable Authentication

1. Go to Firebase Console → Authentication
2. Enable Email/Password authentication
3. Add your domain to authorized domains

### 2.4 Create Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

## 📦 **Step 3: Install Dependencies**

```bash
# Core dependencies
npm install

# Additional dependencies for Play Designer
npm install framer-motion react-spring lucide-react

# Development dependencies
npm install -D @types/node
```

## 🧪 **Step 4: Test the Integration**

### 4.1 Start Development Server

```bash
npm run dev
```

### 4.2 Test Play Designer Features

1. Navigate to the Play Designer (click "Play Designer" in navigation)
2. Test canvas rendering
3. Test player drag-and-drop
4. Test route drawing
5. Test save functionality
6. Test AI suggestions (if configured)

### 4.3 Run Test Suite

```bash
npm run test
```

## 🚀 **Step 5: Production Deployment**

### 5.1 Build for Production

```bash
npm run build
```

### 5.2 Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### 5.3 Deploy to Vercel (Alternative)

```bash
npm install -g vercel
vercel --prod
```

## 🔒 **Step 6: Security Configuration**

### 6.1 Update Firebase Security Rules

Ensure your `firestore.rules` file is deployed:

```bash
firebase deploy --only firestore:rules
```

### 6.2 Configure CORS (if needed)

Add to your `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      }
    ]
  }
}
```

## 📊 **Step 7: Analytics Setup**

### 7.1 Google Analytics (Optional)

Add to your `.env.local`:

```bash
VITE_GOOGLE_ANALYTICS_ID=your-ga-id
```

### 7.2 Firebase Analytics

Enable in Firebase Console → Analytics

## 🔧 **Step 8: Performance Optimization**

### 8.1 Enable Compression

Add to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@chakra-ui/react'],
          canvas: ['framer-motion']
        }
      }
    }
  }
});
```

### 8.2 Enable Caching

Add to your `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "/static/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

## 🧪 **Step 9: Testing Checklist**

### 9.1 Core Functionality

- [ ] Canvas renders properly
- [ ] Players can be dragged and dropped
- [ ] Routes can be drawn
- [ ] Save functionality works
- [ ] Load functionality works
- [ ] Undo/redo works

### 9.2 AI Features

- [ ] AI suggestions load
- [ ] Defense analysis works
- [ ] Route optimization works
- [ ] Play name generation works

### 9.3 Mobile Experience

- [ ] Touch gestures work
- [ ] Responsive design
- [ ] Performance on mobile devices

### 9.4 Data Persistence

- [ ] Plays save to Firebase
- [ ] Plays load from Firebase
- [ ] User authentication works
- [ ] Data security rules enforced

## 🚨 **Step 10: Troubleshooting**

### 10.1 Common Issues

**Canvas not rendering:**
- Check browser console for errors
- Ensure all dependencies are installed
- Verify canvas context is available

**AI features not working:**
- Check OpenAI API key configuration
- Verify API quota and limits
- Check network connectivity

**Firebase connection issues:**
- Verify Firebase configuration
- Check authentication setup
- Ensure Firestore rules are deployed

**Performance issues:**
- Enable compression
- Optimize bundle size
- Use lazy loading for components

### 10.2 Debug Mode

Enable debug mode in `.env.local`:

```bash
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

## 📈 **Step 11: Monitoring**

### 11.1 Performance Monitoring

- Set up Firebase Performance Monitoring
- Monitor Core Web Vitals
- Track user interactions

### 11.2 Error Tracking

- Set up Sentry or similar error tracking
- Monitor console errors
- Track API failures

### 11.3 Usage Analytics

- Track feature usage
- Monitor user engagement
- Analyze performance metrics

## 🔄 **Step 12: Maintenance**

### 12.1 Regular Updates

- Update dependencies monthly
- Monitor security advisories
- Keep Firebase SDK updated

### 12.2 Backup Strategy

- Regular database backups
- Version control for configurations
- Document deployment procedures

## ✅ **Deployment Complete!**

Your Play Designer is now fully integrated and deployed with:

- ✅ Optimized canvas rendering
- ✅ Interactive drag-and-drop
- ✅ AI-powered suggestions
- ✅ Firebase backend integration
- ✅ Mobile optimization
- ✅ Security rules
- ✅ Performance optimization

## 🎯 **Next Steps**

1. **Monitor Performance**: Track usage and performance metrics
2. **Gather Feedback**: Collect user feedback and iterate
3. **Add Features**: Implement additional features based on user needs
4. **Scale**: Optimize for larger user bases as needed

---

**Your Play Designer is now ready for production use! 🏈** 