// src/utils/data-validation.ts
import { Team, Player, PracticePlan, Play } from '../types/firestore-schema';

// ============================================
// VALIDATION TYPES
// ============================================

export type ValidationType = 'string' | 'number' | 'boolean' | 'object' | 'email' | 'array' | 'timestamp' | 'enum';

export interface ValidationRule {
  required?: boolean;
  type?: ValidationType;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const TeamValidationSchema: Record<keyof Team, ValidationRule> = {
  id: { required: true, type: 'string' },
  name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  sport: { required: true, type: 'enum', enum: ['football', 'basketball', 'soccer', 'baseball', 'volleyball', 'hockey', 'lacrosse', 'track', 'swimming', 'tennis'] },
  level: { required: true, type: 'string' },
  season: { required: true, type: 'string' },
  coachIds: { required: true, type: 'array' },
  playerIds: { required: true, type: 'array' },
  settings: { required: true, type: 'object' },
  stats: { required: true, type: 'object' },
  location: { required: true, type: 'object' },
  schedule: { required: true, type: 'object' },
  constraints: { required: false, type: 'object' },
  level_extensions: { required: false, type: 'object' },
  createdAt: { required: true, type: 'timestamp' },
  updatedAt: { required: true, type: 'timestamp' }
};

export const PlayerValidationSchema: Record<keyof Player, ValidationRule> = {
  id: { required: true, type: 'string' },
  teamId: { required: true, type: 'string' },
  firstName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  lastName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  jerseyNumber: { required: true, type: 'number', min: 0, max: 99 },
  position: { required: true, type: 'string' },
  grade: { required: true, type: 'number', min: 1, max: 12 },
  email: { required: false, type: 'email' },
  phone: { required: false, type: 'string' },
  parentEmail: { required: false, type: 'email' },
  parentPhone: { required: false, type: 'string' },
  height: { required: false, type: 'number', min: 30, max: 90 },
  weight: { required: false, type: 'number', min: 50, max: 400 },
  medicalInfo: { required: false, type: 'object' },
  stats: { required: false, type: 'object' },
  level: { required: true, type: 'string' },
  constraints: { required: false, type: 'object' },
  level_extensions: { required: false, type: 'object' },
  createdAt: { required: true, type: 'timestamp' },
  updatedAt: { required: true, type: 'timestamp' }
};

export const PracticePlanValidationSchema: Record<keyof PracticePlan, ValidationRule> = {
  id: { required: false, type: 'string' },
  teamId: { required: true, type: 'string' },
  name: { required: true, type: 'string', minLength: 3, maxLength: 100 },
  date: { required: true, type: 'string' },
  duration: { required: true, type: 'number', min: 15, max: 480 },
  periods: { required: true, type: 'array' },
  goals: { required: true, type: 'array' },
  notes: { required: false, type: 'string', maxLength: 100 },
  createdBy: { required: true, type: 'string' },
  createdAt: { required: true, type: 'timestamp' },
  updatedAt: { required: true, type: 'timestamp' }
};

export const PlayValidationSchema: Record<keyof Play, ValidationRule> = {
  id: { required: false, type: 'string' },
  teamId: { required: true, type: 'string' },
  authorId: { required: true, type: 'string' },
  name: { required: true, type: 'string', minLength: 3, maxLength: 100 },
  description: { required: false, type: 'string', maxLength: 500 },
  category: { required: true, type: 'enum', enum: ['offense', 'defense', 'special_teams', 'situational', 'red_zone', 'two_minute'] },
  formation: { required: true, type: 'string' },
  difficulty: { required: true, type: 'enum', enum: ['beginner', 'intermediate', 'advanced'] },
  level: { required: true, type: 'string' },
  players: { required: true, type: 'array' },
  routes: { required: false, type: 'array' },
  tags: { required: false, type: 'array' },
  isPublic: { required: false, type: 'boolean' },
  status: { required: true, type: 'enum', enum: ['draft', 'published', 'archived'] },
  stats: { required: false, type: 'object' },
  source: { required: true, type: 'enum', enum: ['manual', 'hudl', 'community'] },
  constraints: { required: false, type: 'object' },
  level_extensions: { required: false, type: 'object' },
  createdAt: { required: true, type: 'timestamp' },
  updatedAt: { required: true, type: 'timestamp' }
};

// ============================================
// VALIDATION SERVICE
// ============================================

export class DataValidator {
  /**
   * Validate a single field against its rules
   */
  private validateField(value: any, fieldName: string, rules: ValidationRule): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        value
      });
      return errors; // Don't check other rules if required field is missing
    }

    // Skip validation if value is not provided and not required
    if (value === undefined || value === null) {
      return errors;
    }

    // Type validation
    if (rules.type) {
      const typeError = this.validateType(value, rules.type, fieldName);
      if (typeError) {
        errors.push(typeError);
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rules.minLength} characters`,
          value
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be no more than ${rules.maxLength} characters`,
          value
        });
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} format is invalid`,
          value
        });
      }

      if (rules.type === 'email' && !this.isValidEmail(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a valid email address`,
          value
        });
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rules.min}`,
          value
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be no more than ${rules.max}`,
          value
        });
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must have at least ${rules.minLength} items`,
          value
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must have no more than ${rules.maxLength} items`,
          value
        });
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be one of: ${rules.enum.join(', ')}`,
        value
      });
    }

    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(value);
      if (customResult !== true) {
        errors.push({
          field: fieldName,
          message: typeof customResult === 'string' ? customResult : `${fieldName} validation failed`,
          value
        });
      }
    }

    return errors;
  }

  /**
   * Validate data against a schema
   */
  validateData<T>(data: T, schema: Record<string, ValidationRule>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate required fields
    Object.entries(schema).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(data[field as keyof T], field, rules);
      errors.push(...fieldErrors);
    });

    return errors;
  }

  /**
   * Validate a team
   */
  validateTeam(team: Team): ValidationError[] {
    return this.validateData(team, TeamValidationSchema);
  }

  /**
   * Validate a player
   */
  validatePlayer(player: Player): ValidationError[] {
    return this.validateData(player, PlayerValidationSchema);
  }

  /**
   * Validate a practice plan
   */
  validatePracticePlan(practicePlan: PracticePlan): ValidationError[] {
    return this.validateData(practicePlan, PracticePlanValidationSchema);
  }

  /**
   * Validate a play
   */
  validatePlay(play: Play): ValidationError[] {
    return this.validateData(play, PlayValidationSchema);
  }

  /**
   * Check if validation errors exist
   */
  hasErrors(errors: ValidationError[]): boolean {
    return errors.length > 0;
  }

  /**
   * Get error messages as a single string
   */
  getErrorMessage(errors: ValidationError[]): string {
    return errors.map(error => error.message).join(', ');
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate type
   */
  private validateType(value: any, expectedType: ValidationType, fieldName: string): ValidationError | null {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: fieldName,
            message: `${fieldName} must be a string`,
            value
          };
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field: fieldName,
            message: `${fieldName} must be a number`,
            value
          };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: fieldName,
            message: `${fieldName} must be a boolean`,
            value
          };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            field: fieldName,
            message: `${fieldName} must be an object`,
            value
          };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return {
            field: fieldName,
            message: `${fieldName} must be an array`,
            value
          };
        }
        break;
      case 'timestamp':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return {
            field: fieldName,
            message: `${fieldName} must be a valid date/timestamp`,
            value
          };
        }
        break;
    }
    return null;
  }
}

// Export a singleton instance
export const dataValidator = new DataValidator();

// ============================================
// VALIDATION HOOKS
// ============================================

export const useValidation = () => {
  const validate = <T>(data: Partial<T>, validator: (item: Partial<T>) => ValidationResult): ValidationResult => {
    return validator(data);
  };

  const validateAndSanitize = <T>(
    data: Partial<T>, 
    validator: (item: Partial<T>) => ValidationResult,
    sanitizer?: (item: Partial<T>) => Partial<T>
  ): { result: ValidationResult; sanitized: Partial<T> } => {
    const sanitized = sanitizer ? sanitizer(data) : data;
    const result = validator(sanitized);
    return { result, sanitized };
  };

  return {
    validate,
    validateAndSanitize,
    DataValidator: dataValidator
  };
};

export default dataValidator; 