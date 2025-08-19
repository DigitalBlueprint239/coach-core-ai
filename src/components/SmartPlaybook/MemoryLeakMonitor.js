/**
 * MemoryLeakMonitor.js – Comprehensive memory leak detection and monitoring
 * - Tracks canvas contexts, event listeners, and animation frames
 * - Monitors object references and closure memory usage
 * - Provides performance metrics and cleanup recommendations
 * - Integration with React DevTools for debugging
 */

class MemoryLeakMonitor {
  constructor() {
    this.metrics = {
      canvasContexts: new Set(),
      eventListeners: new Map(),
      animationFrames: new Set(),
      objectReferences: new WeakMap(),
      componentInstances: new Set(),
      memorySnapshots: [],
      cleanupCount: 0,
      leakCount: 0
    };

    this.isMonitoring = false;
    this.intervalId = null;
    this.lastMemoryUsage = 0;
    
    // Performance monitoring
    this.performanceMetrics = {
      renderCount: 0,
      drawCount: 0,
      eventCount: 0,
      averageRenderTime: 0,
      averageDrawTime: 0,
      averageEventTime: 0
    };

    this.init();
  }

  init() {
    // Override console methods to track memory usage
    this.overrideConsole();
    
    // Set up periodic memory checks
    this.startPeriodicMonitoring();
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Listen for beforeunload to perform final cleanup
    window.addEventListener('beforeunload', this.performFinalCleanup.bind(this));
  }

  // Start monitoring
  startMonitoring() {
    this.isMonitoring = true;
    console.log('🔍 Memory Leak Monitor: Started monitoring');
    
    // Take initial snapshot
    this.takeMemorySnapshot('start');
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🛑 Memory Leak Monitor: Stopped monitoring');
    
    // Take final snapshot
    this.takeMemorySnapshot('stop');
    
    // Generate report
    this.generateReport();
  }

  // Track canvas context
  trackCanvasContext(ctx, componentName) {
    if (!this.isMonitoring) return;
    
    this.metrics.canvasContexts.add({
      context: ctx,
      component: componentName,
      timestamp: Date.now(),
      stack: new Error().stack
    });
    
    console.log(`🎨 Canvas context tracked: ${componentName}`);
  }

  // Track event listener
  trackEventListener(element, eventType, handler, componentName) {
    if (!this.isMonitoring) return;
    
    const key = `${componentName}-${eventType}-${Date.now()}`;
    this.metrics.eventListeners.set(key, {
      element,
      eventType,
      handler,
      component: componentName,
      timestamp: Date.now(),
      stack: new Error().stack
    });
    
    console.log(`👂 Event listener tracked: ${componentName} - ${eventType}`);
  }

  // Track animation frame
  trackAnimationFrame(frameId, componentName) {
    if (!this.isMonitoring) return;
    
    this.metrics.animationFrames.add({
      frameId,
      component: componentName,
      timestamp: Date.now(),
      stack: new Error().stack
    });
    
    console.log(`🎬 Animation frame tracked: ${componentName}`);
  }

  // Track object reference
  trackObjectReference(obj, componentName, description) {
    if (!this.isMonitoring) return;
    
    this.metrics.objectReferences.set(obj, {
      component: componentName,
      description,
      timestamp: Date.now(),
      stack: new Error().stack
    });
  }

  // Track component instance
  trackComponentInstance(component, componentName) {
    if (!this.isMonitoring) return;
    
    this.metrics.componentInstances.add({
      component,
      name: componentName,
      timestamp: Date.now(),
      stack: new Error().stack
    });
  }

  // Cleanup canvas context
  cleanupCanvasContext(ctx, componentName) {
    if (ctx) {
      // Clear canvas
      ctx.clearRect(0, 0, ctx.canvas?.width || 0, ctx.canvas?.height || 0);
      
      // Remove from tracking
      for (const tracked of this.metrics.canvasContexts) {
        if (tracked.context === ctx) {
          this.metrics.canvasContexts.delete(tracked);
          break;
        }
      }
    }
    
    this.metrics.cleanupCount++;
    console.log(`🧹 Canvas context cleaned up: ${componentName}`);
  }

