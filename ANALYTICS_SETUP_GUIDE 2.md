# 📊 Analytics Setup Guide

## Overview

Coach Core AI includes comprehensive Google Analytics integration for tracking user behavior, conversions, and performance. This guide covers setup, configuration, and usage.

## 🚀 Quick Setup

### 1. Get Google Analytics Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property for your app
3. Copy the Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Configure Environment Variables

#### Development Environment
```bash
# .env.local
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
VITE_ENVIRONMENT=development
```

#### Production Environment
```bash
# .env.production
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
VITE_ENVIRONMENT=production
```

### 3. Deploy with Analytics

```bash
# Analytics will automatically be enabled in production
npm run build
firebase deploy
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_GA_MEASUREMENT_ID` | Google Analytics Measurement ID | Yes | - |
| `VITE_ENABLE_ANALYTICS` | Enable/disable analytics | No | `true` |
| `VITE_ENVIRONMENT` | Environment (development/production) | No | `development` |

### Analytics Behavior

- **Development**: Analytics disabled by default (logs to console)
- **Production**: Analytics enabled with full tracking
- **Environment Check**: Only runs when `VITE_ENVIRONMENT=production`

## 📈 Tracked Events

### Waitlist Events

#### `waitlist_signup`
- **Trigger**: User attempts to join waitlist
- **Data**: Email domain, source, timestamp
- **Example**: `{ email_domain: "gmail.com", source: "landing-page" }`

#### `waitlist_signup_success`
- **Trigger**: Successful waitlist signup
- **Data**: Email domain, source, timestamp
- **Example**: `{ email_domain: "gmail.com", source: "landing-page" }`

#### `waitlist_signup_error`
- **Trigger**: Failed waitlist signup
- **Data**: Email domain, error message, source
- **Example**: `{ email_domain: "gmail.com", error: "Email already exists" }`

#### `waitlist_conversion`
- **Trigger**: Successful waitlist signup (conversion event)
- **Data**: Email domain, source, conversion value
- **Example**: `{ email_domain: "gmail.com", conversion_value: 1 }`

### Navigation Events

#### `page_navigation`
- **Trigger**: Page view
- **Data**: Page path, page title, timestamp
- **Example**: `{ page_path: "/dashboard", page_title: "Dashboard" }`

#### `route_change`
- **Trigger**: Route transition
- **Data**: From route, to route, timestamp
- **Example**: `{ from_route: "/", to_route: "/dashboard" }`

#### `page_load_time`
- **Trigger**: Page load performance
- **Data**: Page path, load time in ms
- **Example**: `{ page_path: "/dashboard", load_time: 1250 }`

### Authentication Events

#### `login`
- **Trigger**: User login
- **Data**: Login method, user ID
- **Example**: `{ login_method: "email", user_id: "user123" }`

#### `logout`
- **Trigger**: User logout
- **Data**: User ID
- **Example**: `{ user_id: "user123" }`

#### `signup`
- **Trigger**: User registration
- **Data**: Signup method, user ID, team ID
- **Example**: `{ signup_method: "email", user_id: "user123", team_id: "team456" }`

### Performance Events

#### `component_render_time`
- **Trigger**: Component render performance
- **Data**: Component name, render time in ms
- **Example**: `{ component_name: "Dashboard", render_time: 45 }`

### Error Events

#### `app_error`
- **Trigger**: Application error
- **Data**: Error message, component, action
- **Example**: `{ error_message: "Network error", component: "AuthService" }`

#### `api_error`
- **Trigger**: API request error
- **Data**: Endpoint, status code, error message
- **Example**: `{ endpoint: "/api/waitlist", status_code: 500 }`

## 🛠️ Usage

### Basic Analytics Service

```typescript
import { 
  trackPageNavigation, 
  trackEvent, 
  setUserContext,
  trackWaitlistSignup 
} from './services/analytics';

// Track page navigation
trackPageNavigation('/dashboard', 'Dashboard');

// Track custom events
trackEvent('button_click', {
  button_name: 'signup',
  location: 'header'
});

// Set user context
setUserContext(userId, userEmail, teamId, 'coach');
```

### React Hook Usage

```typescript
import { useAnalytics } from './services/analytics';

function MyComponent() {
  const { trackInteraction, trackError, isEnabled } = useAnalytics();

  const handleClick = () => {
    trackInteraction('button_click', {
      button_name: 'submit',
      component: 'MyComponent'
    });
  };

  const handleError = (error: Error) => {
    trackError(error, {
      component: 'MyComponent',
      action: 'handleClick'
    });
  };

  return (
    <button onClick={handleClick}>
      Click me
    </button>
  );
}
```

### Waitlist Integration

```typescript
import { waitlistService } from './services/waitlist/waitlist-service';

// Analytics are automatically tracked
const result = await waitlistService.addToWaitlist(email, {
  source: 'landing-page'
});
```

### Authentication Integration

