import * as Sentry from '@sentry/react';

// ============================================
// TOKEN VALIDATION INTERFACES
// ============================================

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  error?: string;
  tokenData?: any;
}

export interface WaitlistTokenData {
  id: string;
  email: string;
  name: string;
  role: string;
  accessToken: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface OnboardingTokenData {
  token: string;
  email: string;
  role: string;
  teamLevel: string;
  expiresAt: Date;
  isValid: boolean;
}

// ============================================
// TOKEN VALIDATOR CLASS
// ============================================

export class TokenValidator {
  private static readonly TOKEN_MIN_LENGTH = 10;
  private static readonly TOKEN_MAX_LENGTH = 1000;
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly ROLE_VALID_VALUES = [
    'head-coach',
    'assistant-coach',
    'coordinator',
    'position-coach',
    'volunteer',
    'athletic-director',
    'parent',
    'player',
    'other'
  ];
  private static readonly TEAM_LEVEL_VALID_VALUES = [
    'youth',
    'high-school',
    'college',
    'adult',
    'professional'
  ];

  // ============================================
  // BASIC TOKEN VALIDATION
  // ============================================

  /**
   * Validates basic token format and structure
   */
  static validateTokenFormat(token: string): TokenValidationResult {
    try {
      // Add breadcrumb for token validation
      Sentry.addBreadcrumb({
        message: 'Validating token format',
        category: 'token_validation',
        data: { tokenLength: token?.length || 0 },
        level: 'info'
      });

      // Check if token exists
      if (!token) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Token is required'
        };
      }

      // Check if token is a string
      if (typeof token !== 'string') {
        return {
          isValid: false,
          isExpired: false,
          error: 'Token must be a string'
        };
      }

      // Check token length
      if (token.length < this.TOKEN_MIN_LENGTH) {
        return {
          isValid: false,
          isExpired: false,
          error: `Token must be at least ${this.TOKEN_MIN_LENGTH} characters long`
        };
      }

      if (token.length > this.TOKEN_MAX_LENGTH) {
        return {
          isValid: false,
          isExpired: false,
          error: `Token must be no more than ${this.TOKEN_MAX_LENGTH} characters long`
        };
      }