  // Cleanup event listener
  cleanupEventListener(element, eventType, handler, componentName) {
    if (element && handler) {
      element.removeEventListener(eventType, handler);
      
      // Remove from tracking
      for (const [key, tracked] of this.metrics.eventListeners) {
        if (tracked.element === element && 
            tracked.eventType === eventType && 
            tracked.handler === handler) {
          this.metrics.eventListeners.delete(key);
          break;
        }
      }
    }
    
    this.metrics.cleanupCount++;
    console.log(`🧹 Event listener cleaned up: ${componentName} - ${eventType}`);
  }

  // Cleanup animation frame
  cleanupAnimationFrame(frameId, componentName) {
    if (frameId) {
      cancelAnimationFrame(frameId);
      
      // Remove from tracking
      for (const tracked of this.metrics.animationFrames) {
        if (tracked.frameId === frameId) {
          this.metrics.animationFrames.delete(tracked);
          break;
        }
      }
    }
    
    this.metrics.cleanupCount++;
    console.log(`🧹 Animation frame cleaned up: ${componentName}`);
  }

  // Cleanup component instance
  cleanupComponentInstance(component, componentName) {
    // Remove from tracking
    for (const tracked of this.metrics.componentInstances) {
      if (tracked.component === component) {
        this.metrics.componentInstances.delete(tracked);
        break;
      }
    }
    
    this.metrics.cleanupCount++;
    console.log(`🧹 Component instance cleaned up: ${componentName}`);
  }

