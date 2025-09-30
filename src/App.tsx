import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { emotionCache } from './emotion-setup';
import WaitlistLandingPage from './pages/WaitlistLandingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import BetaDashboardPage from './pages/beta/BetaDashboardPage';

function App() {
  return (
    <CacheProvider value={emotionCache}>
      <ChakraProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WaitlistLandingPage />} />
            <Route path="/waitlist" element={<WaitlistLandingPage />} />
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
      </ChakraProvider>
    </CacheProvider>
  );
}

export default App;
