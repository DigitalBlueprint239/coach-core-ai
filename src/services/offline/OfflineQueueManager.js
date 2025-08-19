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
exports.offlineQueueManager = exports.OfflineQueueManager = void 0;
// src/services/offline/OfflineQueueManager.ts
const firestore_1 = require("firebase/firestore");
const firestore_2 = require("../firestore");
// ============================================
// INDEXEDDB SCHEMA
// ============================================
const DB_NAME = 'CoachCoreOfflineQueue';
const DB_VERSION = 1;
const STORES = {
    QUEUE: 'queue',
    CONFLICTS: 'conflicts',
    STATS: 'stats'
};
// ============================================
// OFFLINE QUEUE MANAGER
// ============================================
class OfflineQueueManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.processingQueue = false;
        this.networkStatus = navigator.onLine;
        this.syncCallbacks = [];
        // ============================================
        // RETRY UTILITY
        // ============================================
        this.withRetry = (fn, options = { maxAttempts: 3, delay: 1000 }) => __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < options.maxAttempts; i++) {
                try {
                    return yield fn();
                }
                catch (error) {
                    if (i === options.maxAttempts - 1)
                        throw error;
                    yield new Promise(resolve => setTimeout(resolve, options.delay * Math.pow(2, i)));
                }
            }
            throw new Error('Max retries reached');
        });
        this.initializeDB();
        this.setupNetworkListeners();
    }
    // ============================================
    // DATABASE INITIALIZATION
    // ============================================
    initializeDB() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = () => {
                    console.error('Failed to open IndexedDB:', request.error);
                    reject(request.error);
                };
                request.onsuccess = () => {
                    this.db = request.result;
                    this.isInitialized = true;
                    console.log('IndexedDB initialized successfully');
                    resolve();
                };
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    // Create queue store
                    if (!db.objectStoreNames.contains(STORES.QUEUE)) {
                        const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
                        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                        queueStore.createIndex('priority', 'priority', { unique: false });
                        queueStore.createIndex('status', 'status', { unique: false });
                        queueStore.createIndex('userId', 'userId', { unique: false });
                        queueStore.createIndex('collection', 'collection', { unique: false });
                    }
                    // Create conflicts store
                    if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
                        const conflictsStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'itemId' });
                        conflictsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                    // Create stats store
                    if (!db.objectStoreNames.contains(STORES.STATS)) {
                        db.createObjectStore(STORES.STATS, { keyPath: 'id' });
                    }
                };
            });
        });
    }
    // ============================================
    // NETWORK STATUS MANAGEMENT
    // ============================================
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.networkStatus = true;
            this.notifySyncCallbacks('online');
            this.processQueue();
        });
        window.addEventListener('offline', () => {
            this.networkStatus = false;
            this.notifySyncCallbacks('offline');
        });
    }
    notifySyncCallbacks(status) {
        this.syncCallbacks.forEach(callback => callback(status));
    }
    onNetworkStatusChange(callback) {
        this.syncCallbacks.push(callback);
        return () => {
            const index = this.syncCallbacks.indexOf(callback);
            if (index > -1) {
                this.syncCallbacks.splice(index, 1);
            }
        };
    }
    isOnline() {
        return this.networkStatus;
    }
    // ============================================
    // QUEUE OPERATIONS
    // ============================================
    addToQueue(type, collection, data, options = { userId: 'anonymous' }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            const item = {
                id: this.generateId(),
                type,
                collection,
                documentId: options.documentId,
                data,
                priority: options.priority || 'NORMAL',
                timestamp: Date.now(),
                retryCount: 0,
                maxRetries: options.maxRetries || 3,
                userId: options.userId,
                teamId: options.teamId,
                metadata: options.metadata,
                status: 'PENDING'
            };
            yield this.saveToIndexedDB(STORES.QUEUE, item);
            this.updateStats();
            console.log(`Added item to queue: ${item.id} (${type} on ${collection})`);
            // Process queue if online
            if (this.isOnline()) {
                this.processQueue();
            }
            return item.id;
        });
    }
    removeFromQueue(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            yield this.deleteFromIndexedDB(STORES.QUEUE, itemId);
            this.updateStats();
        });
    }
    getQueueItems(filters = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            const items = yield this.getAllFromIndexedDB(STORES.QUEUE);
            return items.filter(item => {
                if (filters.status && item.status !== filters.status)
                    return false;
                if (filters.priority && item.priority !== filters.priority)
                    return false;
                if (filters.userId && item.userId !== filters.userId)
                    return false;
                if (filters.collection && item.collection !== filters.collection)
                    return false;
                return true;
            }).sort((a, b) => {
                // Sort by priority first, then by timestamp
                const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
                const aPriority = priorityOrder[a.priority];
                const bPriority = priorityOrder[b.priority];
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                return a.timestamp - b.timestamp;
            });
        });
    }
    getQueueStats() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            const items = yield this.getAllFromIndexedDB(STORES.QUEUE);
            const stats = {
                total: items.length,
                pending: items.filter(item => item.status === 'PENDING').length,
                processing: items.filter(item => item.status === 'PROCESSING').length,
                completed: items.filter(item => item.status === 'COMPLETED').length,
                failed: items.filter(item => item.status === 'FAILED').length,
                conflicts: items.filter(item => item.status === 'CONFLICT').length,
                oldestItem: items.length > 0 ? Math.min(...items.map(item => item.timestamp)) : undefined,
                newestItem: items.length > 0 ? Math.max(...items.map(item => item.timestamp)) : undefined
            };
            return stats;
        });
    }
    // ============================================
    // QUEUE PROCESSING
    // ============================================
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.processingQueue || !this.isOnline()) {
                return;
            }
            this.processingQueue = true;
            console.log('Starting queue processing...');
            try {
                const pendingItems = yield this.getQueueItems({ status: 'PENDING' });
                for (const item of pendingItems) {
                    try {
                        yield this.processQueueItem(item);
                    }
                    catch (error) {
                        console.error(`Failed to process queue item ${item.id}:`, error);
                        yield this.handleProcessingError(item, error);
                    }
                }
                // Process conflicts
                yield this.processConflicts();
            }
            catch (error) {
                console.error('Queue processing failed:', error);
            }
            finally {
                this.processingQueue = false;
            }
        });
    }
    processQueueItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            // Update status to processing
            item.status = 'PROCESSING';
            item.lastAttempt = Date.now();
            yield this.updateInIndexedDB(STORES.QUEUE, item);
            try {
                switch (item.type) {
                    case 'CREATE':
                        yield this.processCreate(item);
                        break;
                    case 'UPDATE':
                        yield this.processUpdate(item);
                        break;
                    case 'DELETE':
                        yield this.processDelete(item);
                        break;
                    case 'BATCH':
                        yield this.processBatch(item);
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${item.type}`);
                }
                // Mark as completed
                item.status = 'COMPLETED';
                yield this.updateInIndexedDB(STORES.QUEUE, item);
                console.log(`Successfully processed queue item: ${item.id}`);
            }
            catch (error) {
                throw error;
            }
        });
    }
    processCreate(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!item.data) {
                throw new Error('No data provided for CREATE operation');
            }
            const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(firestore_2.db, item.collection), Object.assign(Object.assign({}, item.data), { createdAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)(), createdBy: item.userId, lastModifiedBy: item.userId, lastModifiedAt: (0, firestore_1.serverTimestamp)() }));
            console.log(`Created document: ${docRef.id} in ${item.collection}`);
        });
    }
    processUpdate(item) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!item.documentId) {
                throw new Error('Document ID required for UPDATE operation');
            }
            if (!item.data) {
                throw new Error('No data provided for UPDATE operation');
            }
            const docRef = (0, firestore_1.doc)(firestore_2.db, item.collection, item.documentId);
            // Check for optimistic locking conflicts
            if (((_a = item.metadata) === null || _a === void 0 ? void 0 : _a.originalVersion) !== undefined) {
                yield (0, firestore_1.runTransaction)(firestore_2.db, (transaction) => __awaiter(this, void 0, void 0, function* () {
                    var _b;
                    const docSnapshot = yield transaction.get(docRef);
                    if (!docSnapshot.exists()) {
                        throw new Error('Document not found');
                    }
                    const currentData = docSnapshot.data();
                    const currentVersion = currentData.version || 0;
                    const expectedVersion = item.metadata.originalVersion;
                    if (currentVersion !== expectedVersion) {
                        // Conflict detected - store for resolution
                        yield this.storeConflict(item, {
                            serverData: currentData,
                            clientData: item.data,
                            strategy: ((_b = item.metadata) === null || _b === void 0 ? void 0 : _b.conflictResolution) || 'USER_CHOICE'
                        });
                        throw new Error('Version conflict detected');
                    }
                    const updateData = Object.assign(Object.assign({}, item.data), { version: currentVersion + 1, lastModifiedBy: item.userId, lastModifiedAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() });
                    transaction.update(docRef, updateData);
                }));
            }
            else {
                // No optimistic locking - direct update
                yield (0, firestore_1.updateDoc)(docRef, Object.assign(Object.assign({}, item.data), { lastModifiedBy: item.userId, lastModifiedAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() }));
            }
            console.log(`Updated document: ${item.documentId} in ${item.collection}`);
        });
    }
    processDelete(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!item.documentId) {
                throw new Error('Document ID required for DELETE operation');
            }
            const docRef = (0, firestore_1.doc)(firestore_2.db, item.collection, item.documentId);
            yield (0, firestore_1.deleteDoc)(docRef);
            console.log(`Deleted document: ${item.documentId} from ${item.collection}`);
        });
    }
    processBatch(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!item.data || !Array.isArray(item.data.operations)) {
                throw new Error('Batch operations array required for BATCH operation');
            }
            const batch = (0, firestore_1.writeBatch)(firestore_2.db);
            const operations = item.data.operations;
            for (const operation of operations) {
                switch (operation.type) {
                    case 'CREATE':
                        const docRef = (0, firestore_1.doc)((0, firestore_1.collection)(firestore_2.db, operation.collection));
                        batch.set(docRef, Object.assign(Object.assign({}, operation.data), { createdAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)(), createdBy: item.userId, lastModifiedBy: item.userId, lastModifiedAt: (0, firestore_1.serverTimestamp)() }));
                        break;
                    case 'UPDATE':
                        if (!operation.documentId) {
                            throw new Error('Document ID required for batch UPDATE operation');
                        }
                        const updateRef = (0, firestore_1.doc)(firestore_2.db, operation.collection, operation.documentId);
                        batch.update(updateRef, Object.assign(Object.assign({}, operation.data), { lastModifiedBy: item.userId, lastModifiedAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() }));
                        break;
                    case 'DELETE':
                        if (!operation.documentId) {
                            throw new Error('Document ID required for batch DELETE operation');
                        }
                        const deleteRef = (0, firestore_1.doc)(firestore_2.db, operation.collection, operation.documentId);
                        batch.delete(deleteRef);
                        break;
                }
            }
            yield batch.commit();
            console.log(`Executed batch operation with ${operations.length} operations`);
        });
    }
    // ============================================
    // CONFLICT RESOLUTION
    // ============================================
    storeConflict(item, conflict) {
        return __awaiter(this, void 0, void 0, function* () {
            const conflictData = {
                itemId: item.id,
                strategy: conflict.strategy,
                serverData: conflict.serverData,
                clientData: conflict.clientData,
                timestamp: Date.now()
            };
            yield this.saveToIndexedDB(STORES.CONFLICTS, conflictData);
            item.status = 'CONFLICT';
            yield this.updateInIndexedDB(STORES.QUEUE, item);
            console.log(`Stored conflict for item: ${item.id}`);
        });
    }
    getConflicts() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            return yield this.getAllFromIndexedDB(STORES.CONFLICTS);
        });
    }
    resolveConflict(itemId, resolution, mergedData, resolvedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            const conflict = yield this.getFromIndexedDB(STORES.CONFLICTS, itemId);
            if (!conflict) {
                throw new Error(`Conflict not found for item: ${itemId}`);
            }
            const item = yield this.getFromIndexedDB(STORES.QUEUE, itemId);
            if (!item) {
                throw new Error(`Queue item not found: ${itemId}`);
            }
            // Update conflict resolution
            conflict.resolvedBy = resolvedBy || 'system';
            conflict.resolvedAt = Date.now();
            conflict.mergedData = mergedData;
            // Update queue item based on resolution
            switch (resolution) {
                case 'SERVER_WINS':
                    item.status = 'COMPLETED';
                    break;
                case 'CLIENT_WINS':
                    item.status = 'PENDING';
                    break;
                case 'MERGE':
                    if (mergedData) {
                        item.data = mergedData;
                        item.status = 'PENDING';
                    }
                    else {
                        throw new Error('Merged data required for MERGE resolution');
                    }
                    break;
            }
            // Save updates
            yield this.updateInIndexedDB(STORES.CONFLICTS, conflict);
            yield this.updateInIndexedDB(STORES.QUEUE, item);
            yield this.deleteFromIndexedDB(STORES.CONFLICTS, itemId);
            console.log(`Resolved conflict for item: ${itemId} with strategy: ${resolution}`);
        });
    }
    processConflicts() {
        return __awaiter(this, void 0, void 0, function* () {
            const conflicts = yield this.getConflicts();
            for (const conflict of conflicts) {
                const item = yield this.getFromIndexedDB(STORES.QUEUE, conflict.itemId);
                if (!item)
                    continue;
                // Auto-resolve based on strategy
                switch (conflict.strategy) {
                    case 'SERVER_WINS':
                        yield this.resolveConflict(conflict.itemId, 'SERVER_WINS');
                        break;
                    case 'CLIENT_WINS':
                        yield this.resolveConflict(conflict.itemId, 'CLIENT_WINS');
                        break;
                    case 'MERGE':
                        // For merge strategy, we need user input, so leave it for manual resolution
                        break;
                    case 'USER_CHOICE':
                        // Leave for manual resolution
                        break;
                }
            }
        });
    }
    // ============================================
    // ERROR HANDLING
    // ============================================
    handleProcessingError(item, error) {
        return __awaiter(this, void 0, void 0, function* () {
            item.retryCount++;
            item.error = error instanceof Error ? error.message : 'Unknown error';
            item.lastAttempt = Date.now();
            if (item.retryCount >= item.maxRetries) {
                item.status = 'FAILED';
                console.error(`Item ${item.id} failed after ${item.maxRetries} retries`);
            }
            else {
                item.status = 'PENDING';
                // Use retry utility for backoff
                const backoffDelay = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
                setTimeout(() => {
                    this.processQueue();
                }, backoffDelay);
            }
            yield this.updateInIndexedDB(STORES.QUEUE, item);
        });
    }
    // ============================================
    // INDEXEDDB UTILITIES
    // ============================================
    waitForInitialization() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isInitialized) {
                yield this.initializeDB();
            }
        });
    }
    saveToIndexedDB(storeName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
    }
    getFromIndexedDB(storeName, key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        });
    }
    getAllFromIndexedDB(storeName) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        });
    }
    updateInIndexedDB(storeName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.saveToIndexedDB(storeName, data);
        });
    }
    deleteFromIndexedDB(storeName, key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
    }
    updateStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.getQueueStats();
            yield this.saveToIndexedDB(STORES.STATS, Object.assign({ id: 'current' }, stats));
        });
    }
    // ============================================
    // UTILITY METHODS
    // ============================================
    generateId() {
        return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    clearQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            const transaction = this.db.transaction([STORES.QUEUE, STORES.CONFLICTS], 'readwrite');
            const queueStore = transaction.objectStore(STORES.QUEUE);
            const conflictsStore = transaction.objectStore(STORES.CONFLICTS);
            yield Promise.all([
                new Promise((resolve, reject) => {
                    const request = queueStore.clear();
                    request.onsuccess = () => resolve(undefined);
                    request.onerror = () => reject(request.error);
                }),
                new Promise((resolve, reject) => {
                    const request = conflictsStore.clear();
                    request.onsuccess = () => resolve(undefined);
                    request.onerror = () => reject(request.error);
                })
            ]);
            this.updateStats();
            console.log('Queue cleared');
        });
    }
    getQueueSize() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.getQueueStats();
            return stats.total;
        });
    }
    // ============================================
    // PUBLIC API
    // ============================================
    // Convenience methods for common operations
    createDocument(collection, data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.addToQueue('CREATE', collection, data, options);
        });
    }
    updateDocument(collection, documentId, data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.addToQueue('UPDATE', collection, data, Object.assign(Object.assign({}, options), { documentId, metadata: {
                    originalVersion: options.originalVersion,
                    conflictResolution: options.conflictResolution
                } }));
        });
    }
    deleteDocument(collection, documentId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.addToQueue('DELETE', collection, undefined, Object.assign(Object.assign({}, options), { documentId }));
        });
    }
    batchOperation(operations, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.addToQueue('BATCH', 'batch', { operations }, options);
        });
    }
}
exports.OfflineQueueManager = OfflineQueueManager;
// ============================================
// SINGLETON INSTANCE
// ============================================
exports.offlineQueueManager = new OfflineQueueManager();
