// React Context Polyfill for compatibility issues
// This ensures createContext is available globally

import { createContext } from 'react';

// Ensure createContext is available globally for third-party libraries
if (typeof window !== 'undefined') {
  (window as any).React = (window as any).React || {};
  (window as any).React.createContext = createContext;
}

// Export for use in other files if needed
export { createContext };
