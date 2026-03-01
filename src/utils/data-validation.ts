// src/utils/data-validation.ts
import { Timestamp } from 'firebase/firestore';
import { 
  User, Team, Player, PracticePlan, Play, 
  ValidationSchemas, UserRole, Sport, AgeGroup,
  PlayerPosition, PracticeStatus, PlayCategory
} from '../types/firestore-schema';

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'timestamp' | 'email';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: any) => boolean;
  message?: string;
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
// CORE VALIDATION FUNCTIONS
// ============================================

export class DataValidator {
  private static validateField(
    value: any, 
    fieldName: string, 
    rules: ValidationRule
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        message: rules.message || `${fieldName} is required`,
        value
      });
      return errors;
    }

    // Skip further validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Type validation
    if (rules.type) {
      const typeError = this.validateType(value, fieldName, rules.type);
      if (typeError) errors.push(typeError);
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: fieldName,
          message: rules.message || `${fieldName} must be at least ${rules.minLength} characters`,
          value
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: fieldName,
          message: rules.message || `${fieldName} must be no more than ${rules.maxLength} characters`,
          value
        });
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: rules.message || `${fieldName} format is invalid`,
          value
        });
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field: fieldName,
          message: rules.message || `${fieldName} must be at least ${rules.min}`,
          value
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field: fieldName,
          message: rules.message || `${fieldName} must be no more than ${rules.max}`,
          value
        });
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: fieldName,
          message: rules.message || `${fieldName} must have at least ${rules.minLength} items`,
          value
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: fieldName,
          message: rules.message || `${fieldName} must have no more than ${rules.maxLength} items`,
          value
        });
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: rules.message || `${fieldName} must be one of: ${rules.enum.join(', ')}`,
        value
      });
    }

    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      errors.push({
        field: fieldName,
        message: rules.message || `${fieldName} failed custom validation`,
        value
      });
    }

    return errors;
  }

  private static validateType(value: any, fieldName: string, expectedType: string): ValidationError | null {
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

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field: fieldName,
            message: `${fieldName} must be an array`,
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

      case 'timestamp':
        if (!(value instanceof Timestamp) && !(value instanceof Date)) {
          return {
            field: fieldName,
            message: `${fieldName} must be a timestamp`,
            value
          };
        }
        break;

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailPattern.test(value)) {
          return {
            field: fieldName,
            message: `${fieldName} must be a valid email address`,
            value
          };
        }
        break;
    }

    return null;
  }

  // ============================================
  // DOCUMENT VALIDATION METHODS
  // ============================================

  static validateUser(data: Partial<User>): ValidationResult {
    const errors: ValidationError[] = [];
    const schema = ValidationSchemas.user;

    // Validate required fields
    Object.entries(schema).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(data[field as keyof User], field, rules);
      errors.push(...fieldErrors);
    });

    // Custom validations
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        value: data.email
      });
    }

    if (data.roles && !this.validateRoles(data.roles)) {
      errors.push({
        field: 'roles',
        message: 'Invalid roles provided',
        value: data.roles
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateTeam(data: Partial<Team>): ValidationResult {
    const errors: ValidationError[] = [];
    const schema = ValidationSchemas.team;

    // Validate required fields
    Object.entries(schema).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(data[field as keyof Team], field, rules);
      errors.push(...fieldErrors);
    });

    // Custom validations
    if (data.sport && !this.isValidSport(data.sport)) {
      errors.push({
        field: 'sport',
        message: 'Invalid sport type',
        value: data.sport
      });
    }

    if (data.ageGroup && !this.isValidAgeGroup(data.ageGroup)) {
      errors.push({
        field: 'ageGroup',
        message: 'Invalid age group',
        value: data.ageGroup
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePlayer(data: Partial<Player>): ValidationResult {
    const errors: ValidationError[] = [];
    const schema = ValidationSchemas.player;

    // Validate required fields
    Object.entries(schema).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(data[field as keyof Player], field, rules);
      errors.push(...fieldErrors);
    });

    // Custom validations
    if (data.position && !this.isValidPlayerPosition(data.position)) {
      errors.push({
        field: 'position',
        message: 'Invalid player position',
        value: data.position
      });
    }

    if (data.jerseyNumber && (data.jerseyNumber < 0 || data.jerseyNumber > 99)) {
      errors.push({
        field: 'jerseyNumber',
        message: 'Jersey number must be between 0 and 99',
        value: data.jerseyNumber
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePracticePlan(data: Partial<PracticePlan>): ValidationResult {
    const errors: ValidationError[] = [];
    const schema = ValidationSchemas.practicePlan;

    // Validate required fields
    Object.entries(schema).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(data[field as keyof PracticePlan], field, rules);
      errors.push(...fieldErrors);
    });

    // Custom validations
    if (data.duration && (data.duration < 15 || data.duration > 480)) {
      errors.push({
        field: 'duration',
        message: 'Practice duration must be between 15 and 480 minutes',
        value: data.duration
      });
    }

    if (data.periods && data.periods.length > 0) {
      data.periods.forEach((period, index) => {
        if (!period.name || period.name.trim() === '') {
          errors.push({
            field: `periods[${index}].name`,
            message: 'Period name is required',
            value: period.name
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePlay(data: Partial<Play>): ValidationResult {
    const errors: ValidationError[] = [];
    const schema = ValidationSchemas.play;

    // Validate required fields
    Object.entries(schema).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(data[field as keyof Play], field, rules);
      errors.push(...fieldErrors);
    });

    // Custom validations
    if (data.category && !this.isValidPlayCategory(data.category)) {
      errors.push({
        field: 'category',
        message: 'Invalid play category',
        value: data.category
      });
    }

    if (data.routes && data.routes.length > 0) {
      data.routes.forEach((route, index) => {
        if (!route.playerId) {
          errors.push({
            field: `routes[${index}].playerId`,
            message: 'Route player ID is required',
            value: route.playerId
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================
  // HELPER VALIDATION METHODS
  // ============================================

  private static isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  private static validateRoles(roles: UserRole[]): boolean {
    const validRoles: UserRole[] = ['head_coach', 'assistant_coach', 'player', 'parent', 'admin'];
    return roles.every(role => validRoles.includes(role));
  }

  private static isValidSport(sport: string): boolean {
    const validSports: Sport[] = ['football', 'basketball', 'soccer', 'baseball', 'volleyball', 'hockey', 'lacrosse', 'track', 'swimming', 'tennis'];
    return validSports.includes(sport as Sport);
  }

  private static isValidAgeGroup(ageGroup: string): boolean {
    const validAgeGroups: AgeGroup[] = ['youth', 'middle_school', 'high_school', 'college', 'adult', 'senior'];
    return validAgeGroups.includes(ageGroup as AgeGroup);
  }

  private static isValidPlayerPosition(position: string): boolean {
    const validPositions: PlayerPosition[] = [
      'quarterback', 'running_back', 'wide_receiver', 'tight_end', 'offensive_line',
      'defensive_line', 'linebacker', 'cornerback', 'safety', 'kicker', 'punter',
      'point_guard', 'shooting_guard', 'small_forward', 'power_forward', 'center',
      'forward', 'midfielder', 'defender', 'goalkeeper', 'pitcher', 'catcher',
      'infielder', 'outfielder', 'utility'
    ];
    return validPositions.includes(position as PlayerPosition);
  }

  private static isValidPlayCategory(category: string): boolean {
    const validCategories: PlayCategory[] = ['offense', 'defense', 'special_teams', 'situational', 'red_zone', 'two_minute'];
    return validCategories.includes(category as PlayCategory);
  }

  // ============================================
  // BATCH VALIDATION
  // ============================================

  static validateBatch<T>(items: Partial<T>[], validator: (item: Partial<T>) => ValidationResult): ValidationResult[] {
    return items.map(item => validator(item));
  }

  static hasValidationErrors(results: ValidationResult[]): boolean {
    return results.some(result => !result.isValid);
  }

  static getAllErrors(results: ValidationResult[]): ValidationError[] {
    return results.flatMap(result => result.errors);
  }

  // ============================================
  // SANITIZATION METHODS
  // ============================================

  static sanitizeString(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  static sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  static sanitizeUserData(data: Partial<User>): Partial<User> {
    const sanitized = { ...data };

    if (sanitized.email) {
      sanitized.email = this.sanitizeEmail(sanitized.email);
    }

    if (sanitized.displayName) {
      sanitized.displayName = this.sanitizeString(sanitized.displayName);
    }

    if (sanitized.phoneNumber) {
      sanitized.phoneNumber = this.sanitizePhone(sanitized.phoneNumber);
    }

    return sanitized;
  }

  static sanitizeTeamData(data: Partial<Team>): Partial<Team> {
    const sanitized = { ...data };

    if (sanitized.name) {
      sanitized.name = this.sanitizeString(sanitized.name);
    }

    if (sanitized.location?.city) {
      sanitized.location.city = this.sanitizeString(sanitized.location.city);
    }

    if (sanitized.location?.state) {
      sanitized.location.state = this.sanitizeString(sanitized.location.state);
    }

    return sanitized;
  }

  static sanitizePlayerData(data: Partial<Player>): Partial<Player> {
    const sanitized = { ...data };

    if (sanitized.firstName) {
      sanitized.firstName = this.sanitizeString(sanitized.firstName);
    }

    if (sanitized.lastName) {
      sanitized.lastName = this.sanitizeString(sanitized.lastName);
    }

    if (sanitized.email) {
      sanitized.email = this.sanitizeEmail(sanitized.email);
    }

    if (sanitized.phone) {
      sanitized.phone = this.sanitizePhone(sanitized.phone);
    }

    if (sanitized.parentEmail) {
      sanitized.parentEmail = this.sanitizeEmail(sanitized.parentEmail);
    }

    if (sanitized.parentPhone) {
      sanitized.parentPhone = this.sanitizePhone(sanitized.parentPhone);
    }

    return sanitized;
  }
}

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
    DataValidator
  };
};

export default DataValidator; 