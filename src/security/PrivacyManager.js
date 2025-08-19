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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyManager = void 0;
// src/security/PrivacyManager.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
class PrivacyManager {
    /**
     * Initialize privacy settings for a new user
     */
    static initializePrivacy(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultSettings = {
                profileVisibility: 'team_only',
                allowDataCollection: false,
                allowAnonymousDataCollection: false,
                allowPerformanceTracking: false,
                allowUsageAnalytics: false,
                allowAIPersonalization: false,
                allowAITraining: false,
                allowAISuggestions: false,
                allowAIAnalytics: false,
                allowEmailNotifications: false,
                allowPushNotifications: false,
                allowSMSNotifications: false,
                allowInAppNotifications: true,
                dataRetentionPeriod: '90_days',
                autoDeleteInactiveData: true,
                deleteAccountDataOnDeactivation: true,
                allowDataExport: false,
                allowDataPortability: false,
                allowDataDeletion: true,
                deletionConfirmationRequired: true,
                showDataUsageHistory: true,
                showConsentHistory: true,
                showDataAccessLogs: true
            };
            yield (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'privacySettings', userId), defaultSettings);
            return defaultSettings;
        });
    }
    /**
     * Get privacy settings for a user
     */
    static getPrivacySettings(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, 'privacySettings', userId);
                const docSnap = yield (0, firestore_1.getDoc)(docRef);
                if (docSnap.exists()) {
                    return docSnap.data();
                }
                return null;
            }
            catch (error) {
                console.error('Error getting privacy settings:', error);
                return null;
            }
        });
    }
    /**
     * Update privacy settings
     */
    static updatePrivacySettings(userId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, 'privacySettings', userId);
                yield (0, firestore_1.updateDoc)(docRef, Object.assign(Object.assign({}, updates), { lastUpdated: (0, firestore_1.serverTimestamp)() }));
                return true;
            }
            catch (error) {
                console.error('Error updating privacy settings:', error);
                return false;
            }
        });
    }
    /**
     * Initialize compliance settings
     */
    static initializeCompliance(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultCompliance = {
                gdpr: {
                    dataProcessingBasis: 'consent',
                    dataSubjectRights: {
                        rightToAccess: false,
                        rightToRectification: false,
                        rightToErasure: false,
                        rightToPortability: false,
                        rightToObject: false,
                        rightToRestriction: false
                    },
                    dataProtectionOfficer: undefined,
                    dataBreachNotification: false
                },
                coppa: {
                    under13Protection: false,
                    parentalConsentRequired: false,
                    limitedDataCollection: false,
                    noPersonalizedAds: false,
                    parentalAccess: false
                },
                ferpa: {
                    educationalInstitution: false,
                    studentDataProtection: false,
                    parentConsentRequired: false,
                    directoryInformationOptOut: false,
                    annualNotification: false
                },
                hipaa: {
                    coveredEntity: false,
                    phiProtection: false,
                    minimumNecessary: true,
                    accessControls: false,
                    auditTrail: false
                },
                lastUpdated: (0, firestore_1.serverTimestamp)()
            };
            yield (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'privacyCompliance', userId), defaultCompliance);
            return defaultCompliance;
        });
    }
    /**
     * Get compliance settings
     */
    static getCompliance(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, 'privacyCompliance', userId);
                const docSnap = yield (0, firestore_1.getDoc)(docRef);
                if (docSnap.exists()) {
                    return docSnap.data();
                }
                return null;
            }
            catch (error) {
                console.error('Error getting compliance settings:', error);
                return null;
            }
        });
    }
    /**
     * Check if user is under 13 (COPPA compliance)
     */
    static isUnder13(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.birthDate) {
                        const age = this.calculateAge(userData.birthDate.toDate());
                        return age < 13;
                    }
                }
                return false;
            }
            catch (error) {
                console.error('Error checking user age:', error);
                return false;
            }
        });
    }
    /**
     * Calculate age from birth date
     */
    static calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    /**
     * Check if data collection is allowed
     */
    static canCollectData(userId, dataType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = yield this.getPrivacySettings(userId);
                if (!settings)
                    return false;
                if (!settings.allowDataCollection)
                    return false;
                // Check age restrictions for certain data types
                if (dataType === 'biometric' || dataType === 'location') {
                    const isUnder13 = yield this.isUnder13(userId);
                    if (isUnder13)
                        return false;
                }
                return true;
            }
            catch (error) {
                console.error('Error checking data collection permission:', error);
                return false;
            }
        });
    }
    /**
     * Check if AI training is allowed
     */
    static canTrainAI(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = yield this.getPrivacySettings(userId);
                if (!settings)
                    return false;
                return settings.allowAITraining;
            }
            catch (error) {
                console.error('Error checking AI training permission:', error);
                return false;
            }
        });
    }
    /**
     * Check if data export is allowed
     */
    static canExportData(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = yield this.getPrivacySettings(userId);
                if (!settings)
                    return false;
                return settings.allowDataExport;
            }
            catch (error) {
                console.error('Error checking data export permission:', error);
                return false;
            }
        });
    }
    /**
     * Get data retention period for user
     */
    static getDataRetentionPeriod(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = yield this.getPrivacySettings(userId);
                if (!settings)
                    return 90; // Default 90 days
                switch (settings.dataRetentionPeriod) {
                    case '30_days': return 30;
                    case '90_days': return 90;
                    case '1_year': return 365;
                    case '2_years': return 730;
                    default: return 90;
                }
            }
            catch (error) {
                console.error('Error getting data retention period:', error);
                return 90;
            }
        });
    }
}
exports.PrivacyManager = PrivacyManager;
