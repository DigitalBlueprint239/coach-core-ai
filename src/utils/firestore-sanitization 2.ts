// src/utils/firestore-sanitization.ts
import { serverTimestamp } from 'firebase/firestore';

/**
 * Sanitizes data for Firestore writes by removing undefined/null fields
 * and logging any skipped values for debugging purposes
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(
  data: T,
  context?: string
): T {
  const sanitized: any = {};
  const skippedFields: string[] = [];
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      skippedFields.push(key);
      warnings.push(`Skipped undefined field '${key}'`);
    } else if (value === null) {
      // Firestore allows null values, but we might want to handle them differently
      // For now, we'll keep null values but log them
      sanitized[key] = value;
      warnings.push(`Field '${key}' contains null value`);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      const sanitizedNested = sanitizeFirestoreData(value, `${context ? context + '.' : ''}${key}`);
      if (Object.keys(sanitizedNested).length > 0) {
        sanitized[key] = sanitizedNested;
      } else {
        skippedFields.push(key);
        warnings.push(`Skipped empty object field '${key}'`);
      }
    } else if (Array.isArray(value)) {
      // Sanitize arrays by filtering out undefined values
      const sanitizedArray = value
        .map((item, index) => {
          if (item === undefined) {
            warnings.push(`Skipped undefined array item at index ${index} in field '${key}'`);
            return null; // Mark for filtering
          }
          if (typeof item === 'object' && item !== null) {
            return sanitizeFirestoreData(item, `${context ? context + '.' : ''}${key}[${index}]`);
          }
          return item;
        })
        .filter(item => item !== null);
      
      sanitized[key] = sanitizedArray;
    } else {
      // Primitive values (string, number, boolean, etc.)
      sanitized[key] = value;
    }
  }

  // Log warnings if any fields were skipped or had issues
  if (warnings.length > 0) {
    console.warn(`[Firestore Sanitization] ${context || 'Unknown context'}:`, {
      skippedFields,
      warnings,
      originalData: data,
      sanitizedData: sanitized
    });
  }

  return sanitized as T;
}

/**
 * Sanitizes data specifically for Firestore document creation
 * Adds required fields like createdAt and updatedAt
 */
export function sanitizeForFirestoreCreate<T extends Record<string, any>>(
  data: T,
  context?: string
): T & { createdAt: any; updatedAt: any } {
  const sanitized = sanitizeFirestoreData(data, context);
  
  return {
    ...sanitized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Sanitizes data specifically for Firestore document updates
 * Adds updatedAt field and ensures no undefined values
 */
export function sanitizeForFirestoreUpdate<T extends Record<string, any>>(
  data: T,
  context?: string
): T & { updatedAt: any } {
  const sanitized = sanitizeFirestoreData(data, context);
  
  return {
    ...sanitized,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Validates that required fields are present before Firestore write
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[],
  context?: string
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(String(field));
    }
  }
  
  if (missingFields.length > 0) {
    console.error(`[Firestore Validation] ${context || 'Unknown context'}: Missing required fields:`, {
      missingFields,
      data
    });
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Comprehensive Firestore write preparation
 * Combines validation, sanitization, and adds required fields
 */
export function prepareFirestoreWrite<T extends Record<string, any>>(
  data: T,
  options: {
    context?: string;
    requiredFields?: (keyof T)[];
    isUpdate?: boolean;
  } = {}
): { data: T; isValid: boolean; warnings: string[] } {
  const { context, requiredFields = [], isUpdate = false } = options;
  const warnings: string[] = [];
  
  // Validate required fields
  if (requiredFields.length > 0) {
    const validation = validateRequiredFields(data, requiredFields, context);
    if (!validation.isValid) {
      return {
        data: {} as T,
        isValid: false,
        warnings: [`Missing required fields: ${validation.missingFields.join(', ')}`]
      };
    }
  }
  
  // Sanitize data
  const sanitized = isUpdate 
    ? sanitizeForFirestoreUpdate(data, context)
    : sanitizeForFirestoreCreate(data, context);
  
  // Check for any warnings from sanitization
  const hasWarnings = Object.keys(sanitized).length !== Object.keys(data).length;
  if (hasWarnings) {
    warnings.push('Some fields were sanitized or removed');
  }
  
  return {
    data: sanitized,
    isValid: true,
    warnings
  };
}

/**
 * Type-safe wrapper for Firestore operations with automatic sanitization
 */
export class FirestoreWriteHelper {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  /**
   * Prepare data for document creation
   */
  prepareCreate<T extends Record<string, any>>(
    data: T,
    requiredFields?: (keyof T)[]
  ) {
    return prepareFirestoreWrite(data, {
      context: this.context,
      requiredFields,
      isUpdate: false
    });
  }
  
  /**
   * Prepare data for document update
   */
  prepareUpdate<T extends Record<string, any>>(
    data: T,
    requiredFields?: (keyof T)[]
  ) {
    return prepareFirestoreWrite(data, {
      context: this.context,
      requiredFields,
      isUpdate: true
    });
  }
  
  /**
   * Log Firestore operation result
   */
  logResult(operation: string, success: boolean, docId?: string, warnings?: string[]) {
    const level = success ? 'info' : 'error';
    const message = `[Firestore ${operation}] ${this.context}${docId ? ` (${docId})` : ''}`;
    
    if (success) {
      console.log(message, { warnings });
    } else {
      console.error(message, { warnings });
    }
  }
}

/**
 * Create a Firestore write helper for a specific context
 */
export function createFirestoreHelper(context: string) {
  return new FirestoreWriteHelper(context);
}