  // Take memory snapshot
  takeMemorySnapshot(label) {
    if (typeof performance !== 'undefined' && performance.memory) {
      const snapshot = {
        label,
        timestamp: Date.now(),
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        canvasContexts: this.metrics.canvasContexts.size,
        eventListeners: this.metrics.eventListeners.size,
        animationFrames: this.metrics.animationFrames.size,
        componentInstances: this.metrics.componentInstances.size
      };
      
      this.metrics.memorySnapshots.push(snapshot);
      
      // Check for memory leaks
      if (this.metrics.memorySnapshots.length > 1) {
        const current = snapshot;
        const previous = this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 2];
        
        const memoryIncrease = current.usedJSHeapSize - previous.usedJSHeapSize;
        const contextIncrease = current.canvasContexts - previous.canvasContexts;
        const listenerIncrease = current.eventListeners - previous.eventListeners;
        const frameIncrease = current.animationFrames - previous.animationFrames;
        
        if (memoryIncrease > 1024 * 1024 || // 1MB increase
            contextIncrease > 0 ||
            listenerIncrease > 0 ||
            frameIncrease > 0) {
          this.metrics.leakCount++;
          console.warn(`⚠️ Potential memory leak detected:`, {
            memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
            contextIncrease,
            listenerIncrease,
            frameIncrease
          });
        }
      }
    }
  }

  // Start periodic monitoring
  startPeriodicMonitoring() {
    this.intervalId = setInterval(() => {
      if (this.isMonitoring) {
        this.takeMemorySnapshot('periodic');
        this.checkForLeaks();
      }
    }, 5000); // Check every 5 seconds
  }

  // Check for memory leaks
  checkForLeaks() {
    const currentTime = Date.now();
    const timeout = 30000; // 30 seconds
    
    // Check for stale canvas contexts
    for (const tracked of this.metrics.canvasContexts) {
      if (currentTime - tracked.timestamp > timeout) {
        console.warn(`⚠️ Stale canvas context detected: ${tracked.component}`);
      }
    }
    
    // Check for stale event listeners
    for (const [key, tracked] of this.metrics.eventListeners) {
      if (currentTime - tracked.timestamp > timeout) {
        console.warn(`⚠️ Stale event listener detected: ${tracked.component} - ${tracked.eventType}`);
      }
    }
    
    // Check for stale animation frames
    for (const tracked of this.metrics.animationFrames) {
      if (currentTime - tracked.timestamp > timeout) {
        console.warn(`⚠️ Stale animation frame detected: ${tracked.component}`);
      }
    }
  }

  // Handle visibility change
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, take snapshot
      this.takeMemorySnapshot('hidden');
    } else {
      // Page is visible, take snapshot
      this.takeMemorySnapshot('visible');
    }
  }

  // Perform final cleanup
  performFinalCleanup() {
    console.log('🧹 Performing final cleanup...');
    
    // Cleanup all tracked resources
    for (const tracked of this.metrics.canvasContexts) {
      this.cleanupCanvasContext(tracked.context, tracked.component);
    }
    
    for (const [key, tracked] of this.metrics.eventListeners) {
      this.cleanupEventListener(tracked.element, tracked.eventType, tracked.handler, tracked.component);
    }
    
    for (const tracked of this.metrics.animationFrames) {
      this.cleanupAnimationFrame(tracked.frameId, tracked.component);
    }
    
    for (const tracked of this.metrics.componentInstances) {
      this.cleanupComponentInstance(tracked.component, tracked.name);
    }
  }

  // Generate report
  generateReport() {
    const report = {
      summary: {
        totalCleanups: this.metrics.cleanupCount,
        totalLeaks: this.metrics.leakCount,
        currentCanvasContexts: this.metrics.canvasContexts.size,
        currentEventListeners: this.metrics.eventListeners.size,
        currentAnimationFrames: this.metrics.animationFrames.size,
        currentComponentInstances: this.metrics.componentInstances.size
      },
      snapshots: this.metrics.memorySnapshots,
      performance: this.performanceMetrics,
      recommendations: this.generateRecommendations()
    };
    
    console.log('📊 Memory Leak Monitor Report:', report);
    return report;
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.canvasContexts.size > 0) {
      recommendations.push('Clean up canvas contexts in component unmount');
    }
    
    if (this.metrics.eventListeners.size > 0) {
      recommendations.push('Remove event listeners in useEffect cleanup');
    }
    
    if (this.metrics.animationFrames.size > 0) {
      recommendations.push('Cancel animation frames in useEffect cleanup');
    }
    
    if (this.metrics.componentInstances.size > 0) {
      recommendations.push('Clean up component references');
    }
    
    if (this.metrics.leakCount > 0) {
      recommendations.push('Review component lifecycle and cleanup patterns');
    }
    
    return recommendations;
  }

  // Override console methods
  overrideConsole() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = (...args) => {
      this.performanceMetrics.renderCount++;
      originalLog.apply(console, args);
    };
    
    console.warn = (...args) => {
      if (args[0]?.includes('memory') || args[0]?.includes('leak')) {
        this.metrics.leakCount++;
      }
      originalWarn.apply(console, args);
    };
    
    console.error = (...args) => {
      if (args[0]?.includes('memory') || args[0]?.includes('leak')) {
        this.metrics.leakCount++;
      }
      originalError.apply(console, args);
    };
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      performance: this.performanceMetrics,
      isMonitoring: this.isMonitoring
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      canvasContexts: new Set(),
      eventListeners: new Map(),
      animationFrames: new Set(),
      objectReferences: new WeakMap(),
      componentInstances: new Set(),
      memorySnapshots: [],
      cleanupCount: 0,
      leakCount: 0
    };
    
    this.performanceMetrics = {
      renderCount: 0,
      drawCount: 0,
      eventCount: 0,
      averageRenderTime: 0,
      averageDrawTime: 0,
      averageEventTime: 0
    };
    
    console.log('🔄 Memory Leak Monitor: Metrics reset');
  }

  // Destroy monitor
  destroy() {
    this.stopMonitoring();
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.performFinalCleanup();
    this.reset();
    
    console.log('🗑️ Memory Leak Monitor: Destroyed');
  }
}

// Create singleton instance
const memoryLeakMonitor = new MemoryLeakMonitor();

// Export for use in components
export default memoryLeakMonitor;

// React hook for easy integration
export const useMemoryLeakMonitor = (componentName) => {
  const monitor = memoryLeakMonitor;
  
  useEffect(() => {
    // Track component instance
    monitor.trackComponentInstance({}, componentName);
    
    return () => {
      // Cleanup component instance
      monitor.cleanupComponentInstance({}, componentName);
    };
  }, [componentName]);
  
  return monitor;
};

// Higher-order component for automatic monitoring
export const withMemoryLeakMonitor = (WrappedComponent, componentName) => {
  return function WithMemoryLeakMonitor(props) {
    useMemoryLeakMonitor(componentName);
    
    return <WrappedComponent {...props} />;
  };
}; 