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
exports.ConsentManager = void 0;
// src/security/ConsentManager.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
class ConsentManager {
    /**
     * Initialize consent settings for a new user
     */
    static initializeConsent(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultConsent = {
                aiTraining: 'pending',
                aiTrainingLastUpdated: (0, firestore_1.serverTimestamp)(),
                aiTrainingReason: 'Initial setup',
                analytics: 'pending',
                analyticsLastUpdated: (0, firestore_1.serverTimestamp)(),
                analyticsReason: 'Initial setup',
                dataCollection: 'pending',
                dataCollectionLastUpdated: (0, firestore_1.serverTimestamp)(),
                dataCollectionReason: 'Initial setup',
                dataSharing: 'denied',
                dataSharingLastUpdated: (0, firestore_1.serverTimestamp)(),
                dataSharingReason: 'Initial setup - denied by default',
                marketing: 'denied',
                marketingLastUpdated: (0, firestore_1.serverTimestamp)(),
                marketingReason: 'Initial setup - denied by default',
                thirdPartyIntegrations: 'denied',
                thirdPartyIntegrationsLastUpdated: (0, firestore_1.serverTimestamp)(),
                thirdPartyIntegrationsReason: 'Initial setup - denied by default'
            };
            yield (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'users', userId, 'privacy', 'consent'), defaultConsent);
            return defaultConsent;
        });
    }
    /**
     * Get consent settings for a user
     */
    static getConsent(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, 'users', userId, 'privacy', 'consent');
                const docSnap = yield (0, firestore_1.getDoc)(docRef);
                if (docSnap.exists()) {
                    return docSnap.data();
                }
                return null;
            }
            catch (error) {
                console.error('Error getting consent settings:', error);
                return null;
            }
        });
    }
    /**
     * Update consent for a specific type
     */
    static updateConsent(userId, consentType, newValue, reason, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const currentConsent = yield this.getConsent(userId);
                if (!currentConsent)
                    return false;
                const previousValue = currentConsent[consentType];
                const updateData = {
                    [consentType]: newValue,
                    [`${consentType}LastUpdated`]: (0, firestore_1.serverTimestamp)(),
                    [`${consentType}Reason`]: reason
                };
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'users', userId, 'privacy', 'consent'), updateData);
                // Log consent change
                yield this.logConsentChange(userId, consentType, previousValue, newValue, reason, metadata);
                return true;
            }
            catch (error) {
                console.error('Error updating consent:', error);
                return false;
            }
        });
    }
    /**
     * Check if user has given consent for a specific type
     */
    static hasConsent(userId, consentType) {
        return __awaiter(this, void 0, void 0, function* () {
            const consent = yield this.getConsent(userId);
            if (!consent)
                return false;
            return consent[consentType] === 'granted';
        });
    }
    /**
     * Get consent history for a user
     */
    static getConsentHistory(userId, limitCount = 50) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'users', userId, 'privacy', 'consentHistory'), (0, firestore_1.orderBy)('timestamp', 'desc'), (0, firestore_1.limit)(limitCount));
                const querySnapshot = yield (0, firestore_1.getDocs)(q);
                return querySnapshot.docs.map(doc => doc.data());
            }
            catch (error) {
                console.error('Error getting consent history:', error);
                return [];
            }
        });
    }
    /**
     * Log consent change
     */
    static logConsentChange(userId, consentType, previousValue, newValue, reason, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const consentHistory = {
                userId,
                consentType,
                previousValue,
                newValue,
                reason,
                timestamp: (0, firestore_1.serverTimestamp)(),
                ipAddress: (metadata === null || metadata === void 0 ? void 0 : metadata.ipAddress) || 'unknown',
                userAgent: (metadata === null || metadata === void 0 ? void 0 : metadata.userAgent) || 'unknown'
            };
            yield (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'users', userId, 'privacy', 'consentHistory'), consentHistory);
        });
    }
    /**
     * Withdraw all consent
     */
    static withdrawAllConsent(userId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const consentTypes = this.CONSENT_TYPES;
                const updateData = {};
                consentTypes.forEach(type => {
                    updateData[type] = 'withdrawn';
                    updateData[`${type}LastUpdated`] = (0, firestore_1.serverTimestamp)();
                    updateData[`${type}Reason`] = reason;
                });
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'users', userId, 'privacy', 'consent'), updateData);
                return true;
            }
            catch (error) {
                console.error('Error withdrawing all consent:', error);
                return false;
            }
        });
    }
    /**
     * Get consent summary
     */
    static getConsentSummary(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const consent = yield this.getConsent(userId);
                if (!consent) {
                    return {
                        totalConsents: 0,
                        grantedConsents: 0,
                        deniedConsents: 0,
                        pendingConsents: 0,
                        withdrawnConsents: 0,
                        lastUpdated: new Date()
                    };
                }
                const consentValues = Object.values(consent).filter(value => typeof value === 'string' &&
                    ['granted', 'denied', 'pending', 'withdrawn'].includes(value));
                return {
                    totalConsents: consentValues.length,
                    grantedConsents: consentValues.filter(v => v === 'granted').length,
                    deniedConsents: consentValues.filter(v => v === 'denied').length,
                    pendingConsents: consentValues.filter(v => v === 'pending').length,
                    withdrawnConsents: consentValues.filter(v => v === 'withdrawn').length,
                    lastUpdated: new Date()
                };
            }
            catch (error) {
                console.error('Error getting consent summary:', error);
                return {
                    totalConsents: 0,
                    grantedConsents: 0,
                    deniedConsents: 0,
                    pendingConsents: 0,
                    withdrawnConsents: 0,
                    lastUpdated: new Date()
                };
            }
        });
    }
}
exports.ConsentManager = ConsentManager;
ConsentManager.CONSENT_TYPES = [
    'aiTraining',
    'analytics',
    'dataCollection',
    'dataSharing',
    'marketing',
    'thirdPartyIntegrations'
];
