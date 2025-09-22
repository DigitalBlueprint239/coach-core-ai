// src/security/DataAnonymizer.ts
import { Timestamp } from 'firebase/firestore';
import { AnonymizedData, AnonymizationMetadata } from '../types/privacy-schema';

export class DataAnonymizer {
  private static readonly PII_FIELDS = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'address',
    'playerNames',
    'coachNames',
    'teamNames',
    'schoolNames',
    'parentEmail',
    'parentPhone',
    'emergencyContact',
  ];

  private static readonly SENSITIVE_FIELDS = [
    'medicalInfo',
    'insuranceInfo',
    'allergies',
    'medications',
    'conditions',
    'emergencyContact',
    'parentEmail',
    'parentPhone',
  ];

  private static readonly ANONYMIZATION_METHODS = {
    hash: this.hashValue.bind(this),
    mask: this.maskValue.bind(this),
    generalize: this.generalizeValue.bind(this),
    remove: this.removeValue.bind(this),
    pseudonymize: this.pseudonymizeValue.bind(this),
  };

  /**
   * Anonymize data for AI training
   */
  static async anonymize(
    data: any,
    dataType: string,
    anonymizationLevel: 'low' | 'medium' | 'high' = 'high'
  ): Promise<AnonymizedData> {
    const startTime = Date.now();
    const originalDataSize = JSON.stringify(data).length;

    // Deep clone the data to avoid modifying original
    const dataCopy = JSON.parse(JSON.stringify(data));

    // Remove PII fields completely
    const piiFieldsRemoved = this.removePIIFields(dataCopy);

    // Mask sensitive fields
    const sensitiveFieldsMasked = this.maskSensitiveFields(dataCopy);

    // Apply level-specific anonymization
    const anonymizedData = this.applyLevelAnonymization(
      dataCopy,
      anonymizationLevel
    );

    // Generate metadata
    const metadata: AnonymizationMetadata = {
      originalDataSize,
      anonymizedDataSize: JSON.stringify(anonymizedData).length,
      piiFieldsRemoved,
      sensitiveFieldsMasked,
      anonymizationVersion: '1.0',
      complianceStandards: ['GDPR', 'FERPA', 'COPPA'],
    };

    // Calculate retention period
    const retentionPeriod = this.calculateRetentionPeriod(
      dataType,
      anonymizationLevel
    );
    const expiresAt = new Timestamp(
      Math.floor(Date.now() / 1000) + retentionPeriod,
      0
    );

    return {
      id: this.generateAnonymizedId(),
      originalDataType: dataType,
      anonymizedData,
      anonymizationLevel,
      anonymizationMethod: this.getAnonymizationMethod(anonymizationLevel),
      retentionPeriod: this.formatRetentionPeriod(retentionPeriod),
      createdAt: Timestamp.now(),
      expiresAt,
      metadata,
    };
  }

  /**
   * Remove all PII fields from data
   */
  private static removePIIFields(data: any): string[] {
    const removedFields: string[] = [];

    const removePII = (obj: any, path: string = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;

        if (this.PII_FIELDS.includes(key)) {
          delete obj[key];
          removedFields.push(currentPath);
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any, index: number) => {
            removePII(item, `${currentPath}[${index}]`);
          });
        } else if (typeof obj[key] === 'object') {
          removePII(obj[key], currentPath);
        }
      }
    };

    removePII(data);
    return removedFields;
  }

  /**
   * Mask sensitive fields
   */
  private static maskSensitiveFields(data: any): string[] {
    const maskedFields: string[] = [];

    const maskSensitive = (obj: any, path: string = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;

        if (this.SENSITIVE_FIELDS.includes(key)) {
          obj[key] = this.maskValue(obj[key]);
          maskedFields.push(currentPath);
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any, index: number) => {
            maskSensitive(item, `${currentPath}[${index}]`);
          });
        } else if (typeof obj[key] === 'object') {
          maskSensitive(obj[key], currentPath);
        }
      }
    };

    maskSensitive(data);
    return maskedFields;
  }

  /**
   * Apply level-specific anonymization
   */
  private static applyLevelAnonymization(
    data: any,
    level: 'low' | 'medium' | 'high'
  ): any {
    switch (level) {
      case 'low':
        return this.applyLowLevelAnonymization(data);
      case 'medium':
        return this.applyMediumLevelAnonymization(data);
      case 'high':
        return this.applyHighLevelAnonymization(data);
      default:
        return this.applyHighLevelAnonymization(data);
    }
  }

  /**
   * Low-level anonymization (minimal changes)
   */
  private static applyLowLevelAnonymization(data: any): any {
    // Only remove obvious PII, keep most data structure
    return data;
  }

  /**
   * Medium-level anonymization (moderate changes)
   */
  private static applyMediumLevelAnonymization(data: any): any {
    const anonymized = { ...data };

    // Generalize specific values
    if (anonymized.age) {
      anonymized.age = this.generalizeAge(anonymized.age);
    }

    if (anonymized.location) {
      anonymized.location = this.generalizeLocation(anonymized.location);
    }

    if (anonymized.timestamp) {
      anonymized.timestamp = this.generalizeTimestamp(anonymized.timestamp);
    }

    return anonymized;
  }

  /**
   * High-level anonymization (maximum privacy)
   */
  private static applyHighLevelAnonymization(data: any): any {
    const anonymized: any = {};

    // Only keep essential patterns and metrics
    if (data.sport) anonymized.sport = data.sport;
    if (data.level) anonymized.level = data.level;
    if (data.duration)
      anonymized.duration = this.generalizeDuration(data.duration);
    if (data.difficulty) anonymized.difficulty = data.difficulty;
    if (data.category) anonymized.category = data.category;

    // Anonymize metrics
    if (data.stats) {
      anonymized.stats = this.anonymizeStats(data.stats);
    }

    // Anonymize patterns
    if (data.patterns) {
      anonymized.patterns = this.anonymizePatterns(data.patterns);
    }

    return anonymized;
  }

  /**
   * Utility methods for anonymization
   */
  private static hashValue(value: string): string {
    return btoa(value).slice(0, 8);
  }

  private static maskValue(value: any): string {
    if (typeof value === 'string') {
      return value.length > 2
        ? `${value[0]}***${value[value.length - 1]}`
        : '***';
    }
    return '***';
  }

  private static generalizeValue(value: any, type: string): any {
    switch (type) {
      case 'age':
        return this.generalizeAge(value);
      case 'location':
        return this.generalizeLocation(value);
      case 'timestamp':
        return this.generalizeTimestamp(value);
      default:
        return value;
    }
  }

  private static removeValue(value: any): null {
    return null;
  }

  private static pseudonymizeValue(value: string): string {
    return `anon_${this.hashValue(value)}`;
  }

  private static generalizeAge(age: number): string {
    if (age < 13) return 'under_13';
    if (age < 18) return '13_17';
    if (age < 25) return '18_24';
    if (age < 35) return '25_34';
    if (age < 50) return '35_49';
    return '50_plus';
  }

  private static generalizeLocation(location: any): any {
    if (typeof location === 'string') {
      // Keep only state/country level
      const parts = location.split(',').map((p: string) => p.trim());
      return parts.length > 1 ? parts.slice(-2).join(', ') : location;
    }
    return location;
  }

  private static generalizeTimestamp(timestamp: any): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private static generalizeDuration(duration: number): string {
    if (duration < 30) return 'short';
    if (duration < 90) return 'medium';
    return 'long';
  }

  private static anonymizeStats(stats: any): any {
    const anonymized: any = {};

    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        // Round to nearest 10% for privacy
        anonymized[key] = Math.round(value * 10) / 10;
      } else {
        anonymized[key] = value;
      }
    }

    return anonymized;
  }

  private static anonymizePatterns(patterns: any): any {
    // Keep pattern structure but remove specific details
    return {
      type: patterns.type,
      frequency: patterns.frequency,
      category: patterns.category,
    };
  }

  private static generateAnonymizedId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static calculateRetentionPeriod(
    dataType: string,
    level: string
  ): number {
    // Return retention period in seconds
    const basePeriods = {
      practice_plan: 2 * 365 * 24 * 60 * 60, // 2 years
      player_data: 1 * 365 * 24 * 60 * 60, // 1 year
      team_data: 2 * 365 * 24 * 60 * 60, // 2 years
      analytics: 90 * 24 * 60 * 60, // 90 days
      ai_training: 2 * 365 * 24 * 60 * 60, // 2 years
    };

    return (
      basePeriods[dataType as keyof typeof basePeriods] || 365 * 24 * 60 * 60
    );
  }

  private static formatRetentionPeriod(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return `${years}_year${years > 1 ? 's' : ''}`;
    }
    return `${days}_days`;
  }

  private static getAnonymizationMethod(level: string): string {
    const methods = {
      low: 'hash_and_mask',
      medium: 'generalize_and_pseudonymize',
      high: 'comprehensive_anonymization',
    };
    return (
      methods[level as keyof typeof methods] || 'comprehensive_anonymization'
    );
  }
}
