# 🏈 Coach Core AI - MVP Production Ready

## 🎯 Overview

Coach Core AI is a comprehensive coaching platform that combines AI-powered play generation, practice planning, team management, and real-time collaboration tools. The MVP is now production-ready with a clean, optimized codebase.

## 🗂️ Documentation Navigation
- **Play Export Spec:** `docs/PlayExportSpec.md` – Rendering requirements, metadata schema, and test plan.
- **Investor Materials:** `docs/InvestorMemo.md`, `docs/PitchOutline.md` – Fundraising narrative and slide blueprint.
- **Operational Guides:** `docs/Runbooks.md`, `docs/ComplianceChecklist.md` – Incident response, rollback, and privacy compliance status.
- **Execution Plans:** `docs/30-60-90.md`, `docs/NextSteps.md` – Milestone tracking and weekly action items.
- **Additional Context:** Explore `/docs` for feature specs, backlog references, and GTM artifacts aligned with the roadmap.

_Tip:_ Each document ends with actionable checklists to convert directly into tickets.

## ⚙️ Quickstart for Developers
1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Bootstrap Local Environment**
   ```bash
   cp env.example .env.local
   npm run firebase:emulators
   ```
3. **Run Quality Gates**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
4. **Launch Web & Mobile Clients**
   ```bash
   npm run dev          # Web
   npm run mobile:start # Expo mobile
   ```
5. **Explore Docs**
   - Review `docs/PlayExportSpec.md` before working on export features.
   - Follow `docs/Runbooks.md` for incident handling and rollbacks.

## 💼 Quickstart for Founders & Investors
1. Read `docs/InvestorMemo.md` for the one-page narrative and key metrics snapshot.
2. Use `docs/PitchOutline.md` to spin up updated pitch decks (sections aligned to Phase roadmap).
3. Confirm compliance posture in `docs/ComplianceChecklist.md` before external conversations.
4. Reference `docs/30-60-90.md` and `docs/NextSteps.md` for execution status during board updates.

## 📊 Build Stats

- **Bundle Size**: 522.74 kB (gzipped: 122.70 kB)
- **Build Time**: 4m 4s
- **Total Files**: 185 (97% reduction from 6,631)
- **Components**: 72 files
- **Services**: 38 files
- **Build Status**: ✅ Production Ready

## 🚀 MVP Features

### Core Functionality
- ✅ **Complete Data Persistence** - Firebase Firestore integration
- ✅ **Real-time Synchronization** - Multi-coach collaboration
- ✅ **Offline-First Architecture** - Works without internet
- ✅ **Conflict Resolution** - Intelligent data conflict handling
- ✅ **Performance Monitoring** - Real-time metrics and optimization

### AI-Powered Tools
- ✅ **AI Play Generation** - Custom play creation with AI assistance
- ✅ **Practice Planning** - Intelligent practice session planning
- ✅ **Team Analysis** - AI-powered team performance insights
- ✅ **Smart Suggestions** - Context-aware recommendations

### Team Management
- ✅ **Player Management** - Complete roster management
- ✅ **Attendance Tracking** - Practice and game attendance
- ✅ **Game Management** - Schedule and track games
- ✅ **Performance Analytics** - Team and individual statistics

### User Experience
- ✅ **Responsive Design** - Mobile and desktop optimized
- ✅ **Modern UI** - Chakra UI with custom components
- ✅ **Loading States** - Smooth user experience
- ✅ **Error Handling** - Graceful error management

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase CLI
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/DigitalBlueprint239/coach-core-ai.git
cd coach-core-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase and API keys

# Start development server
npm run dev
```

### Building for Production
```bash
# Build the application
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Testing

#### Unit Tests
```bash
# Run unit tests
npm test

# Run linting
npm run lint

# Analyze bundle
npm run analyze:bundle
```

#### E2E Tests (Cypress)

##### Local Testing
```bash
# Run E2E tests locally
npm run test:e2e

# Open Cypress Test Runner
npm run test:e2e:open

# Run tests against staging
npm run test:e2e:staging

# Run tests against production
npm run test:e2e:production
```

##### Test Coverage
Our E2E tests verify:
- ✅ **App Loading**: App loads without errors on staging/production
- ✅ **Waitlist Form**: Accepts valid emails and stores in Firestore
- ✅ **Routing**: Dashboard, Team, Practice Planner routes load correctly
- ✅ **Performance**: Pages load within performance thresholds
- ✅ **Error Handling**: Graceful error handling and user feedback

##### Test Scripts
```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headless mode
npm run test:e2e:headless

# Run tests in specific browsers
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:edge

# Run tests against specific environments
npm run test:e2e:staging
npm run test:e2e:production
```

