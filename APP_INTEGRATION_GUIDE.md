# Coach Core AI – Application Integration Guide

## 1. Application Shell
```tsx
// src/App.tsx
import React, { Suspense } from 'react';
import { ChakraProvider, Center, Spinner } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { emotionCache } from './emotion-setup';
import BaseErrorBoundary from '@components/ErrorBoundary/BaseErrorBoundary';
import ProtectedRoute from '@components/Auth/ProtectedRoute';
import WaitlistLandingPage from '@/pages/WaitlistLandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
const MainDashboard = React.lazy(() => import('@/pages/dashboard/MainDashboard'));

const RouteLoader = () => (
  <Center minH="60vh">
    <Spinner size="lg" thickness="4px" color="blue.400" />
  </Center>
);

export default function App() {
  return (
    <CacheProvider value={emotionCache}>
      <ChakraProvider>
        <BaseErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<WaitlistLandingPage />} />
              <Route path="/waitlist" element={<WaitlistLandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <MainDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* ...additional routes omitted for brevity */}
            </Routes>
          </BrowserRouter>
        </BaseErrorBoundary>
      </ChakraProvider>
    </CacheProvider>
  );
}
```

## 2. Routes to Verify After Deployment
| Route | Component | Notes |
| ----- | --------- | ----- |
| `/login` | `LoginPage` | Email + Google sign-in, post-login redirect. |
| `/signup` | `SignupPage` | Email signup with validation and password strength. |
| `/dashboard` | `MainDashboard` | Feature hub linking to AI Brain, Planner, Playbook, Analytics. |
| `/dashboard/ai-brain` | `AIBrainDashboard` | Heavy module; loads lazily inside `ProtectedRoute`. |
| `/dashboard/practice-planner` | `ModernPracticePlanner` | Ensure waitlist data loads without console errors. |
| `/dashboard/playbook` | `PlaybookDesigner` | Validate drag-and-drop functionality. |
| `/dashboard/analytics` | `AnalyticsDashboard` | Requires analytics env vars for live data. |
| `/admin` | `AdminDashboard` | Restricted; visible to users with `profile.role === 'admin'`. |

## 3. Authentication Flow Validation
1. Visit `/login` and submit valid credentials. Expect redirect to `/dashboard` or the intercepted protected route.
2. Trigger Google sign-in and confirm Firebase user + profile hydration succeeds.
3. Test `/signup` to create a new account; confirm toast success and automatic redirect.
4. Attempt to open `/dashboard` while unauthenticated; you should be redirected back to `/login` with location state preserved.
5. Call `authService.signOut()` (e.g., from forthcoming nav menu) and ensure session is cleared.

## 4. Troubleshooting
- **Infinite redirect to `/login`**: Confirm `AuthProvider` wraps `<App />` in `src/index.tsx` and that Firebase credentials are valid.
- **Google popup blocked**: Browsers block popups from async callbacks; ensure the button click calls `authService.signInWithGoogle()` directly.
- **ProtectedRoute blank screen**: The Chakra spinner now renders during auth resolution; if it stalls, inspect Firebase emulator/production credentials.
- **Build crashes with missing env vars**: `src/utils/env-validator.ts` throws descriptive errors—populate `.env.local` / `.env.production` accordingly.

## 5. Post-integration Checklist
- Run `npx tsc --noEmit --skipLibCheck` and `npm run build`.
- Populate `.env.local` using `.env.example` and restart the dev server.
- Update Firebase config (`firebase-config.ts`) to load values from the validated `env` export.
- Replace any remaining `process.env.REACT_APP_*` references with `import.meta.env.VITE_*`.
- Execute `deploy-secure.sh` instead of `npm run deploy:production` to avoid reintroducing secrets.

## 6. Next Steps
- Wire navigation or header actions to sign out and surface the dashboard routes.
- Add integration tests (Cypress/Vitest) that cover login, signup, and dashboard navigation.
- Review `SECURITY_CHECKLIST.md` for outstanding security tasks and coordinate with DevOps for secret management.
