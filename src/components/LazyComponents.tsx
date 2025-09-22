import React, { lazy } from 'react';
import { createLazyComponent } from './LazyWrapper';

// Fallback components (defined first to avoid hoisting issues)
function LazyPageFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p style={{ color: '#666', fontSize: '14px' }}>Loading page...</p>
      </div>
    </div>
  );
}

function LazyPageErrorFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div style={{ 
        textAlign: 'center',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '400px'
      }}>
        <h3 style={{ color: '#c33', marginBottom: '1rem' }}>Failed to load page</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          There was an error loading this page. Please refresh or try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function LazyCanvasFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '500px',
      padding: '2rem',
      backgroundColor: '#f8f9fa',
      border: '2px dashed #dee2e6',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p style={{ color: '#666', fontSize: '14px' }}>Loading canvas editor...</p>
      </div>
    </div>
  );
}

function LazyCanvasErrorFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '500px',
      padding: '2rem',
      backgroundColor: '#fee',
      border: '2px solid #fcc',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: '#c33', marginBottom: '1rem' }}>Canvas failed to load</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          The canvas editor couldn't be loaded. This might be due to a network issue or browser compatibility.
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function LazyChartFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '300px',
      padding: '2rem',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '28px', 
          height: '28px', 
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p style={{ color: '#666', fontSize: '14px' }}>Loading charts...</p>
      </div>
    </div>
  );
}

function LazyChartErrorFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '300px',
      padding: '2rem',
      backgroundColor: '#fee',
      border: '1px solid #fcc',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: '#c33', marginBottom: '1rem' }}>Charts failed to load</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          The chart components couldn't be loaded. Please try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// Lazy load heavy components with appropriate fallbacks
export const LazyPlaybookDesigner = createLazyComponent(
  () => import('./Playbook/PlaybookDesigner'),
  <LazyCanvasFallback />,
  <LazyCanvasErrorFallback />
);

export const LazyModernPracticePlanner = createLazyComponent(
  () => import('./PracticePlanner/ModernPracticePlanner'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyTeamManagement = createLazyComponent(
  () => import('./Team/TeamManagement'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyAIPlayGenerator = createLazyComponent(
  () => import('./AI/AIPlayGenerator'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyAIBrainDashboard = createLazyComponent(
  () => import('./AIBrain/AIBrainDashboardOptimized'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyPerformanceDashboard = createLazyComponent(
  () => import('./Performance/PerformanceDashboard'),
  <LazyChartFallback />,
  <LazyChartErrorFallback />
);

export const LazyFeedbackDashboard = createLazyComponent(
  () => import('./Admin/FeedbackDashboard'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyEnhancedDemoMode = createLazyComponent(
  () => import('./Demo/EnhancedDemoMode'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyGameCalendar = createLazyComponent(
  () => import('./GameManagement/GameCalendar'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyBetaTestingDashboard = createLazyComponent(
  () => import('./beta/BetaTestingDashboard'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('./analytics/AnalyticsDashboard'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

// Beta Testing Components
export const LazyBetaEnrollmentForm = createLazyComponent(
  () => import('./beta/BetaEnrollmentForm'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyBetaFeedbackForm = createLazyComponent(
  () => import('./beta/BetaFeedbackForm'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

// Feature-Gated Components
export const LazyFeatureGatedPlayDesigner = createLazyComponent(
  () => import('./beta/FeatureGatedPlayDesigner'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazyFeatureGatedDashboard = createLazyComponent(
  () => import('./beta/FeatureGatedDashboard'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

// Subscription Components
export const LazyPricingPage = createLazyComponent(
  () => import('./pricing/PricingPage'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazySubscriptionManagement = createLazyComponent(
  () => import('./pricing/SubscriptionManagement'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

export const LazySubscriptionGatedPlayDesigner = createLazyComponent(
  () => import('./pricing/SubscriptionGatedPlayDesigner'),
  <LazyPageFallback />,
  <LazyPageErrorFallback />
);

// Canvas-specific lazy components
export const LazyFieldCanvas = createLazyComponent(
  () => import('./ui/FieldCanvas'),
  <LazyCanvasFallback />,
  <LazyCanvasErrorFallback />
);

export const LazyMobileRouteEditor = createLazyComponent(
  () => import('./ui/MobileRouteEditor'),
  <LazyCanvasFallback />,
  <LazyCanvasErrorFallback />
);

export const LazyPlayDesignerFunctional = createLazyComponent(
  () => import('./PlayDesigner/PlayDesignerFunctional'),
  <LazyCanvasFallback />,
  <LazyCanvasErrorFallback />
);

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);