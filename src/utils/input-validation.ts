// src/utils/input-validation.ts
// Comprehensive input validation utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  sanitize?: (value: any) => any;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  lettersOnly: /^[a-zA-Z\s]+$/,
  numbersOnly: /^[0-9]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  weakPassword: /^.{6,}$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  teamName: /^[a-zA-Z0-9\s\-_]{2,50}$/,
  playerName: /^[a-zA-Z\s]{2,30}$/,
  playName: /^[a-zA-Z0-9\s\-_]{3,40}$/,
  drillName: /^[a-zA-Z0-9\s\-_]{3,50}$/,
  practiceTitle: /^[a-zA-Z0-9\s\-_]{3,60}$/,
  gameTitle: /^[a-zA-Z0-9\s\-_]{3,60}$/,
  ageGroup: /^(u\d{1,2}|\d{1,2}-\d{1,2}|adult|youth|junior|senior)$/i,
  sport: /^(football|basketball|soccer|baseball|softball|hockey|lacrosse|tennis|volleyball|wrestling|track|field|swimming|golf|cheerleading|dance|martial arts|boxing|mma|other)$/i,
  position: /^[a-zA-Z\s]{2,20}$/,
  jerseyNumber: /^[0-9]{1,3}$/,
  height: /^[0-9]'[0-9]{1,2}"?$/,
  weight: /^[0-9]{2,3}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  duration: /^[0-9]{1,3}$/,
  score: /^[0-9]{1,3}$/,
  percentage: /^[0-9]{1,3}%?$/,
  rating: /^[1-5]$/,
  boolean: /^(true|false|yes|no|1|0)$/i,
  color: /^#[0-9A-Fa-f]{6}$/,
  coordinates: /^-?\d+\.?\d*,-?\d+\.?\d*$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  version: /^\d+\.\d+\.\d+$/,
  semver: /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+)?(?:\+[a-zA-Z0-9-]+)?$/,
};

// Common validation rules
export const VALIDATION_RULES = {
  email: {
    required: true,
    pattern: VALIDATION_PATTERNS.email,
    maxLength: 254,
  },
  password: {
    required: true,
    minLength: 8,
    pattern: VALIDATION_PATTERNS.strongPassword,
  },
  weakPassword: {
    required: true,
    minLength: 6,
    pattern: VALIDATION_PATTERNS.weakPassword,
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: VALIDATION_PATTERNS.username,
  },
  teamName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: VALIDATION_PATTERNS.teamName,
  },
  playerName: {
    required: true,
    minLength: 2,
    maxLength: 30,
    pattern: VALIDATION_PATTERNS.playerName,
  },
  playName: {
    required: true,
    minLength: 3,
    maxLength: 40,
    pattern: VALIDATION_PATTERNS.playName,
  },
  drillName: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: VALIDATION_PATTERNS.drillName,
  },
  practiceTitle: {
    required: true,
    minLength: 3,
    maxLength: 60,
    pattern: VALIDATION_PATTERNS.practiceTitle,
  },
  gameTitle: {
    required: true,
    minLength: 3,
    maxLength: 60,
    pattern: VALIDATION_PATTERNS.gameTitle,
  },
  ageGroup: {
    required: true,
    pattern: VALIDATION_PATTERNS.ageGroup,
  },
  sport: {
    required: true,
    pattern: VALIDATION_PATTERNS.sport,
  },
  position: {
    required: true,
    minLength: 2,
    maxLength: 20,
    pattern: VALIDATION_PATTERNS.position,
  },
  jerseyNumber: {
    required: true,
    pattern: VALIDATION_PATTERNS.jerseyNumber,
  },
  height: {
    required: false,
    pattern: VALIDATION_PATTERNS.height,
  },
  weight: {
    required: false,
    pattern: VALIDATION_PATTERNS.weight,
  },
  date: {
    required: true,
    pattern: VALIDATION_PATTERNS.date,
  },
  time: {
    required: true,
    pattern: VALIDATION_PATTERNS.time,
  },
  duration: {
    required: true,
    pattern: VALIDATION_PATTERNS.duration,
  },
  score: {
    required: true,
    pattern: VALIDATION_PATTERNS.score,
  },
  percentage: {
    required: false,
    pattern: VALIDATION_PATTERNS.percentage,
  },
  rating: {
    required: true,
    pattern: VALIDATION_PATTERNS.rating,
  },
  boolean: {
    required: true,
    pattern: VALIDATION_PATTERNS.boolean,
  },
  color: {
    required: false,
    pattern: VALIDATION_PATTERNS.color,
  },
  coordinates: {
    required: false,
    pattern: VALIDATION_PATTERNS.coordinates,
  },
  ipAddress: {
    required: false,
    pattern: VALIDATION_PATTERNS.ipAddress,
  },
  uuid: {
    required: true,
    pattern: VALIDATION_PATTERNS.uuid,
  },
  slug: {
    required: true,
    pattern: VALIDATION_PATTERNS.slug,
  },
  version: {
    required: true,
    pattern: VALIDATION_PATTERNS.version,
  },
  semver: {
    required: true,
    pattern: VALIDATION_PATTERNS.semver,
  },
};

