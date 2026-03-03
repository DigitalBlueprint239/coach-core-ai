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
const RecruitingLayout = React.lazy(() => import('@/pages/recruiting/RecruitingLayout'));
const RecruitingHubHomePage = React.lazy(() => import('@/pages/recruiting/RecruitingHubHomePage'));
const RecruitingProfilePage = React.lazy(() => import('@/pages/recruiting/RecruitingProfilePage'));
const RecruitingHighlightsPage = React.lazy(() => import('@/pages/recruiting/RecruitingHighlightsPage'));
const RecruitingOpportunitiesPage = React.lazy(() => import('@/pages/recruiting/RecruitingOpportunitiesPage'));
const RecruitingDiscoverPage = React.lazy(() => import('@/pages/recruiting/RecruitingDiscoverPage'));
const RecruitingAthleteDetailPage = React.lazy(() => import('@/pages/recruiting/RecruitingAthleteDetailPage'));
const ProgramPortalPage = React.lazy(() => import('@/pages/recruiting/ProgramPortalPage'));
const PublicAthleteProfilePage = React.lazy(() => import('@/pages/recruiting/PublicAthleteProfilePage'));

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
                path="/recruiting"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <RecruitingLayout />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <RecruitingHubHomePage />
                    </Suspense>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <RecruitingProfilePage />
                    </Suspense>
                  }
                />
                <Route
                  path="highlights"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <RecruitingHighlightsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="opportunities"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <RecruitingOpportunitiesPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route
                path="/discover"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <RecruitingDiscoverPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/athletes/:id"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <RecruitingAthleteDetailPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programs/portal"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <ProgramPortalPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/u/:handle"
                element={
                  <Suspense fallback={<RouteLoader />}>
                    <PublicAthleteProfilePage />
                  </Suspense>
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
