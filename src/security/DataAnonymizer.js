"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAnonymizer = void 0;
// src/security/DataAnonymizer.ts
const firestore_1 = require("firebase/firestore");
class DataAnonymizer {
    /**
     * Anonymize data for AI training
     */
    static anonymize(data, dataType, anonymizationLevel = 'high') {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const originalDataSize = JSON.stringify(data).length;
            // Deep clone the data to avoid modifying original
            const dataCopy = JSON.parse(JSON.stringify(data));
            // Remove PII fields completely
            const piiFieldsRemoved = this.removePIIFields(dataCopy);
            // Mask sensitive fields
            const sensitiveFieldsMasked = this.maskSensitiveFields(dataCopy);
            // Apply level-specific anonymization
            const anonymizedData = this.applyLevelAnonymization(dataCopy, anonymizationLevel);
            // Generate metadata
            const metadata = {
                originalDataSize,
                anonymizedDataSize: JSON.stringify(anonymizedData).length,
                piiFieldsRemoved,
                sensitiveFieldsMasked,
                anonymizationVersion: '1.0',
                complianceStandards: ['GDPR', 'FERPA', 'COPPA']
            };
            // Calculate retention period
            const retentionPeriod = this.calculateRetentionPeriod(dataType, anonymizationLevel);
            const expiresAt = new firestore_1.Timestamp(Math.floor(Date.now() / 1000) + retentionPeriod, 0);
            return {
                id: this.generateAnonymizedId(),
                originalDataType: dataType,
                anonymizedData,
                anonymizationLevel,
                anonymizationMethod: this.getAnonymizationMethod(anonymizationLevel),
                retentionPeriod: this.formatRetentionPeriod(retentionPeriod),
                createdAt: firestore_1.Timestamp.now(),
                expiresAt,
                metadata
            };
        });
    }
    /**
     * Remove all PII fields from data
     */
    static removePIIFields(data) {
        const removedFields = [];
        const removePII = (obj, path = '') => {
            if (typeof obj !== 'object' || obj === null)
                return;
            for (const key in obj) {
                const currentPath = path ? `${path}.${key}` : key;
                if (this.PII_FIELDS.includes(key)) {
                    delete obj[key];
                    removedFields.push(currentPath);
                }
                else if (Array.isArray(obj[key])) {
                    obj[key].forEach((item, index) => {
                        removePII(item, `${currentPath}[${index}]`);
                    });
                }
                else if (typeof obj[key] === 'object') {
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
    static maskSensitiveFields(data) {
        const maskedFields = [];
        const maskSensitive = (obj, path = '') => {
            if (typeof obj !== 'object' || obj === null)
                return;
            for (const key in obj) {
                const currentPath = path ? `${path}.${key}` : key;
                if (this.SENSITIVE_FIELDS.includes(key)) {
                    obj[key] = this.maskValue(obj[key]);
                    maskedFields.push(currentPath);
                }
                else if (Array.isArray(obj[key])) {
                    obj[key].forEach((item, index) => {
                        maskSensitive(item, `${currentPath}[${index}]`);
                    });
                }
                else if (typeof obj[key] === 'object') {
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
    static applyLevelAnonymization(data, level) {
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
    static applyLowLevelAnonymization(data) {
        // Only remove obvious PII, keep most data structure
        return data;
    }
    /**
     * Medium-level anonymization (moderate changes)
     */
    static applyMediumLevelAnonymization(data) {
        const anonymized = Object.assign({}, data);
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
    static applyHighLevelAnonymization(data) {
        const anonymized = {};
        // Only keep essential patterns and metrics
        if (data.sport)
            anonymized.sport = data.sport;
        if (data.level)
            anonymized.level = data.level;
        if (data.duration)
            anonymized.duration = this.generalizeDuration(data.duration);
        if (data.difficulty)
            anonymized.difficulty = data.difficulty;
        if (data.category)
            anonymized.category = data.category;
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
    static hashValue(value) {
        return btoa(value).slice(0, 8);
    }
    static maskValue(value) {
        if (typeof value === 'string') {
            return value.length > 2 ? `${value[0]}***${value[value.length - 1]}` : '***';
        }
        return '***';
    }
    static generalizeValue(value, type) {
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
    static removeValue(value) {
        return null;
    }
    static pseudonymizeValue(value) {
        return `anon_${this.hashValue(value)}`;
    }
    static generalizeAge(age) {
        if (age < 13)
            return 'under_13';
        if (age < 18)
            return '13_17';
        if (age < 25)
            return '18_24';
        if (age < 35)
            return '25_34';
        if (age < 50)
            return '35_49';
        return '50_plus';
    }
    static generalizeLocation(location) {
        if (typeof location === 'string') {
            // Keep only state/country level
            const parts = location.split(',').map((p) => p.trim());
            return parts.length > 1 ? parts.slice(-2).join(', ') : location;
        }
        return location;
    }
    static generalizeTimestamp(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    static generalizeDuration(duration) {
        if (duration < 30)
            return 'short';
        if (duration < 90)
            return 'medium';
        return 'long';
    }
    static anonymizeStats(stats) {
        const anonymized = {};
        for (const [key, value] of Object.entries(stats)) {
            if (typeof value === 'number') {
                // Round to nearest 10% for privacy
                anonymized[key] = Math.round(value * 10) / 10;
            }
            else {
                anonymized[key] = value;
            }
        }
        return anonymized;
    }
    static anonymizePatterns(patterns) {
        // Keep pattern structure but remove specific details
        return {
            type: patterns.type,
            frequency: patterns.frequency,
            category: patterns.category
        };
    }
    static generateAnonymizedId() {
        return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static calculateRetentionPeriod(dataType, level) {
        // Return retention period in seconds
        const basePeriods = {
            'practice_plan': 2 * 365 * 24 * 60 * 60, // 2 years
            'player_data': 1 * 365 * 24 * 60 * 60, // 1 year
            'team_data': 2 * 365 * 24 * 60 * 60, // 2 years
            'analytics': 90 * 24 * 60 * 60, // 90 days
            'ai_training': 2 * 365 * 24 * 60 * 60 // 2 years
        };
        return basePeriods[dataType] || 365 * 24 * 60 * 60;
    }
    static formatRetentionPeriod(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        if (days >= 365) {
            const years = Math.floor(days / 365);
            return `${years}_year${years > 1 ? 's' : ''}`;
        }
        return `${days}_days`;
    }
    static getAnonymizationMethod(level) {
        const methods = {
            'low': 'hash_and_mask',
            'medium': 'generalize_and_pseudonymize',
            'high': 'comprehensive_anonymization'
        };
        return methods[level] || 'comprehensive_anonymization';
    }
}
exports.DataAnonymizer = DataAnonymizer;
_a = DataAnonymizer;
DataAnonymizer.PII_FIELDS = [
    'firstName', 'lastName', 'email', 'phone', 'address',
    'playerNames', 'coachNames', 'teamNames', 'schoolNames',
    'parentEmail', 'parentPhone', 'emergencyContact'
];
DataAnonymizer.SENSITIVE_FIELDS = [
    'medicalInfo', 'insuranceInfo', 'allergies', 'medications',
    'conditions', 'emergencyContact', 'parentEmail', 'parentPhone'
];
DataAnonymizer.ANONYMIZATION_METHODS = {
    'hash': _a.hashValue.bind(_a),
    'mask': _a.maskValue.bind(_a),
    'generalize': _a.generalizeValue.bind(_a),
    'remove': _a.removeValue.bind(_a),
    'pseudonymize': _a.pseudonymizeValue.bind(_a)
};