```typescript
import { authService } from './services/firebase/auth-service';

// Analytics are automatically tracked
const { user, profile } = await authService.signIn(email, password);
```

## 📊 Google Analytics Dashboard

### Key Metrics to Monitor

1. **Waitlist Conversions**
   - Event: `waitlist_conversion`
   - Goal: Track signup success rate

2. **User Engagement**
   - Event: `page_navigation`
   - Goal: Monitor page views and user flow

3. **Authentication Success**
   - Event: `login`, `signup`
   - Goal: Track user acquisition

4. **Performance Issues**
   - Event: `page_load_time`, `component_render_time`
   - Goal: Identify performance bottlenecks

5. **Error Rates**
   - Event: `app_error`, `api_error`
   - Goal: Monitor application health

### Custom Dimensions

The analytics service sets up custom dimensions:

- `dimension1`: `user_type` (coach, admin, etc.)
- `dimension2`: `team_id` (user's team ID)
- `dimension3`: `environment` (production, staging)

### Custom Reports

Create custom reports in Google Analytics:

1. **Waitlist Performance**
   - Events: `waitlist_signup`, `waitlist_signup_success`, `waitlist_conversion`
   - Dimensions: `source`, `email_domain`

2. **User Journey**
   - Events: `page_navigation`, `route_change`
   - Dimensions: `page_path`, `from_route`, `to_route`

3. **Performance Monitoring**
   - Events: `page_load_time`, `component_render_time`
   - Metrics: Average load time, render time

## 🔒 Privacy & Compliance

### GDPR Compliance

- **User Consent**: Analytics can be disabled via environment variable
- **Data Minimization**: Only necessary data is tracked
- **No Personal Data**: Email domains are tracked, not full emails
- **Environment Control**: Analytics only runs in production

### Data Retention

- **Google Analytics**: Follows Google's data retention policies
- **Custom Events**: Stored in Google Analytics with standard retention
- **User Context**: Cleared on logout

### Privacy Controls

```typescript
// Disable analytics for specific users
if (user.privacySettings.analytics === false) {
  // Analytics will not track this user
}

// Clear user data on logout
clearUserContext();
```

## 🐛 Debugging

### Development Mode

In development, analytics events are logged to console:

```javascript
// Console output in development
Analytics: Page view - /dashboard (not tracked - not in production)
Analytics: Event - button_click (not tracked - not in production) { button_name: 'signup' }
```

### Production Debugging

1. **Google Analytics Debug View**
   - Use Google Analytics Real-time reports
   - Check Events section for custom events

2. **Browser DevTools**
   - Check Network tab for Google Analytics requests
   - Look for `gtag` calls

3. **Console Logging**
   - Analytics events are logged in production
   - Check browser console for analytics logs

### Common Issues

#### Analytics Not Working
- Check `VITE_ENVIRONMENT=production`
- Verify `VITE_GA_MEASUREMENT_ID` is set
- Ensure `VITE_ENABLE_ANALYTICS=true`

#### Events Not Appearing
- Check Google Analytics Real-time reports
- Verify event names and parameters
- Check browser console for errors

#### Performance Impact
- Analytics runs asynchronously
- No blocking operations
- Minimal performance impact

## 📚 Advanced Configuration

### Custom Event Tracking

```typescript
import { trackEvent, EVENT_CATEGORIES } from './services/analytics';

// Track custom business events
trackEvent('feature_usage', {
  event_category: EVENT_CATEGORIES.USER,
  event_label: 'playbook_created',
  feature_name: 'playbook',
  action: 'create'
});
```

### Performance Monitoring

```typescript
import { trackPageLoadTime, trackComponentRenderTime } from './services/analytics';

// Track page performance
const startTime = performance.now();
// ... page load logic
const loadTime = performance.now() - startTime;
trackPageLoadTime('/dashboard', loadTime);

// Track component performance
const renderStart = performance.now();
// ... component render
const renderTime = performance.now() - renderStart;
trackComponentRenderTime('Dashboard', renderTime);
```

### Error Tracking

```typescript
import { trackAppError, trackApiError } from './services/analytics';

// Track application errors
try {
  // ... risky operation
} catch (error) {
  trackAppError(error, {
    component: 'AuthService',
    action: 'signIn'
  });
}

// Track API errors
fetch('/api/data')
  .then(response => {
    if (!response.ok) {
      trackApiError('/api/data', response.status, 'API request failed');
    }
  });
```

## 🎉 Success!

With Google Analytics fully integrated, you now have:

- ✅ **Complete User Tracking**: Page views, navigation, and interactions
- ✅ **Conversion Monitoring**: Waitlist signups and user onboarding
- ✅ **Performance Insights**: Load times and component performance
- ✅ **Error Monitoring**: Application and API error tracking
- ✅ **Privacy Compliance**: GDPR-compliant data collection
- ✅ **Environment Control**: Production-only analytics
- ✅ **Custom Events**: Business-specific event tracking

Your Coach Core AI application now has enterprise-grade analytics and tracking! 🚀

