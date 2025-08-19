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
exports.useBackupAutomation = exports.BackupAutomationManager = void 0;
// src/utils/backup-automation.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
// ============================================
// BACKUP AUTOMATION MANAGER
// ============================================
class BackupAutomationManager {
    constructor(config) {
        this.jobs = new Map();
        this.scheduler = null;
        this.config = config;
        this.initializeScheduler();
    }
    // ============================================
    // SCHEDULER MANAGEMENT
    // ============================================
    initializeScheduler() {
        if (!this.config.schedule.enabled)
            return;
        const interval = this.getScheduleInterval();
        this.scheduler = setInterval(() => {
            this.checkAndRunScheduledBackup();
        }, interval);
        console.log(`Backup scheduler initialized with ${this.config.schedule.frequency} frequency`);
    }
    getScheduleInterval() {
        switch (this.config.schedule.frequency) {
            case 'daily':
                return 24 * 60 * 60 * 1000; // 24 hours
            case 'weekly':
                return 7 * 24 * 60 * 60 * 1000; // 7 days
            case 'monthly':
                return 30 * 24 * 60 * 60 * 1000; // 30 days
            default:
                return 24 * 60 * 60 * 1000; // Default to daily
        }
    }
    checkAndRunScheduledBackup() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const scheduleTime = this.parseScheduleTime(this.config.schedule.time);
            // Check if it's time to run the backup
            if (this.shouldRunBackup(now, scheduleTime)) {
                yield this.createBackupJob();
            }
        });
    }
    parseScheduleTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const now = new Date();
        const scheduleTime = new Date(now);
        scheduleTime.setHours(hours, minutes, 0, 0);
        return scheduleTime;
    }
    shouldRunBackup(now, scheduleTime) {
        const timeDiff = Math.abs(now.getTime() - scheduleTime.getTime());
        const tolerance = 5 * 60 * 1000; // 5 minutes tolerance
        if (timeDiff > tolerance)
            return false;
        switch (this.config.schedule.frequency) {
            case 'daily':
                return true;
            case 'weekly':
                return now.getDay() === this.config.schedule.dayOfWeek;
            case 'monthly':
                return now.getDate() === this.config.schedule.dayOfMonth;
            default:
                return false;
        }
    }
    // ============================================
    // BACKUP JOB MANAGEMENT
    // ============================================
    createBackupJob() {
        return __awaiter(this, void 0, void 0, function* () {
            const jobId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const job = {
                id: jobId,
                config: this.config,
                status: 'pending',
                progress: { current: 0, total: 0, collection: '' }
            };
            this.jobs.set(jobId, job);
            // Store job in Firestore
            yield (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, '_backupJobs', jobId), Object.assign(Object.assign({}, job), { createdAt: (0, firestore_1.serverTimestamp)() }));
            // Start the backup job
            this.runBackupJob(jobId);
            return jobId;
        });
    }
    runBackupJob(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = this.jobs.get(jobId);
            if (!job)
                return;
            try {
                job.status = 'running';
                job.startedAt = firestore_1.Timestamp.now();
                yield this.updateJobInFirestore(job);
                const backupId = yield this.performBackup(job);
                job.status = 'completed';
                job.completedAt = firestore_1.Timestamp.now();
                job.backupId = backupId;
                yield this.updateJobInFirestore(job);
                // Send success notification
                if (this.config.notifications.onSuccess) {
                    yield this.sendNotification('success', job);
                }
                // Clean up old backups
                yield this.cleanupOldBackups();
            }
            catch (error) {
                job.status = 'failed';
                job.completedAt = firestore_1.Timestamp.now();
                job.error = error instanceof Error ? error.message : 'Unknown error';
                yield this.updateJobInFirestore(job);
                // Send failure notification
                if (this.config.notifications.onFailure) {
                    yield this.sendNotification('failure', job);
                }
            }
        });
    }
    performBackup(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const backupId = `backup_${Date.now()}`;
            const backup = {
                id: backupId,
                timestamp: firestore_1.Timestamp.now(),
                collections: {},
                metadata: {
                    totalDocuments: 0,
                    totalSize: 0,
                    checksum: ''
                }
            };
            let totalDocuments = 0;
            let totalSize = 0;
            for (const collectionName of this.config.collections) {
                job.progress.collection = collectionName;
                yield this.updateJobInFirestore(job);
                const collectionData = yield this.backupCollection(collectionName);
                backup.collections[collectionName] = collectionData;
                totalDocuments += collectionData.documents.length;
                totalSize += JSON.stringify(collectionData).length;
                job.progress.current++;
                job.progress.total = this.config.collections.length;
                yield this.updateJobInFirestore(job);
            }
            backup.metadata.totalDocuments = totalDocuments;
            backup.metadata.totalSize = totalSize;
            backup.metadata.checksum = this.generateChecksum(backup);
            // Compress if enabled
            if (this.config.compression) {
                backup.data = yield this.compressData(backup);
            }
            // Encrypt if enabled
            if (this.config.encryption) {
                backup.data = yield this.encryptData(backup.data || backup);
            }
            // Store backup
            yield this.storeBackup(backupId, backup);
            return backupId;
        });
    }
    backupCollection(collectionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, collectionName));
            return {
                name: collectionName,
                documentCount: snapshot.docs.length,
                documents: snapshot.docs.map(doc => {
                    var _a, _b;
                    return ({
                        id: doc.id,
                        data: doc.data(),
                        metadata: {
                            hasPendingWrites: doc.metadata.hasPendingWrites,
                            fromCache: doc.metadata.fromCache,
                            createdAt: (_a = doc.data().createdAt) !== null && _a !== void 0 ? _a : null,
                            updatedAt: (_b = doc.data().updatedAt) !== null && _b !== void 0 ? _b : null
                        }
                    });
                })
            };
        });
    }
    generateChecksum(data) {
        const jsonString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
    compressData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simple compression using JSON.stringify and base64
            // In production, use a proper compression library like pako
            const jsonString = JSON.stringify(data);
            return btoa(jsonString);
        });
    }
    encryptData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simple encryption using base64
            // In production, use a proper encryption library like crypto-js
            const jsonString = JSON.stringify(data);
            return btoa(jsonString);
        });
    }
    storeBackup(backupId, backup) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.config.storage.type) {
                case 'firestore':
                    yield (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, '_backups', backupId), Object.assign(Object.assign({}, backup), { storedAt: (0, firestore_1.serverTimestamp)() }));
                    break;
                case 'cloud_storage':
                    yield this.storeInCloudStorage(backupId, backup);
                    break;
                case 'external':
                    yield this.storeExternally(backupId, backup);
                    break;
            }
        });
    }
    storeInCloudStorage(backupId, backup) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for Google Cloud Storage
            // This would use the Firebase Storage SDK
            console.log('Storing backup in cloud storage:', backupId);
        });
    }
    storeExternally(backupId, backup) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for external storage (AWS S3, etc.)
            console.log('Storing backup externally:', backupId);
        });
    }
    // ============================================
    // BACKUP RESTORATION
    // ============================================
    restoreBackup(backupId, collections) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const backup = yield this.loadBackup(backupId);
                if (!backup) {
                    throw new Error('Backup not found');
                }
                // Validate backup integrity
                const isValid = this.validateBackup(backup);
                if (!isValid) {
                    throw new Error('Backup is corrupted or invalid');
                }
                const collectionsToRestore = collections || Object.keys(backup.collections);
                const batch = (0, firestore_1.writeBatch)(firebase_1.db);
                for (const collectionName of collectionsToRestore) {
                    const collectionData = backup.collections[collectionName];
                    if (!collectionData)
                        continue;
                    for (const docData of collectionData.documents) {
                        const docRef = (0, firestore_1.doc)(firebase_1.db, collectionName, docData.id);
                        batch.set(docRef, docData.data);
                    }
                }
                yield batch.commit();
                console.log(`Backup ${backupId} restored successfully`);
            }
            catch (error) {
                console.error('Error restoring backup:', error);
                throw error;
            }
        });
    }
    loadBackup(backupId) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.config.storage.type) {
                case 'firestore':
                    const backupDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, '_backups', backupId));
                    return backupDoc.exists() ? backupDoc.data() : null;
                case 'cloud_storage':
                    return yield this.loadFromCloudStorage(backupId);
                case 'external':
                    return yield this.loadFromExternal(backupId);
                default:
                    throw new Error('Unknown storage type');
            }
        });
    }
    loadFromCloudStorage(backupId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for loading from Google Cloud Storage
            console.log('Loading backup from cloud storage:', backupId);
            return null;
        });
    }
    loadFromExternal(backupId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for loading from external storage
            console.log('Loading backup from external storage:', backupId);
            return null;
        });
    }
    validateBackup(backup) {
        if (!backup.metadata || !backup.collections) {
            return false;
        }
        const currentChecksum = this.generateChecksum(backup);
        return currentChecksum === backup.metadata.checksum;
    }
    // ============================================
    // CLEANUP AND RETENTION
    // ============================================
    cleanupOldBackups() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.retention.deleteExpired)
                return;
            try {
                const backups = yield this.listBackups();
                const now = Date.now();
                const maxAge = this.config.retention.maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds
                // Sort backups by timestamp (oldest first)
                backups.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
                // Delete expired backups
                for (const backup of backups) {
                    const age = now - backup.timestamp.toMillis();
                    if (age > maxAge) {
                        yield this.deleteBackup(backup.id);
                    }
                }
                // Delete excess backups if over limit
                if (backups.length > this.config.retention.maxBackups) {
                    const excessCount = backups.length - this.config.retention.maxBackups;
                    for (let i = 0; i < excessCount; i++) {
                        yield this.deleteBackup(backups[i].id);
                    }
                }
            }
            catch (error) {
                console.error('Error cleaning up old backups:', error);
            }
        });
    }
    listBackups() {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, '_backups'));
            return snapshot.docs.map(doc => {
                var _a, _b, _c;
                return ({
                    id: doc.id,
                    timestamp: doc.data().timestamp,
                    collections: doc.data().collections ? Object.keys(doc.data().collections) : [],
                    documentCount: ((_a = doc.data().metadata) === null || _a === void 0 ? void 0 : _a.totalDocuments) || 0,
                    size: ((_b = doc.data().metadata) === null || _b === void 0 ? void 0 : _b.totalSize) || 0,
                    checksum: ((_c = doc.data().metadata) === null || _c === void 0 ? void 0 : _c.checksum) || '',
                    config: doc.data().config,
                    status: 'valid' // This would be validated
                });
            });
        });
    }
    deleteBackup(backupId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, firestore_1.deleteDoc)((0, firestore_1.doc)(firebase_1.db, '_backups', backupId));
                console.log(`Backup ${backupId} deleted`);
            }
            catch (error) {
                console.error(`Error deleting backup ${backupId}:`, error);
            }
        });
    }
    // ============================================
    // NOTIFICATIONS
    // ============================================
    sendNotification(type, job) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = this.createNotificationMessage(type, job);
            // Send to configured recipients
            for (const recipient of this.config.notifications.recipients) {
                yield this.sendToRecipient(recipient, message);
            }
        });
    }
    createNotificationMessage(type, job) {
        const baseMessage = `Backup job ${job.id} ${type === 'success' ? 'completed successfully' : 'failed'}`;
        if (type === 'success') {
            return `${baseMessage}\nBackup ID: ${job.backupId}\nSize: ${job.size} bytes\nDuration: ${this.calculateDuration(job)}`;
        }
        else {
            return `${baseMessage}\nError: ${job.error}`;
        }
    }
    calculateDuration(job) {
        if (!job.startedAt || !job.completedAt)
            return 'Unknown';
        const duration = job.completedAt.toMillis() - job.startedAt.toMillis();
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
    sendToRecipient(recipient, message) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation for sending notifications
            // This could be email, Slack, webhook, etc.
            console.log(`Sending notification to ${recipient}:`, message);
        });
    }
    // ============================================
    // JOB MANAGEMENT
    // ============================================
    updateJobInFirestore(job) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, '_backupJobs', job.id), Object.assign(Object.assign({}, job), { updatedAt: (0, firestore_1.serverTimestamp)() }));
        });
    }
    getJobStatus(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.jobs.get(jobId) || null;
        });
    }
    getAllJobs() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.jobs.values());
        });
    }
    cancelJob(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = this.jobs.get(jobId);
            if (job && job.status === 'pending') {
                job.status = 'failed';
                job.error = 'Cancelled by user';
                yield this.updateJobInFirestore(job);
            }
        });
    }
    // ============================================
    // CONFIGURATION MANAGEMENT
    // ============================================
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
        // Restart scheduler if schedule changed
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.initializeScheduler();
        }
    }
    getConfig() {
        return Object.assign({}, this.config);
    }
    // ============================================
    // CLEANUP
    // ============================================
    destroy() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
            this.scheduler = null;
        }
        this.jobs.clear();
    }
}
exports.BackupAutomationManager = BackupAutomationManager;
// ============================================
// REACT HOOKS
// ============================================
const react_1 = require("react");
const useBackupAutomation = (config) => {
    const [manager] = (0, react_1.useState)(() => new BackupAutomationManager(config));
    const [jobs, setJobs] = (0, react_1.useState)([]);
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const loadJobs = () => __awaiter(void 0, void 0, void 0, function* () {
            const allJobs = yield manager.getAllJobs();
            setJobs(allJobs);
        });
        loadJobs();
        // Poll for job updates
        const interval = setInterval(loadJobs, 5000);
        return () => {
            clearInterval(interval);
            manager.destroy();
        };
    }, [manager]);
    const createBackup = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        setIsRunning(true);
        try {
            const jobId = yield manager.createBackupJob();
            return jobId;
        }
        finally {
            setIsRunning(false);
        }
    }), [manager]);
    const restoreBackup = (0, react_1.useCallback)((backupId, collections) => __awaiter(void 0, void 0, void 0, function* () {
        return manager.restoreBackup(backupId, collections);
    }), [manager]);
    const cancelJob = (0, react_1.useCallback)((jobId) => __awaiter(void 0, void 0, void 0, function* () {
        return manager.cancelJob(jobId);
    }), [manager]);
    return {
        manager,
        jobs,
        isRunning,
        createBackup,
        restoreBackup,
        cancelJob,
        getJobStatus: (jobId) => manager.getJobStatus(jobId),
        updateConfig: (config) => manager.updateConfig(config),
        getConfig: () => manager.getConfig()
    };
};
exports.useBackupAutomation = useBackupAutomation;
exports.default = BackupAutomationManager;