      // Check for valid characters (alphanumeric, hyphens, underscores, dots)
      if (!/^[a-zA-Z0-9._-]+$/.test(token)) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Token contains invalid characters'
        };
      }

      return {
        isValid: true,
        isExpired: false
      };

    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          errorType: 'token_validation_error',
          source: 'validateTokenFormat'
        },
        extra: { token: token?.substring(0, 10) + '...' }
      });

      return {
        isValid: false,
        isExpired: false,
        error: 'Token validation failed due to internal error'
      };
    }
  }

  // ============================================
  // WAITLIST TOKEN VALIDATION
  // ============================================

  /**
   * Validates waitlist token data structure and content
   */
  static validateWaitlistTokenData(data: any): TokenValidationResult {
    try {
      Sentry.addBreadcrumb({
        message: 'Validating waitlist token data',
        category: 'token_validation',
        data: { 
          hasId: !!data?.id,
          hasEmail: !!data?.email,
          hasName: !!data?.name,
          hasRole: !!data?.role
        },
        level: 'info'
      });

      // Check if data exists
      if (!data || typeof data !== 'object') {
        return {
          isValid: false,
          isExpired: false,
          error: 'Token data is required and must be an object'
        };
      }

      // Validate required fields
      const requiredFields = ['id', 'email', 'name', 'role', 'accessToken', 'expiresAt', 'createdAt'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return {
            isValid: false,
            isExpired: false,
            error: `Missing required field: ${field}`
          };
        }
      }

      // Validate email format
      if (!this.EMAIL_REGEX.test(data.email)) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid email format'
        };
      }

      // Validate role
      if (!this.ROLE_VALID_VALUES.includes(data.role)) {
        return {
          isValid: false,
          isExpired: false,
          error: `Invalid role. Must be one of: ${this.ROLE_VALID_VALUES.join(', ')}`
        };
      }

      // Validate name (not empty, reasonable length)
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Name must be a non-empty string'
        };
      }

      if (data.name.length > 100) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Name must be no more than 100 characters'
        };
      }

      // Validate dates
      const expiresAt = new Date(data.expiresAt);
      const createdAt = new Date(data.createdAt);

      if (isNaN(expiresAt.getTime())) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid expiration date'
        };
      }

      if (isNaN(createdAt.getTime())) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid creation date'
        };
      }

      // Check if token is expired
      const now = new Date();
      const isExpired = expiresAt < now;

      if (isExpired) {
        return {
          isValid: false,
          isExpired: true,
          error: 'Token has expired'
        };
      }

      // Check if creation date is in the future (invalid)
      if (createdAt > now) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Token creation date cannot be in the future'
        };
      }

      // Check if expiration is too far in the future (suspicious)
      const maxExpiration = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
      if (expiresAt > maxExpiration) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Token expiration date is too far in the future'
        };
      }

      return {
        isValid: true,
        isExpired: false,
        tokenData: data as WaitlistTokenData
      };

    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          errorType: 'waitlist_token_validation_error',
          source: 'validateWaitlistTokenData'
        },
        extra: { dataKeys: Object.keys(data || {}) }
      });

      return {
        isValid: false,
        isExpired: false,
        error: 'Waitlist token validation failed due to internal error'
      };
    }
  }

  // ============================================
  // ONBOARDING TOKEN VALIDATION
  // ============================================

  /**
   * Validates onboarding token from URL parameters
   */
  static validateOnboardingToken(token: string): TokenValidationResult {
    try {
      Sentry.addBreadcrumb({
        message: 'Validating onboarding token',
        category: 'token_validation',
        data: { tokenLength: token?.length || 0 },
        level: 'info'
      });

      // First validate basic format
      const formatValidation = this.validateTokenFormat(token);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // Check if token looks like a valid onboarding token
      // Onboarding tokens typically start with specific prefixes
      const validPrefixes = ['beta_', 'onboard_', 'invite_', 'demo_'];
      const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));

      if (!hasValidPrefix) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid token format for onboarding'
        };
      }

      // Check token structure (should have some complexity)
      if (token.length < 20) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Onboarding token appears to be too short'
        };
      }

      return {
        isValid: true,
        isExpired: false
      };

    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          errorType: 'onboarding_token_validation_error',
          source: 'validateOnboardingToken'
        },
        extra: { token: token?.substring(0, 10) + '...' }
      });

      return {
        isValid: false,
        isExpired: false,
        error: 'Onboarding token validation failed due to internal error'
      };
    }
  }

  // ============================================
  // FIREBASE TOKEN VALIDATION
  // ============================================

  /**
   * Validates Firebase ID token structure
   */
  static validateFirebaseToken(token: string): TokenValidationResult {
    try {
      Sentry.addBreadcrumb({
        message: 'Validating Firebase token',
        category: 'token_validation',
        data: { tokenLength: token?.length || 0 },
        level: 'info'
      });

      // Basic format validation
      const formatValidation = this.validateTokenFormat(token);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // Firebase tokens are JWT format (3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid Firebase token format (not a valid JWT)'
        };
      }

      // Check if each part is base64 encoded
      for (let i = 0; i < parts.length; i++) {
        try {
          atob(parts[i]);
        } catch {
          return {
            isValid: false,
            isExpired: false,
            error: `Invalid base64 encoding in token part ${i + 1}`
          };
        }
      }

      return {
        isValid: true,
        isExpired: false
      };

    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          errorType: 'firebase_token_validation_error',
          source: 'validateFirebaseToken'
        },
        extra: { token: token?.substring(0, 20) + '...' }
      });

      return {
        isValid: false,
        isExpired: false,
        error: 'Firebase token validation failed due to internal error'
      };
    }
  }

  // ============================================
  // COMPREHENSIVE TOKEN VALIDATION
  // ============================================

  /**
   * Comprehensive token validation with type detection
   */
  static validateToken(token: string, type?: 'waitlist' | 'onboarding' | 'firebase' | 'any'): TokenValidationResult {
    try {
      Sentry.addBreadcrumb({
        message: 'Starting comprehensive token validation',
        category: 'token_validation',
        data: { tokenLength: token?.length || 0, type },
        level: 'info'
      });

      // Basic format validation first
      const formatValidation = this.validateTokenFormat(token);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // Type-specific validation
      switch (type) {
        case 'waitlist':
          return this.validateWaitlistTokenData({ accessToken: token });
        case 'onboarding':
          return this.validateOnboardingToken(token);
        case 'firebase':
          return this.validateFirebaseToken(token);
        case 'any':
        default:
          // Try to detect token type and validate accordingly
          if (token.startsWith('demo_') || token.startsWith('beta_')) {
            return this.validateOnboardingToken(token);
          } else if (token.includes('.')) {
            return this.validateFirebaseToken(token);
          } else {
            return this.validateOnboardingToken(token);
          }
      }

    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          errorType: 'comprehensive_token_validation_error',
          source: 'validateToken'
        },
        extra: { token: token?.substring(0, 10) + '...', type }
      });

      return {
        isValid: false,
        isExpired: false,
        error: 'Token validation failed due to internal error'
      };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Sanitizes token data for safe logging
   */
  static sanitizeTokenForLogging(token: string): string {
    if (!token || token.length < 8) {
      return '[REDACTED]';
    }
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
  }

  /**
   * Checks if a token is expired based on timestamp
   */
  static isTokenExpired(expiresAt: Date | string | number): boolean {
    try {
      const expiration = new Date(expiresAt);
      return expiration < new Date();
    } catch {
      return true; // If we can't parse the date, consider it expired
    }
  }

  /**
   * Gets time until token expiration
   */
  static getTimeUntilExpiration(expiresAt: Date | string | number): number {
    try {
      const expiration = new Date(expiresAt);
      const now = new Date();
      return Math.max(0, expiration.getTime() - now.getTime());
    } catch {
      return 0;
    }
  }
}

// ============================================
// EXPORT CONVENIENCE FUNCTIONS
// ============================================

export const validateToken = TokenValidator.validateToken;
export const validateWaitlistToken = TokenValidator.validateWaitlistTokenData;
export const validateOnboardingToken = TokenValidator.validateOnboardingToken;
export const validateFirebaseToken = TokenValidator.validateFirebaseToken;
export const isTokenExpired = TokenValidator.isTokenExpired;
export const getTimeUntilExpiration = TokenValidator.getTimeUntilExpiration;
export const sanitizeTokenForLogging = TokenValidator.sanitizeTokenForLogging;




