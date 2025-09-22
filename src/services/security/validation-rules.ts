import { z } from 'zod';

// Base validation schemas
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(100, 'Email too long')
  .min(5, 'Email too short');

export const userIdSchema = z.string()
  .min(1, 'User ID required')
  .max(50, 'User ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid user ID format');

export const teamIdSchema = z.string()
  .min(1, 'Team ID required')
  .max(50, 'Team ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid team ID format');

export const timestampSchema = z.date()
  .refine((date) => date instanceof Date && !isNaN(date.getTime()), 'Invalid timestamp');

// Waitlist validation
export const waitlistEntrySchema = z.object({
  email: emailSchema,
  timestamp: timestampSchema,
  source: z.string().max(50).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional()
});

// Staging feedback validation
export const stagingFeedbackSchema = z.object({
  feedback: z.string()
    .min(10, 'Feedback too short')
    .max(1000, 'Feedback too long'),
  category: z.enum(['bug', 'feature', 'ui', 'performance', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  userId: userIdSchema.optional(),
  userEmail: emailSchema.optional(),
  userAgent: z.string().max(500).optional(),
  pageUrl: z.string().url().max(500).optional(),
  timestamp: timestampSchema,
  status: z.enum(['new', 'reviewed', 'in_progress', 'resolved', 'closed']).optional(),
  adminNotes: z.string().max(1000).optional(),
  adminId: userIdSchema.optional(),
  adminEmail: emailSchema.optional(),
  reviewedAt: timestampSchema.optional(),
  resolvedAt: timestampSchema.optional()
});

// User profile validation
export const userProfileSchema = z.object({
  uid: userIdSchema,
  email: emailSchema,
  displayName: z.string()
    .min(1, 'Display name required')
    .max(100, 'Display name too long'),
  createdAt: timestampSchema,
  lastLoginAt: timestampSchema.optional(),
  isEmailVerified: z.boolean(),
  subscription: z.enum(['free', 'pro', 'enterprise']),
  subscriptionStatus: z.enum(['active', 'inactive', 'cancelled', 'expired']),
  usage: z.object({
    playsGeneratedThisMonth: z.number().min(0),
    teamsCreated: z.number().min(0)
  }),
  preferences: z.object({
    sport: z.string().max(50),
    timezone: z.string().max(100),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
      marketing: z.boolean(),
      updates: z.boolean(),
      reminders: z.boolean()
    }),
    theme: z.enum(['light', 'dark', 'auto'])
  }),
  teams: z.array(teamIdSchema),
  role: z.enum(['coach', 'assistant', 'admin']),
  permissions: z.array(z.string()),
  activeTeamId: teamIdSchema.optional()
});

// Team validation
export const teamSchema = z.object({
  id: teamIdSchema,
  name: z.string()
    .min(1, 'Team name required')
    .max(100, 'Team name too long'),
  sport: z.string().max(50),
  headCoachId: userIdSchema,
  assistantCoachIds: z.array(userIdSchema),
  players: z.array(z.object({
    id: z.string(),
    name: z.string().max(100),
    position: z.string().max(50).optional(),
    jerseyNumber: z.number().min(0).max(99).optional()
  })),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
  settings: z.object({
    season: z.string().max(50).optional(),
    league: z.string().max(100).optional(),
    division: z.string().max(100).optional()
  }).optional()
});

// Play validation
export const playSchema = z.object({
  id: z.string().min(1),
  teamId: teamIdSchema,
  gameId: z.string().min(1),
  type: z.enum(['offense', 'defense', 'special_teams']),
  name: z.string()
    .min(1, 'Play name required')
    .max(100, 'Play name too long'),
  description: z.string().max(1000).optional(),
  formation: z.string().max(100).optional(),
  personnel: z.string().max(100).optional(),
  quarter: z.number().min(1).max(4),
  down: z.number().min(1).max(4).optional(),
  distance: z.number().min(0).optional(),
  yardLine: z.number().min(0).max(100).optional(),
  createdAt: timestampSchema,
  createdBy: userIdSchema,
  updatedAt: timestampSchema.optional(),
  updatedBy: userIdSchema.optional()
});