// Sanitization functions
export const sanitizeInput = (value: any, type: string): any => {
  if (value === null || value === undefined) {
    return value;
  }

  switch (type) {
    case 'string':
      return String(value).trim();
    case 'email':
      return String(value).toLowerCase().trim();
    case 'username':
      return String(value).toLowerCase().trim();
    case 'slug':
      return String(value).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    case 'number':
      return Number(value);
    case 'integer':
      return parseInt(String(value), 10);
    case 'float':
      return parseFloat(String(value));
    case 'boolean':
      if (typeof value === 'boolean') return value;
      const str = String(value).toLowerCase();
      return str === 'true' || str === 'yes' || str === '1';
    case 'date':
      return new Date(value);
    case 'array':
      return Array.isArray(value) ? value : [value];
    case 'object':
      return typeof value === 'object' ? value : {};
    default:
      return value;
  }
};

// Validate a single field
export const validateField = (
  value: any,
  rules: ValidationRule,
  fieldName: string
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if value is empty
  const isEmpty = value === null || value === undefined || value === '';

  // Required validation
  if (rules.required && isEmpty) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors, warnings };
  }

  // Skip other validations if value is empty and not required
  if (isEmpty) {
    return { isValid: true, errors, warnings };
  }

  // Sanitize value if sanitize function is provided
  let sanitizedValue = value;
  if (rules.sanitize) {
    sanitizedValue = rules.sanitize(value);
  }

  // Length validations
  if (typeof sanitizedValue === 'string') {
    if (rules.minLength && sanitizedValue.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
    }
    if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
      errors.push(`${fieldName} must be no more than ${rules.maxLength} characters long`);
    }
  }

  // Pattern validation
  if (rules.pattern && typeof sanitizedValue === 'string') {
    if (!rules.pattern.test(sanitizedValue)) {
      errors.push(`${fieldName} format is invalid`);
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(sanitizedValue);
    if (customError) {
      errors.push(customError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Validate an object against a schema
export const validateObject = (
  data: any,
  schema: ValidationSchema
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldValue = data[fieldName];
    const fieldResult = validateField(fieldValue, rules, fieldName);
    
    errors.push(...fieldResult.errors);
    warnings.push(...fieldResult.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Validate and sanitize an object
export const validateAndSanitize = (
  data: any,
  schema: ValidationSchema
): { data: any; result: ValidationResult } => {
  const sanitizedData: any = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldValue = data[fieldName];
    
    // Sanitize value if sanitize function is provided
    let sanitizedValue = fieldValue;
    if (rules.sanitize) {
      sanitizedValue = rules.sanitize(fieldValue);
    }
    
    sanitizedData[fieldName] = sanitizedValue;
    
    // Validate the sanitized value
    const fieldResult = validateField(sanitizedValue, rules, fieldName);
    errors.push(...fieldResult.errors);
    warnings.push(...fieldResult.warnings);
  }

  return {
    data: sanitizedData,
    result: {
      isValid: errors.length === 0,
      errors,
      warnings,
    },
  };
};

// Common validation schemas
export const VALIDATION_SCHEMAS = {
  user: {
    email: VALIDATION_RULES.email,
    displayName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: VALIDATION_PATTERNS.lettersOnly,
    },
    photoURL: {
      required: false,
      pattern: VALIDATION_PATTERNS.url,
    },
  },
  team: {
    name: VALIDATION_RULES.teamName,
    sport: VALIDATION_RULES.sport,
    ageGroup: VALIDATION_RULES.ageGroup,
    description: {
      required: false,
      maxLength: 500,
    },
  },
  player: {
    name: VALIDATION_RULES.playerName,
    position: VALIDATION_RULES.position,
    jerseyNumber: VALIDATION_RULES.jerseyNumber,
    height: VALIDATION_RULES.height,
    weight: VALIDATION_RULES.weight,
    age: {
      required: false,
      pattern: /^[0-9]{1,2}$/,
    },
  },
  play: {
    name: VALIDATION_RULES.playName,
    description: {
      required: false,
      maxLength: 500,
    },
    formation: {
      required: true,
      minLength: 3,
      maxLength: 20,
    },
    type: {
      required: true,
      pattern: /^(offense|defense|special)$/,
    },
  },
  practice: {
    title: VALIDATION_RULES.practiceTitle,
    description: {
      required: false,
      maxLength: 1000,
    },
    duration: VALIDATION_RULES.duration,
    date: VALIDATION_RULES.date,
    time: VALIDATION_RULES.time,
  },
  drill: {
    name: VALIDATION_RULES.drillName,
    description: {
      required: false,
      maxLength: 500,
    },
    duration: VALIDATION_RULES.duration,
    category: {
      required: true,
      minLength: 2,
      maxLength: 30,
    },
  },
  game: {
    title: VALIDATION_RULES.gameTitle,
    opponent: {
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    date: VALIDATION_RULES.date,
    time: VALIDATION_RULES.time,
    location: {
      required: false,
      maxLength: 100,
    },
  },
  waitlist: {
    email: VALIDATION_RULES.email,
    source: {
      required: false,
      maxLength: 50,
    },
  },
  feedback: {
    feedback: {
      required: true,
      minLength: 10,
      maxLength: 1000,
    },
    category: {
      required: true,
      pattern: /^(bug|feature|ui|performance|other)$/,
    },
    priority: {
      required: true,
      pattern: /^(low|medium|high|critical)$/,
    },
  },
};

// Export default validation function
export const validate = validateObject;
export const validateAndSanitizeObject = validateAndSanitize;
export const sanitize = sanitizeInput;

