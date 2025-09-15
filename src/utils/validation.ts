// Comprehensive validation utilities for Coach Core AI

/**
 * Email validation with proper regex and common sense checks
 */
export const validateEmail = (
  email: string
): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (typeof email !== 'string') {
    return { isValid: false, error: 'Email must be a string' };
  }

  // Trim whitespace
  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long (max 254 characters)' };
  }

  // Basic email regex (RFC 5322 compliant)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for common disposable email domains
  const disposableDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'tempmail.org',
    'mailinator.com',
    'yopmail.com',
    'throwaway.email',
    'temp-mail.org',
    'fakeinbox.com',
  ];

  const domain = trimmedEmail.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Please use a valid email address (no disposable emails)',
    };
  }

  return { isValid: true };
};

/**
 * Password validation with security requirements
 */
export const validatePassword = (
  password: string
): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (typeof password !== 'string') {
    return { isValid: false, error: 'Password must be a string' };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      error: 'Password is too long (max 128 characters)',
    };
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'Please choose a stronger password' };
  }

  return { isValid: true };
};

/**
 * Name validation
 */
export const validateName = (
  name: string
): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }

  if (typeof name !== 'string') {
    return { isValid: false, error: 'Name must be a string' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Name is too long (max 100 characters)' };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Team name validation
 */
export const validateTeamName = (
  teamName: string
): { isValid: boolean; error?: string } => {
  if (!teamName) {
    return { isValid: false, error: 'Team name is required' };
  }

  if (typeof teamName !== 'string') {
    return { isValid: false, error: 'Team name must be a string' };
  }

  const trimmedTeamName = teamName.trim();

  if (trimmedTeamName.length === 0) {
    return { isValid: false, error: 'Team name cannot be empty' };
  }

  if (trimmedTeamName.length < 2) {
    return {
      isValid: false,
      error: 'Team name must be at least 2 characters long',
    };
  }

  if (trimmedTeamName.length > 100) {
    return {
      isValid: false,
      error: 'Team name is too long (max 100 characters)',
    };
  }

  // Check for valid characters (letters, numbers, spaces, hyphens)
  const teamNameRegex = /^[a-zA-Z0-9\s\-\.]+$/;
  if (!teamNameRegex.test(trimmedTeamName)) {
    return { isValid: false, error: 'Team name contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Rate limiting utility for form submissions
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number }> =
    new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    // Reset if window has passed
    if (now - attempt.firstAttempt > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    // Check if max attempts reached
    if (attempt.count >= this.maxAttempts) {
      return false;
    }

    // Increment attempt count
    attempt.count++;
    return true;
  }

  getRemainingAttempts(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt) return this.maxAttempts;

    const now = Date.now();
    if (now - attempt.firstAttempt > this.windowMs) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - attempt.count);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Validate and sanitize waitlist email
 */
export const validateWaitlistEmail = (
  email: string
): { isValid: boolean; error?: string; sanitized?: string } => {
  const validation = validateEmail(email);

  if (!validation.isValid) {
    return validation;
  }

  const sanitized = sanitizeInput(email.toLowerCase().trim());

  return {
    isValid: true,
    sanitized,
  };
};
