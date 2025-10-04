// Waitlist Service Exports
// This file provides a unified interface for all waitlist functionality

export { SimpleWaitlistService, simpleWaitlistService } from './simple-waitlist-service';
export { WaitlistService, waitlistService } from './waitlist-service';
export { waitlistAdminService } from './waitlist-admin-service';

// Types
export type { WaitlistEntry } from './waitlist-service';

// Default export - use the simple service as the primary service
export { simpleWaitlistService as default } from './simple-waitlist-service';

// Service selection helper
export const getWaitlistService = (type: 'simple' | 'standard' = 'simple') => {
  switch (type) {
    case 'simple':
      return import('./simple-waitlist-service').then(m => m.simpleWaitlistService);
    case 'standard':
      return import('./waitlist-service').then(m => m.waitlistService);
    default:
      return import('./simple-waitlist-service').then(m => m.simpleWaitlistService);
  }
};