// Game validation
export const gameSchema = z.object({
  id: z.string().min(1),
  teamId: teamIdSchema,
  opponent: z.string()
    .min(1, 'Opponent name required')
    .max(100, 'Opponent name too long'),
  date: timestampSchema,
  location: z.string().max(200).optional(),
  homeAway: z.enum(['home', 'away']),
  season: z.string().max(50).optional(),
  league: z.string().max(100).optional(),
  division: z.string().max(100).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed']),
  score: z.object({
    home: z.number().min(0),
    away: z.number().min(0)
  }).optional(),
  createdAt: timestampSchema,
  createdBy: userIdSchema,
  updatedAt: timestampSchema.optional(),
  updatedBy: userIdSchema.optional()
});

// Rate limit validation
export const rateLimitSchema = z.object({
  attempts: z.number().min(0),
  firstAttempt: timestampSchema.optional(),
  lastAttempt: timestampSchema.optional(),
  blocked: z.boolean(),
  blockExpiry: timestampSchema.optional(),
  metadata: z.record(z.any()).optional()
});

// Audit log validation
export const auditLogSchema = z.object({
  action: z.string()
    .min(1, 'Action required')
    .max(100, 'Action too long'),
  resource: z.string()
    .min(1, 'Resource required')
    .max(100, 'Resource too long'),
  resourceId: z.string().max(100).optional(),
  userId: userIdSchema.optional(),
  userEmail: emailSchema.optional(),
  userAgent: z.string().max(500).optional(),
  ipAddress: z.string().ip().optional(),
  timestamp: timestampSchema,
  details: z.record(z.any()),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  environment: z.enum(['development', 'staging', 'production']),
  success: z.boolean(),
  errorMessage: z.string().max(1000).optional(),
  sessionId: z.string().max(100).optional(),
  teamId: teamIdSchema.optional(),
  metadata: z.record(z.any()).optional()
});

// Validation helper functions
export class ValidationService {
  /**
   * Validate data against a schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return { success: false, error: errorMessage };
      }
      return { success: false, error: 'Validation failed' };
    }
  }

  /**
   * Validate waitlist entry
   */
  static validateWaitlistEntry(data: unknown) {
    return this.validate(waitlistEntrySchema, data);
  }

  /**
   * Validate staging feedback
   */
  static validateStagingFeedback(data: unknown) {
    return this.validate(stagingFeedbackSchema, data);
  }

  /**
   * Validate user profile
   */
  static validateUserProfile(data: unknown) {
    return this.validate(userProfileSchema, data);
  }

  /**
   * Validate team
   */
  static validateTeam(data: unknown) {
    return this.validate(teamSchema, data);
  }

  /**
   * Validate play
   */
  static validatePlay(data: unknown) {
    return this.validate(playSchema, data);
  }

  /**
   * Validate game
   */
  static validateGame(data: unknown) {
    return this.validate(gameSchema, data);
  }

  /**
   * Validate rate limit
   */
  static validateRateLimit(data: unknown) {
    return this.validate(rateLimitSchema, data);
  }

  /**
   * Validate audit log
   */
  static validateAuditLog(data: unknown) {
    return this.validate(auditLogSchema, data);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  /**
   * Validate and sanitize email
   */
  static validateAndSanitizeEmail(email: string): { success: true; email: string } | { success: false; error: string } {
    const sanitized = this.sanitizeString(email, 100);
    const result = this.validate(emailSchema, sanitized);
    
    if (result.success) {
      return { success: true, email: sanitized.toLowerCase() };
    }
    
    return { success: false, error: result.error };
  }

  /**
   * Validate and sanitize user input
   */
  static validateAndSanitizeUserInput(input: string, maxLength: number = 1000): { success: true; input: string } | { success: false; error: string } {
    const sanitized = this.sanitizeString(input, maxLength);
    
    if (sanitized.length === 0) {
      return { success: false, error: 'Input cannot be empty' };
    }
    
    return { success: true, input: sanitized };
  }
}

export default ValidationService;

