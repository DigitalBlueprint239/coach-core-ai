// @ts-nocheck
import { getPerformance, trace, getTrace } from 'firebase/performance';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../firebase/firebase-config';

// Firebase Performance Monitoring configuration
export const initFirebasePerformance = () => {
  // Only initialize in production
  const environment = import.meta.env.MODE || 'development';
  
  if (environment !== 'production') {
    console.log('🔍 Firebase Performance not initialized - not in production');
    return null;
  }

  try {
    // Initialize Firebase app if not already initialized
    const app = initializeApp(firebaseConfig);
    const perf = getPerformance(app);
    
    console.log('✅ Firebase Performance initialized');
    return perf;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Performance:', error);
    return null;
  }
};

// Performance tracking utilities
export class PerformanceTracker {
  private static traces: Map<string, any> = new Map();

  // Start a custom trace
  static startTrace(traceName: string): void {
    try {
      const perf = getPerformance();
      if (perf) {
        const traceInstance = trace(perf, traceName);
        this.traces.set(traceName, traceInstance);
        console.log(`🚀 Started trace: ${traceName}`);
      }
    } catch (error) {
      console.error(`Failed to start trace ${traceName}:`, error);
    }
  }

  // Stop a custom trace
  static stopTrace(traceName: string): void {
    try {
      const traceInstance = this.traces.get(traceName);
      if (traceInstance) {
        traceInstance.stop();
        this.traces.delete(traceName);
        console.log(`✅ Stopped trace: ${traceName}`);
      }
    } catch (error) {
      console.error(`Failed to stop trace ${traceName}:`, error);
    }
  }

  // Track page load performance
  static trackPageLoad(pageName: string): void {
    this.startTrace(`page_load_${pageName}`);
    
    // Stop trace after a short delay to capture load time
    setTimeout(() => {
      this.stopTrace(`page_load_${pageName}`);
    }, 100);
  }

  // Track user action performance
  static trackUserAction(actionName: string): void {
    this.startTrace(`user_action_${actionName}`);
    
    // Stop trace after a short delay
    setTimeout(() => {
      this.stopTrace(`user_action_${actionName}`);
    }, 50);
  }

  // Track API call performance
  static trackApiCall(apiName: string): void {
    this.startTrace(`api_call_${apiName}`);
    
    return {
      stop: () => this.stopTrace(`api_call_${apiName}`)
    };
  }

  // Track component render performance
  static trackComponentRender(componentName: string): void {
    this.startTrace(`component_render_${componentName}`);
    
    return {
      stop: () => this.stopTrace(`component_render_${componentName}`)
    };
  }
}

// Performance monitoring hooks for React components
export const usePerformanceTracking = (componentName: string) => {
  const startRender = () => {
    PerformanceTracker.trackComponentRender(componentName);
  };

  const endRender = () => {
    PerformanceTracker.stopTrace(`component_render_${componentName}`);
  };

  return { startRender, endRender };
};

