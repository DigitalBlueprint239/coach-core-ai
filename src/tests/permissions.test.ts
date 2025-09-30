import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  connectStorageEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  serverTimestamp: () => new Date(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock('../services/firebase/firebase-config', () => ({
  auth: {},
  db: {},
  functions: {},
  storage: {},
}));

vi.mock('../services/analytics/analytics-events', () => ({
  trackLogin: vi.fn(),
  trackLogout: vi.fn(),
  trackSignup: vi.fn(),
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
  trackWaitlistSignup: vi.fn(),
  trackWaitlistSignupSuccess: vi.fn(),
  trackWaitlistSignupError: vi.fn(),
  trackWaitlistConversion: vi.fn(),
}));

vi.mock('../services/analytics/ga4-config', () => ({
  ga4Service: {
    trackSignupSubmitted: vi.fn(),
  },
}));

vi.mock('../services/monitoring/monitoring-lite', () => ({
  trackUserAction: vi.fn(),
  setSentryUser: vi.fn(),
  trackError: vi.fn(),
}));

vi.mock('../utils/firestore-sanitization', () => ({
  createFirestoreHelper: () => ({
    prepareCreate: (data: Record<string, any>) => ({ data, isValid: true, warnings: [] as string[] }),
    prepareUpdate: (data: Record<string, any>) => ({ data, isValid: true, warnings: [] as string[] }),
    logResult: vi.fn(),
  }),
}));

import { getDefaultPermissionsForRole } from '../services/firebase/auth-service';

describe('Role permission mappings', () => {
  const hasPermission = (
    role: Parameters<typeof getDefaultPermissionsForRole>[0],
    resource: string,
    action: string
  ) => {
    const permissions = getDefaultPermissionsForRole(role);
    return permissions.some(permission => permission.resource === resource && permission.action === action);
  };

  it('grants admins full administrative access', () => {
    const adminPermissions = getDefaultPermissionsForRole('admin');
    expect(adminPermissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: 'general', action: 'admin' }),
        expect.objectContaining({ resource: 'profile', action: 'read' }),
        expect.objectContaining({ resource: 'profile', action: 'write' }),
      ])
    );
  });

  it('prevents coaches from mutating admin resources', () => {
    expect(hasPermission('coach', 'general', 'admin')).toBe(false);
    expect(hasPermission('head-coach', 'general', 'admin')).toBe(false);
  });

  it('limits assistant-coach to read-only team access', () => {
    expect(hasPermission('assistant-coach', 'teams', 'read')).toBe(true);
    expect(hasPermission('assistant-coach', 'teams', 'write')).toBe(false);
    expect(hasPermission('assistant-coach', 'plays', 'write')).toBe(false);
  });

  it('restricts clients to profile scoped resources', () => {
    const clientPermissions = getDefaultPermissionsForRole('client');
    expect(clientPermissions).toHaveLength(2);
    expect(clientPermissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: 'profile', action: 'read' }),
        expect.objectContaining({ resource: 'profile', action: 'write' }),
      ])
    );
  });

  it('allows team-admins to manage rosters without global privileges', () => {
    expect(hasPermission('team-admin', 'players', 'write')).toBe(true);
    expect(hasPermission('team-admin', 'teams', 'write')).toBe(true);
    expect(hasPermission('team-admin', 'general', 'admin')).toBe(false);
  });
});