##### GitHub Actions Integration
- **Pull Requests**: E2E tests run automatically on PRs
- **Main Branch**: Tests run against production before deployment
- **Staging Branch**: Tests run against staging before deployment
- **Test Artifacts**: Screenshots and videos uploaded on failure

## 📊 Analytics & Tracking

### Google Analytics Integration

Coach Core AI includes comprehensive Google Analytics tracking for user behavior, conversions, and performance monitoring.

#### Features
- ✅ **Environment-aware**: Only runs in production
- ✅ **Waitlist Tracking**: Signup attempts, successes, and errors
- ✅ **Navigation Tracking**: Page views and route changes
- ✅ **User Authentication**: Login, signup, and logout events
- ✅ **Performance Monitoring**: Page load times and component render times
- ✅ **Error Tracking**: Application and API errors
- ✅ **Conversion Tracking**: Waitlist signups and user onboarding

#### Setup

1. **Get Google Analytics Measurement ID**:
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new property for your app
   - Copy the Measurement ID (format: `G-XXXXXXXXXX`)

2. **Configure Environment Variables**:
   ```bash
   # Development (.env.local)
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   VITE_ENABLE_ANALYTICS=true
   VITE_ENVIRONMENT=development
   
   # Production (.env.production)
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   VITE_ENABLE_ANALYTICS=true
   VITE_ENVIRONMENT=production
   ```

3. **Deploy with Analytics**:
   ```bash
   # Analytics will automatically be enabled in production
   npm run build
   firebase deploy
   ```

#### Tracked Events

##### Waitlist Events
- `waitlist_signup`: User attempts to join waitlist
- `waitlist_signup_success`: Successful waitlist signup
- `waitlist_signup_error`: Failed waitlist signup
- `waitlist_conversion`: Conversion event for waitlist signup

##### Navigation Events
- `page_navigation`: Page view tracking
- `route_change`: Route transitions
- `page_load_time`: Performance tracking

##### Authentication Events
- `login`: User login (email/Google)
- `logout`: User logout
- `signup`: User registration

##### Performance Events
- `page_load_time`: Page load performance
- `component_render_time`: Component render performance

##### Error Events
- `app_error`: Application errors
- `api_error`: API request errors

#### Analytics Service Usage

```typescript
import { 
  trackPageNavigation, 
  trackEvent, 
  setUserContext,
  useAnalytics 
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

// Use in React components
const { trackInteraction, trackError } = useAnalytics();
```

#### Privacy & Compliance

- **GDPR Compliant**: Analytics only runs in production
- **No Personal Data**: Email domains are tracked, not full emails
- **User Consent**: Analytics can be disabled via environment variable
- **Data Retention**: Follows Google Analytics data retention policies

## 🔧 Git Hooks

This project uses Husky to manage Git hooks that ensure code quality and prevent broken deployments.

### Pre-Push Hook

The pre-push hook automatically runs before every `git push` to ensure:

1. **Dependencies are installed** - Runs `npm install`
2. **Build succeeds** - Runs `npm run build` 
3. **Deployment verification** - Runs `./deploy.sh --fast`

If any step fails, the push is blocked to prevent broken code from reaching the repository.

### Hook Management

```bash
# The hook is automatically installed when you run:
npm install

# To manually run the pre-push checks:
.husky/pre-push

# To bypass the hook (not recommended):
git push --no-verify
```

### Fast Mode Deployment

The `deploy.sh` script supports a `--fast` flag for use in Git hooks:

```bash
# Fast mode - skips testing and actual deployment
./deploy.sh --fast

# Full mode - includes testing and deployment
./deploy.sh
```

## 🚀 Deployment

### Multi-Environment Deployment

This project supports both staging and production deployments with separate Firebase hosting targets:

#### 🌐 Environments

- **Production**: `https://coach-core-ai.web.app` (main branch)
- **Staging**: `https://coach-core-ai-staging.web.app` (staging branch)

#### 🚀 GitHub Actions (Recommended)

Automated deployment based on branch:

- **Push to `main`** → Deploys to **Production**
- **Push to `staging`** → Deploys to **Staging**
- ✅ **Automatic Build**: Runs `npm ci` and `npm run build`
- ✅ **Deployment Verification**: Runs `./deploy.sh --fast`
- ✅ **Firebase Deploy**: Automatically deploys to correct environment
- ✅ **Caching**: Optimized with Node.js and npm caching
- ✅ **Error Handling**: Fails fast if build or deploy fails

#### Required GitHub Secrets

To enable automated deployment, add this secret to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add: `FIREBASE_TOKEN` with your Firebase CLI token

**Get your Firebase token:**
```bash
# Generate Firebase token
firebase login:ci

# Copy the token and add it as FIREBASE_TOKEN secret
```

### Manual Deployment

#### Using Deploy Script (Recommended)
```bash
# Deploy to production
./deploy.sh --env=prod

# Deploy to staging
./deploy.sh --env=staging

# Fast deployment (build verification only)
./deploy.sh --fast --env=staging
./deploy.sh --fast --env=prod
```

