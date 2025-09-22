import { doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: Date;
  retryAfter?: number;
}

class RateLimiter {
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Initialize default rate limit configurations
    this.setupDefaultConfigs();
  }

  private setupDefaultConfigs() {
    // Waitlist submission rate limiting
    this.addConfig('waitlist', {
      maxAttempts: 3,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'waitlist'
    });

    // Play creation rate limiting
    this.addConfig('play_creation', {
      maxAttempts: 10,
      windowMs: 5 * 60 * 1000, // 5 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
      keyPrefix: 'play_creation'
    });

    // Team creation rate limiting
    this.addConfig('team_creation', {
      maxAttempts: 2,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
      keyPrefix: 'team_creation'
    });

    // General API rate limiting
    this.addConfig('api', {
      maxAttempts: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'api'
    });

    // Login attempt rate limiting
    this.addConfig('login', {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
      keyPrefix: 'login'
    });
  }

  addConfig(name: string, config: RateLimitConfig) {
    this.configs.set(name, config);
  }

  getConfig(name: string): RateLimitConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * Check if an action is allowed for a given identifier
   */
  async checkRateLimit(
    configName: string,
    identifier: string,
    additionalData?: Record<string, any>
  ): Promise<RateLimitResult> {
    const config = this.getConfig(configName);
    if (!config) {
      throw new Error(`Rate limit config '${configName}' not found`);
    }

    const key = `${config.keyPrefix}:${identifier}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
      const rateLimitRef = doc(db, 'rate_limits', key);
      const rateLimitDoc = await getDoc(rateLimitRef);

      if (!rateLimitDoc.exists()) {
        // First attempt - create new rate limit record
        await setDoc(rateLimitRef, {
          attempts: 1,
          firstAttempt: serverTimestamp(),
          lastAttempt: serverTimestamp(),
          blocked: false,
          blockExpiry: null,
          metadata: additionalData || {}
        });

        return {
          allowed: true,
          remainingAttempts: config.maxAttempts - 1,
          resetTime: new Date(now.getTime() + config.windowMs)
        };
      }

      const data = rateLimitDoc.data();
      const attempts = data.attempts || 0;
      const firstAttempt = data.firstAttempt?.toDate() || now;
      const lastAttempt = data.lastAttempt?.toDate() || now;
      const blocked = data.blocked || false;
      const blockExpiry = data.blockExpiry?.toDate();

      // Check if currently blocked
      if (blocked && blockExpiry && now < blockExpiry) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: blockExpiry,
          retryAfter: Math.ceil((blockExpiry.getTime() - now.getTime()) / 1000)
        };
      }

      // Check if window has expired
      if (firstAttempt < windowStart) {
        // Reset the rate limit
        await setDoc(rateLimitRef, {
          attempts: 1,
          firstAttempt: serverTimestamp(),
          lastAttempt: serverTimestamp(),
          blocked: false,
          blockExpiry: null,
          metadata: additionalData || {}
        });

        return {
          allowed: true,
          remainingAttempts: config.maxAttempts - 1,
          resetTime: new Date(now.getTime() + config.windowMs)
        };
      }

      // Check if max attempts exceeded
      if (attempts >= config.maxAttempts) {
        // Block the identifier
        const blockExpiryTime = new Date(now.getTime() + config.blockDurationMs);
        await setDoc(rateLimitRef, {
          attempts: attempts + 1,
          firstAttempt: data.firstAttempt,
          lastAttempt: serverTimestamp(),
          blocked: true,
          blockExpiry: serverTimestamp(),
          metadata: additionalData || {}
        });

        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: blockExpiryTime,
          retryAfter: Math.ceil(config.blockDurationMs / 1000)
        };
      }

      // Increment attempts
      await setDoc(rateLimitRef, {
        attempts: increment(1),
        firstAttempt: data.firstAttempt,
        lastAttempt: serverTimestamp(),
        blocked: false,
        blockExpiry: null,
        metadata: additionalData || {}
      });

      return {
        allowed: true,
        remainingAttempts: config.maxAttempts - (attempts + 1),
        resetTime: new Date(firstAttempt.getTime() + config.windowMs)
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the request if rate limiting fails
      return {
        allowed: true,
        remainingAttempts: config.maxAttempts,
        resetTime: new Date(now.getTime() + config.windowMs)
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(configName: string, identifier: string): Promise<void> {
    const config = this.getConfig(configName);
    if (!config) {
      throw new Error(`Rate limit config '${configName}' not found`);
    }

    const key = `${config.keyPrefix}:${identifier}`;
    const rateLimitRef = doc(db, 'rate_limits', key);
    
    try {
      await setDoc(rateLimitRef, {
        attempts: 0,
        firstAttempt: null,
        lastAttempt: null,
        blocked: false,
        blockExpiry: null,
        metadata: {}
      });
    } catch (error) {
      console.error('Rate limit reset failed:', error);
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(
    configName: string,
    identifier: string
  ): Promise<RateLimitResult | null> {
    const config = this.getConfig(configName);
    if (!config) {
      return null;
    }

    const key = `${config.keyPrefix}:${identifier}`;
    const rateLimitRef = doc(db, 'rate_limits', key);
    
    try {
      const rateLimitDoc = await getDoc(rateLimitRef);
      if (!rateLimitDoc.exists()) {
        return {
          allowed: true,
          remainingAttempts: config.maxAttempts,
          resetTime: new Date(Date.now() + config.windowMs)
        };
      }

      const data = rateLimitDoc.data();
      const attempts = data.attempts || 0;
      const firstAttempt = data.firstAttempt?.toDate() || new Date();
      const blocked = data.blocked || false;
      const blockExpiry = data.blockExpiry?.toDate();

      if (blocked && blockExpiry && new Date() < blockExpiry) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: blockExpiry,
          retryAfter: Math.ceil((blockExpiry.getTime() - Date.now()) / 1000)
        };
      }

      return {
        allowed: attempts < config.maxAttempts,
        remainingAttempts: Math.max(0, config.maxAttempts - attempts),
        resetTime: new Date(firstAttempt.getTime() + config.windowMs)
      };
    } catch (error) {
      console.error('Rate limit status check failed:', error);
      return null;
    }
  }

  /**
   * Clean up expired rate limit records
   */
  async cleanupExpiredRecords(): Promise<void> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago

    // This would typically be done in a Cloud Function
    // For now, we'll just log the cleanup action
    console.log('Rate limit cleanup would remove records older than:', cutoffTime);
  }
}

export const rateLimiter = new RateLimiter();

