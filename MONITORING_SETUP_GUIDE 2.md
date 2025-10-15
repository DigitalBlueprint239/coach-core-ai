# 📊 Monitoring & Error Tracking Setup Guide

## Overview

Coach Core AI includes comprehensive monitoring and error tracking using Sentry and Firebase Performance Monitoring. This guide will help you set up production-ready monitoring.

## 🔧 Sentry Setup

### 1. Create Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up for a free account
3. Create a new React project
4. Copy your DSN (Data Source Name)

### 2. Configure Environment Variables

Add to your `.env.local` file:

```bash
# Sentry Configuration
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_APP_VERSION=1.0.0
```

### 3. Production Configuration

For production deployment, add to your environment:

```bash
# Production Sentry DSN
VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
VITE_APP_VERSION=1.0.0
```

## 🚀 Firebase Performance Monitoring

### 1. Enable Performance Monitoring

Firebase Performance Monitoring is automatically enabled in production. No additional configuration needed.

### 2. View Performance Data

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Performance** tab
4. View real-time performance metrics

## 📈 What's Being Tracked

### Sentry Error Tracking

- **React Errors**: All unhandled exceptions
- **User Actions**: Login, signup, waitlist, play creation
- **API Errors**: Failed requests and responses
- **User Context**: User ID, email, team information
- **Breadcrumbs**: Step-by-step user journey

### Firebase Performance Monitoring

- **Page Load Times**: Initial page loads and navigation
- **API Performance**: Request/response times
- **User Interactions**: Button clicks and form submissions
- **Custom Traces**: Component render times
- **Network Performance**: CDN and API response times

## 🎯 Tracked User Actions

### Authentication
- `login_attempt` - User attempts to log in
- `login_success` - Successful login
- `login_error` - Login failures
- `signup_attempt` - User attempts to sign up
- `signup_success` - Successful signup
- `signup_error` - Signup failures

### Waitlist
- `waitlist_submit_attempt` - User submits email to waitlist
- `waitlist_submit_success` - Successful waitlist submission
- `waitlist_submit_error` - Waitlist submission failures

### Play Management
- `play_created` - User creates a new play
- `play_created_success` - Successful play creation
- `play_created_error` - Play creation failures

### Navigation
- `page_navigation` - User navigates between pages
- `component_render` - Component render performance

## 🔍 Monitoring Dashboard

### Sentry Dashboard

1. **Issues**: View all errors and exceptions
2. **Performance**: Track page load times and user interactions
3. **Releases**: Monitor deployment health
4. **Alerts**: Set up notifications for critical errors

### Firebase Console

1. **Performance**: Real-time performance metrics
2. **Crashlytics**: Crash reports and stability
3. **Analytics**: User behavior and engagement

## 🚨 Alert Configuration

### Sentry Alerts

Set up alerts for:
- New errors in production
- Error rate spikes
- Performance degradation
- User impact thresholds

### Firebase Alerts

Configure alerts for:
- App crashes
- Performance issues
- Network problems
- User experience degradation

## 📊 Performance Metrics

### Key Metrics Tracked

- **First Contentful Paint (FCP)**: Time to first content
- **Largest Contentful Paint (LCP)**: Time to largest content
- **First Input Delay (FID)**: Time to first user interaction
- **Cumulative Layout Shift (CLS)**: Visual stability
- **Time to Interactive (TTI)**: Time to full interactivity

### Custom Metrics

- **Page Load Time**: Custom page load tracking
- **API Response Time**: Backend performance
- **User Action Time**: Specific action performance
- **Component Render Time**: React component performance

## 🔧 Development vs Production

### Development Mode
- Sentry disabled (no DSN provided)
- Firebase Performance disabled
- Console logging enabled
- Debug information available

### Production Mode
- Sentry fully enabled
- Firebase Performance active
- Error reporting to Sentry
- Performance data to Firebase

## 🛠️ Troubleshooting

### Common Issues

1. **Sentry Not Initializing**
   - Check DSN format
   - Verify environment variables
   - Check console for initialization errors

2. **Performance Data Missing**
   - Ensure production environment
   - Check Firebase project configuration
   - Verify Performance Monitoring is enabled

3. **Too Many Events**
   - Adjust sampling rates in configuration
   - Filter out non-critical errors
   - Optimize breadcrumb logging

### Debug Commands

```bash
# Check environment variables
echo $VITE_SENTRY_DSN

# Test Sentry configuration
npm run build
# Check console for Sentry initialization

# Test Firebase Performance
# Deploy to production and check Firebase Console
```

## 📚 Additional Resources

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
- [Error Boundary Best Practices](https://reactjs.org/docs/error-boundaries.html)
- [Performance Monitoring Guide](https://web.dev/vitals/)

## 🎉 Success!

Once configured, you'll have:

- ✅ **Real-time Error Tracking**: Know about issues immediately
- ✅ **Performance Monitoring**: Track app performance continuously
- ✅ **User Journey Tracking**: Understand user behavior
- ✅ **Production Alerts**: Get notified of critical issues
- ✅ **Data-driven Decisions**: Make informed improvements

Your Coach Core AI app is now fully monitored and ready for production! 🚀

