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
exports.useOfflineQueue = void 0;
// src/hooks/useOfflineQueue.ts
const react_1 = require("react");
const OfflineQueueManager_1 = require("../services/offline/OfflineQueueManager");
const useOfflineQueue = (options) => {
    const { userId, teamId, autoSync = true, retryAttempts = 3, onQueueUpdate, onConflict } = options;
    const [isOnline, setIsOnline] = (0, react_1.useState)(navigator.onLine);
    const [queueStats, setQueueStats] = (0, react_1.useState)(null);
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const [lastSync, setLastSync] = (0, react_1.useState)(null);
    // Initialize and monitor queue
    (0, react_1.useEffect)(() => {
        const updateStats = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const stats = yield OfflineQueueManager_1.offlineQueueManager.getQueueStats();
                setQueueStats(stats);
                onQueueUpdate === null || onQueueUpdate === void 0 ? void 0 : onQueueUpdate(stats);
            }
            catch (error) {
                console.error('Failed to get queue stats:', error);
            }
        });
        updateStats();
        const statsInterval = setInterval(updateStats, 5000);
        // Network status listener
        const unsubscribe = OfflineQueueManager_1.offlineQueueManager.onNetworkStatusChange((status) => {
            setIsOnline(status === 'online');
            if (status === 'online' && autoSync) {
                processQueue();
            }
        });
        return () => {
            clearInterval(statsInterval);
            unsubscribe();
        };
    }, [autoSync, onQueueUpdate]);
    // Monitor conflicts
    (0, react_1.useEffect)(() => {
        const checkConflicts = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const conflicts = yield OfflineQueueManager_1.offlineQueueManager.getConflicts();
                if (conflicts.length > 0) {
                    conflicts.forEach(conflict => onConflict === null || onConflict === void 0 ? void 0 : onConflict(conflict));
                }
            }
            catch (error) {
                console.error('Failed to check conflicts:', error);
            }
        });
        checkConflicts();
        const conflictsInterval = setInterval(checkConflicts, 10000);
        return () => clearInterval(conflictsInterval);
    }, [onConflict]);
    // ============================================
    // QUEUE OPERATIONS
    // ============================================
    const addToQueue = (0, react_1.useCallback)((operation) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const itemId = yield OfflineQueueManager_1.offlineQueueManager.addToQueue(operation.type, operation.collection, operation.data, {
                documentId: operation.documentId,
                priority: operation.priority || 'NORMAL',
                userId,
                teamId,
                metadata: Object.assign(Object.assign({}, operation.metadata), { maxRetries: retryAttempts })
            });
            console.log(`Added operation to queue: ${itemId}`);
            return itemId;
        }
        catch (error) {
            console.error('Failed to add to queue:', error);
            throw error;
        }
    }), [userId, teamId, retryAttempts]);
    const processQueue = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        if (isProcessing || !isOnline)
            return;
        setIsProcessing(true);
        try {
            yield OfflineQueueManager_1.offlineQueueManager.processQueue();
            setLastSync(Date.now());
        }
        catch (error) {
            console.error('Failed to process queue:', error);
        }
        finally {
            setIsProcessing(false);
        }
    }), [isProcessing, isOnline]);
    // ============================================
    // CONVENIENCE METHODS
    // ============================================
    const createDocument = (0, react_1.useCallback)((collection, data, priority = 'NORMAL') => __awaiter(void 0, void 0, void 0, function* () {
        return addToQueue({
            type: 'CREATE',
            collection,
            data,
            priority
        });
    }), [addToQueue]);
    const updateDocument = (0, react_1.useCallback)((collection, documentId, data, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
        return addToQueue({
            type: 'UPDATE',
            collection,
            documentId,
            data,
            priority: options.priority || 'NORMAL',
            metadata: {
                originalVersion: options.originalVersion,
                conflictResolution: options.conflictResolution
            }
        });
    }), [addToQueue]);
    const deleteDocument = (0, react_1.useCallback)((collection, documentId, priority = 'NORMAL') => __awaiter(void 0, void 0, void 0, function* () {
        return addToQueue({
            type: 'DELETE',
            collection,
            documentId,
            priority
        });
    }), [addToQueue]);
    const batchOperation = (0, react_1.useCallback)((operations, priority = 'NORMAL') => __awaiter(void 0, void 0, void 0, function* () {
        return addToQueue({
            type: 'BATCH',
            collection: 'batch',
            data: { operations },
            priority
        });
    }), [addToQueue]);
    // ============================================
    // QUEUE MANAGEMENT
    // ============================================
    const getQueueItems = (0, react_1.useCallback)((filters) => __awaiter(void 0, void 0, void 0, function* () {
        return OfflineQueueManager_1.offlineQueueManager.getQueueItems(Object.assign({ userId }, filters));
    }), [userId]);
    const removeFromQueue = (0, react_1.useCallback)((itemId) => __awaiter(void 0, void 0, void 0, function* () {
        yield OfflineQueueManager_1.offlineQueueManager.removeFromQueue(itemId);
    }), []);
    const clearQueue = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        yield OfflineQueueManager_1.offlineQueueManager.clearQueue();
    }), []);
    const getConflicts = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        return OfflineQueueManager_1.offlineQueueManager.getConflicts();
    }), []);
    const resolveConflict = (0, react_1.useCallback)((itemId, resolution, mergedData) => __awaiter(void 0, void 0, void 0, function* () {
        yield OfflineQueueManager_1.offlineQueueManager.resolveConflict(itemId, resolution, mergedData, userId);
    }), [userId]);
    // ============================================
    // RETRY UTILITY
    // ============================================
    const withRetry = (0, react_1.useCallback)((fn, options = { maxAttempts: 3, delay: 1000 }) => __awaiter(void 0, void 0, void 0, function* () {
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
    }), []);
    // ============================================
    // SMART RETRY LOGIC
    // ============================================
    const retryWithBackoff = (0, react_1.useCallback)((operation, maxRetries = retryAttempts) => __awaiter(void 0, void 0, void 0, function* () {
        return withRetry(operation, { maxAttempts: maxRetries, delay: 1000 });
    }), [retryAttempts, withRetry]);
    // ============================================
    // TRANSACTION SUPPORT
    // ============================================
    const createTransaction = (0, react_1.useCallback)(() => {
        const operations = [];
        return {
            add: (operation) => {
                operations.push(operation);
            },
            commit: (priority = 'NORMAL') => __awaiter(void 0, void 0, void 0, function* () {
                if (operations.length === 0) {
                    throw new Error('No operations in transaction');
                }
                return batchOperation(operations, priority);
            }),
            rollback: () => {
                operations.length = 0;
            },
            getOperations: () => [...operations]
        };
    }, [batchOperation]);
    // ============================================
    // INTEGRATION HELPERS
    // ============================================
    const withOfflineFallback = (0, react_1.useCallback)((onlineOperation, offlineOperation, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
        if (isOnline) {
            try {
                return yield retryWithBackoff(onlineOperation);
            }
            catch (error) {
                console.warn('Online operation failed, falling back to offline queue:', error);
                return yield offlineOperation();
            }
        }
        else {
            return yield offlineOperation();
        }
    }), [isOnline, retryWithBackoff]);
    const createOfflineWrapper = (0, react_1.useCallback)((collection) => ({
        create: (data, priority) => createDocument(collection, data, priority),
        update: (documentId, data, options) => updateDocument(collection, documentId, data, options),
        delete: (documentId, priority) => deleteDocument(collection, documentId, priority),
        batch: (operations, priority) => batchOperation(operations.map(op => (Object.assign(Object.assign({}, op), { collection }))), priority)
    }), [createDocument, updateDocument, deleteDocument, batchOperation]);
    // ============================================
    // RETURN OBJECT
    // ============================================
    return {
        // State
        isOnline,
        queueStats,
        isProcessing,
        lastSync,
        // Core operations
        addToQueue,
        processQueue,
        createDocument,
        updateDocument,
        deleteDocument,
        batchOperation,
        // Queue management
        getQueueItems,
        removeFromQueue,
        clearQueue,
        getConflicts,
        resolveConflict,
        // Advanced features
        withRetry,
        retryWithBackoff,
        createTransaction,
        withOfflineFallback,
        createOfflineWrapper,
        // Utility methods
        getQueueSize: () => (queueStats === null || queueStats === void 0 ? void 0 : queueStats.total) || 0,
        hasPendingItems: () => ((queueStats === null || queueStats === void 0 ? void 0 : queueStats.pending) || 0) > 0,
        hasConflicts: () => ((queueStats === null || queueStats === void 0 ? void 0 : queueStats.conflicts) || 0) > 0
    };
};
exports.useOfflineQueue = useOfflineQueue;