#### Direct Firebase CLI
```bash
# Deploy to production
firebase deploy --only hosting:coach-core-ai-prod

# Deploy to staging
firebase deploy --only hosting:coach-core-ai-staging

# Deploy with force (clear cache)
firebase deploy --only hosting:coach-core-ai-prod --force
```

### Environment Configuration
- **Development**: `.env.local`
- **Production**: `.env.production`
- **Firebase**: `firebase.json`

## 📁 Project Structure

```
src/
├── components/          # React components (72 files)
│   ├── AI/             # AI-powered components
│   ├── Dashboard/      # Dashboard components
│   ├── GameManagement/ # Game management
│   ├── Team/           # Team management
│   └── ...
├── services/           # Business logic (38 files)
│   ├── ai/            # AI services
│   ├── data/          # Data persistence
│   ├── firebase/      # Firebase integration
│   └── ...
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
└── utils/              # Utility functions
```

## 🔧 Technical Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Library**: Chakra UI
- **Backend**: Firebase (Firestore, Auth, Functions)
- **AI**: OpenAI, Claude, Gemini integration
- **State Management**: React Context, Zustand
- **Build Tool**: Vite with optimizations
- **Deployment**: Firebase Hosting

## 📈 Performance Optimizations

- **Code Splitting**: Lazy loading for optimal bundle size
- **Tree Shaking**: Removed unused code
- **Bundle Analysis**: Continuous optimization monitoring
- **Caching**: Offline-first data persistence
- **Compression**: Gzip and Brotli compression

## 🔒 Security

- **Authentication**: Firebase Auth with secure tokens
- **Data Validation**: TypeScript strict mode
- **Environment Variables**: Secure configuration management
- **CORS**: Proper cross-origin resource sharing

## 📊 Monitoring & Error Tracking

### Sentry Integration

This project includes comprehensive error monitoring and performance tracking:

- **Error Boundary**: Catches React errors and displays user-friendly fallback
- **Breadcrumb Tracking**: Logs key user actions (login, signup, waitlist, play creation)
- **User Context**: Associates errors with user information
- **Performance Monitoring**: Tracks page loads and user interactions
- **Production Only**: Sentry only initializes when DSN is provided

### Firebase Performance Monitoring

- **Automatic Tracking**: Page loads, API calls, and user interactions
- **Custom Traces**: Track specific user actions and component renders
- **Production Only**: Performance monitoring only enabled in production
- **Real-time Metrics**: Monitor app performance in Firebase Console

### Setup Instructions

1. **Get Sentry DSN**:
   ```bash
   # Sign up at https://sentry.io
   # Create a new React project
   # Copy your DSN
   ```

2. **Configure Environment**:
   ```bash
   # Add to .env.local
   VITE_SENTRY_DSN=your_sentry_dsn_here
   VITE_APP_VERSION=1.0.0
   ```

3. **Deploy with Monitoring**:
   ```bash
   # Sentry will automatically initialize in production
   ./deploy.sh
   ```

### Tracked User Actions

- ✅ **Authentication**: Login attempts, signup, logout
- ✅ **Waitlist**: Email submissions and errors
- ✅ **Play Creation**: Game play tracking
- ✅ **Navigation**: Page transitions
- ✅ **API Calls**: Request/response tracking
- ✅ **Errors**: All exceptions with context
- **Rate Limiting**: API request throttling

## 📝 API Documentation

### Firebase Collections
- `users` - User profiles and preferences
- `teams` - Team information and settings
- `players` - Player data and statistics
- `practices` - Practice plans and sessions
- `games` - Game schedules and results
- `plays` - Play library and custom plays

### AI Services
- **Play Generation**: Create custom plays with AI
- **Practice Planning**: Generate practice sessions
- **Team Analysis**: Analyze team performance
- **Smart Suggestions**: Context-aware recommendations

## 🐛 Troubleshooting

### Common Issues
1. **Build Errors**: Check TypeScript compilation
2. **Firebase Connection**: Verify environment variables
3. **AI Services**: Ensure API keys are configured
4. **Performance**: Run bundle analysis

### Debug Mode
```bash
# Enable debug logging
DEBUG=true npm run dev

# Analyze bundle
npm run analyze:bundle
```

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/DigitalBlueprint239/coach-core-ai/wiki)
- **Issues**: [GitHub Issues](https://github.com/DigitalBlueprint239/coach-core-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DigitalBlueprint239/coach-core-ai/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- **Chakra UI** for the component library
- **Firebase** for backend services
- **OpenAI/Claude** for AI capabilities
- **Vite** for build optimization

---

**Version**: v1.0.0-mvp-clean  
**Last Updated**: December 2024  
**Status**: Production Ready ✅
