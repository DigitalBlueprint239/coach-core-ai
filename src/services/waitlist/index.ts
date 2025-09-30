// Waitlist Service Exports
// This file provides a unified interface for all waitlist functionality

export { SimpleWaitlistService, simpleWaitlistService } from './simple-waitlist-service';
export { WaitlistService, waitlistService } from './waitlist-service';
export { EnhancedWaitlistService, enhancedWaitlistService } from './enhanced-waitlist-service';
export { OptimizedWaitlistService, optimizedWaitlistService } from './optimized-waitlist-service';
export { waitlistAdminService } from './waitlist-admin-service';

// Types
export type { WaitlistEntry } from './waitlist-service';
export type { EnhancedWaitlistData, WaitlistEntryWithAccess } from './enhanced-waitlist-service';

// Default export - use the enhanced service for most cases
export { enhancedWaitlistService as default } from './enhanced-waitlist-service';

// Service selection helper
export const getWaitlistService = (type: 'simple' | 'standard' | 'enhanced' | 'optimized' = 'enhanced') => {
  switch (type) {
    case 'simple':
      return import('./simple-waitlist-service').then(m => m.simpleWaitlistService);
    case 'standard':
      return import('./waitlist-service').then(m => m.waitlistService);
    case 'enhanced':
      return import('./enhanced-waitlist-service').then(m => m.enhancedWaitlistService);
    case 'optimized':
      return import('./optimized-waitlist-service').then(m => m.optimizedWaitlistService);
    default:
      return import('./enhanced-waitlist-service').then(m => m.enhancedWaitlistService);
  }
};
