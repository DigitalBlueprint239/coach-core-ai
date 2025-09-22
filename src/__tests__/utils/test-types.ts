// Test utility types and mocks
import { vi } from 'vitest';
import { User } from 'firebase/auth';
import { UserProfile } from '../../types/user';

// Mock User type for testing
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: '2023-01-01T00:00:00.000Z',
    lastSignInTime: '2023-01-01T00:00:00.000Z'
  },
  providerData: [],
  providerId: 'firebase',
  refreshToken: 'test-refresh-token',
  tenantId: null,
  delete: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue('test-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'test-id-token',
    authTime: '2023-01-01T00:00:00.000Z',
    issuedAtTime: '2023-01-01T00:00:00.000Z',
    expirationTime: '2023-01-02T00:00:00.000Z',
    signInProvider: 'password',
    signInSecondFactor: null,
    claims: {}
  }),
  reload: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn().mockReturnValue({}),
  ...overrides
} as User);

// Mock UserProfile type for testing
export const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'coach',
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
  lastLoginAt: new Date('2023-01-01T00:00:00.000Z'),
  isEmailVerified: true,
  subscription: {
    plan: 'free',
    status: 'active',
    startDate: new Date('2023-01-01T00:00:00.000Z'),
    endDate: null
  } as any,
  preferences: {
    theme: 'light',
    notifications: true,
    language: 'en'
  } as any,
  teamId: 'test-team-id',
  ...overrides
} as UserProfile);

// Mock auth service response
export const createMockAuthResponse = (userOverrides: Partial<User> = {}, profileOverrides: Partial<UserProfile> = {}) => ({
  user: createMockUser(userOverrides),
  profile: createMockUserProfile(profileOverrides)
});
