import React, { Suspense } from 'react';
import { ChakraProvider, Center, Spinner } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { emotionCache } from './emotion-setup';
import WaitlistLandingPage from './pages/WaitlistLandingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import BetaDashboardPage from './pages/beta/BetaDashboardPage';
import BaseErrorBoundary from '@components/ErrorBoundary/BaseErrorBoundary';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
const MainDashboard = React.lazy(() => import('@/pages/dashboard/MainDashboard'));
const AIBrainDashboard = React.lazy(() => import('@components/AIBrain/AIBrainDashboard'));
const PracticePlanner = React.lazy(() => import('@components/PracticePlanner/ModernPracticePlanner'));
const PlaybookDesigner = React.lazy(() => import('@components/Playbook/PlaybookDesigner'));
const AnalyticsDashboard = React.lazy(() => import('@components/analytics/AnalyticsDashboard'));

const RouteLoader = () => (
  <Center minH="60vh">
    <Spinner size="lg" thickness="4px" color="blue.400" speed="0.75s" />
  </Center>
);

function App() {
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
              <Route
                path="/dashboard/ai-brain"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <AIBrainDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/practice-planner"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <PracticePlanner />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/playbook"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <PlaybookDesigner />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/analytics"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <AnalyticsDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/beta/dashboard"
                element={
                  <ProtectedRoute>
                    <BetaDashboardPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </BaseErrorBoundary>
      </ChakraProvider>
    </CacheProvider>
  );
}

export default App;
