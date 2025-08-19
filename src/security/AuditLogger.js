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
exports.AuditLogger = void 0;
// src/security/AuditLogger.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
class AuditLogger {
    /**
     * Log an audit event
     */
    static logAuditEvent(userId, action, resource, details, severity = 'low', outcome = 'success', metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const auditLog = {
                    userId,
                    action,
                    resource,
                    resourceId: metadata === null || metadata === void 0 ? void 0 : metadata.resourceId,
                    details,
                    timestamp: (0, firestore_1.serverTimestamp)(),
                    ipAddress: (metadata === null || metadata === void 0 ? void 0 : metadata.ipAddress) || this.getClientIP(),
                    userAgent: (metadata === null || metadata === void 0 ? void 0 : metadata.userAgent) || navigator.userAgent,
                    sessionId: (metadata === null || metadata === void 0 ? void 0 : metadata.sessionId) || this.getSessionId(),
                    severity,
                    outcome
                };
                const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'auditLogs'), auditLog);
                return docRef.id;
            }
            catch (error) {
                console.error('Error logging audit event:', error);
                return '';
            }
        });
    }
    /**
     * Log data access
     */
    static logDataAccess(userId, dataType, accessType, purpose, consentLevel, anonymized = false, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataAccessLog = {
                    userId,
                    dataType,
                    accessType,
                    dataId: metadata === null || metadata === void 0 ? void 0 : metadata.dataId,
                    timestamp: (0, firestore_1.serverTimestamp)(),
                    purpose,
                    consentLevel,
                    anonymized
                };
                const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'dataAccessLogs'), dataAccessLog);
                return docRef.id;
            }
            catch (error) {
                console.error('Error logging data access:', error);
                return '';
            }
        });
    }
    /**
     * Get audit logs for a user
     */
    static getUserAuditLogs(userId, limitCount = 100) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'auditLogs'), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.orderBy)('timestamp', 'desc'), (0, firestore_1.limit)(limitCount));
                const querySnapshot = yield (0, firestore_1.getDocs)(q);
                return querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            }
            catch (error) {
                console.error('Error getting audit logs:', error);
                return [];
            }
        });
    }
    /**
     * Get data access logs for a user
     */
    static getUserDataAccessLogs(userId, limitCount = 100) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'dataAccessLogs'), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.orderBy)('timestamp', 'desc'), (0, firestore_1.limit)(limitCount));
                const querySnapshot = yield (0, firestore_1.getDocs)(q);
                return querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            }
            catch (error) {
                console.error('Error getting data access logs:', error);
                return [];
            }
        });
    }
    /**
     * Get audit logs by severity
     */
    static getAuditLogsBySeverity(severity, limitCount = 100) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'auditLogs'), (0, firestore_1.where)('severity', '==', severity), (0, firestore_1.orderBy)('timestamp', 'desc'), (0, firestore_1.limit)(limitCount));
                const querySnapshot = yield (0, firestore_1.getDocs)(q);
                return querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            }
            catch (error) {
                console.error('Error getting audit logs by severity:', error);
                return [];
            }
        });
    }
    /**
     * Get audit logs by action type
     */
    static getAuditLogsByAction(action, limitCount = 100) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'auditLogs'), (0, firestore_1.where)('action', '==', action), (0, firestore_1.orderBy)('timestamp', 'desc'), (0, firestore_1.limit)(limitCount));
                const querySnapshot = yield (0, firestore_1.getDocs)(q);
                return querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            }
            catch (error) {
                console.error('Error getting audit logs by action:', error);
                return [];
            }
        });
    }
    /**
     * Get client IP address (simplified)
     */
    static getClientIP() {
        // In a real implementation, this would get the actual IP
        // For now, return a placeholder
        return 'client_ip_placeholder';
    }
    /**
     * Get session ID
     */
    static getSessionId() {
        // Generate or retrieve session ID
        let sessionId = sessionStorage.getItem('coach_core_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('coach_core_session_id', sessionId);
        }
        return sessionId;
    }
    /**
     * Log security event
     */
    static logSecurityEvent(userId, event, details, severity) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.logAuditEvent(userId, 'security_event', 'security', Object.assign({ event }, details), severity, 'success');
        });
    }
    /**
     * Log privacy event
     */
    static logPrivacyEvent(userId, event, details) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.logAuditEvent(userId, 'privacy_event', 'privacy', Object.assign({ event }, details), 'medium', 'success');
        });
    }
    /**
     * Log AI training event
     */
    static logAITrainingEvent(userId, event, details, anonymized) {
        return __awaiter(this, void 0, void 0, function* () {
            const logId = yield this.logAuditEvent(userId, 'ai_training_event', 'ai_training', Object.assign({ event, anonymized }, details), 'medium', 'success');
            // Also log as data access
            yield this.logDataAccess(userId, 'ai_training', 'read', 'AI model training', 'granted', anonymized);
            return logId;
        });
    }
}
exports.AuditLogger = AuditLogger;
