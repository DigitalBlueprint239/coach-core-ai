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
exports.useMultiUserTesting = exports.MultiUserTestingManager = void 0;
// src/utils/multi-user-testing.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
// ============================================
// MULTI-USER TESTING MANAGER
// ============================================
class MultiUserTestingManager {
    constructor() {
        this.activeTests = new Map();
        this.userSessions = new Map();
        this.listeners = new Map();
        this.conflictResolvers = new Map();
        this.setupDefaultConflictResolvers();
    }
    // ============================================
    // TEST SCENARIO MANAGEMENT
    // ============================================
    runTestScenario(scenario) {
        return __awaiter(this, void 0, void 0, function* () {
            const testResult = {
                scenarioId: scenario.id,
                startTime: Date.now(),
                endTime: 0,
                duration: 0,
                operations: [],
                conflicts: [],
                errors: [],
                success: false,
                summary: {
                    totalOperations: 0,
                    successfulOperations: 0,
                    failedOperations: 0,
                    conflictsDetected: 0,
                    conflictsResolved: 0,
                    averageOperationTime: 0,
                    totalErrors: 0
                }
            };
            this.activeTests.set(scenario.id, testResult);
            try {
                console.log(`Starting test scenario: ${scenario.name}`);
                // Initialize test users
                yield this.initializeTestUsers(scenario.users);
                // Execute operations concurrently
                const operationPromises = scenario.operations.map(operation => this.executeOperation(operation, testResult));
                // Wait for all operations to complete or timeout
                yield Promise.race([
                    Promise.all(operationPromises),
                    this.createTimeout(scenario.timeout)
                ]);
                // Calculate test results
                this.calculateTestSummary(testResult);
                testResult.success = testResult.errors.length === 0;
            }
            catch (error) {
                testResult.errors.push({
                    type: 'operation_failed',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: Date.now()
                });
            }
            finally {
                testResult.endTime = Date.now();
                testResult.duration = testResult.endTime - testResult.startTime;
                this.activeTests.delete(scenario.id);
            }
            return testResult;
        });
    }
    initializeTestUsers(users) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const user of users) {
                this.userSessions.set(user.sessionId, user);
                // Create user document if it doesn't exist
                yield this.createUserDocument(user);
            }
        });
    }
    createUserDocument(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const userDoc = (0, firestore_1.doc)(firebase_1.db, 'users', user.id);
            yield (0, firestore_1.setDoc)(userDoc, {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                teamId: user.teamId,
                sessionId: user.sessionId,
                createdAt: (0, firestore_1.serverTimestamp)(),
                updatedAt: (0, firestore_1.serverTimestamp)()
            }, { merge: true });
        });
    }
    executeOperation(operation, testResult) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait for the specified delay
            if (operation.delay > 0) {
                yield this.sleep(operation.delay);
            }
            const operationResult = {
                operationId: operation.id,
                userId: operation.userId,
                type: operation.type,
                success: false,
                startTime: Date.now(),
                endTime: 0,
                duration: 0
            };
            try {
                switch (operation.type) {
                    case 'create':
                        yield this.executeCreateOperation(operation, operationResult);
                        break;
                    case 'update':
                        yield this.executeUpdateOperation(operation, operationResult);
                        break;
                    case 'delete':
                        yield this.executeDeleteOperation(operation, operationResult);
                        break;
                    case 'read':
                        yield this.executeReadOperation(operation, operationResult);
                        break;
                }
                operationResult.success = true;
                testResult.summary.successfulOperations++;
            }
            catch (error) {
                operationResult.error = error instanceof Error ? error.message : 'Unknown error';
                testResult.summary.failedOperations++;
                testResult.errors.push({
                    type: 'operation_failed',
                    message: operationResult.error,
                    operationId: operation.id,
                    userId: operation.userId,
                    timestamp: Date.now()
                });
            }
            finally {
                operationResult.endTime = Date.now();
                operationResult.duration = operationResult.endTime - operationResult.startTime;
                testResult.operations.push(operationResult);
            }
        });
    }
    executeCreateOperation(operation, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId || this.generateDocumentId());
            yield (0, firestore_1.setDoc)(docRef, Object.assign(Object.assign({}, operation.data), { createdBy: operation.userId, createdAt: (0, firestore_1.serverTimestamp)(), updatedAt: (0, firestore_1.serverTimestamp)() }));
            result.data = { id: docRef.id };
        });
    }
    executeUpdateOperation(operation, result) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!operation.documentId) {
                throw new Error('Document ID required for update operation');
            }
            const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId);
            yield (0, firestore_1.updateDoc)(docRef, Object.assign(Object.assign({}, operation.data), { updatedBy: operation.userId, updatedAt: (0, firestore_1.serverTimestamp)() }));
            result.data = { id: operation.documentId };
        });
    }
    executeDeleteOperation(operation, result) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!operation.documentId) {
                throw new Error('Document ID required for delete operation');
            }
            const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId);
            yield (0, firestore_1.deleteDoc)(docRef);
            result.data = { id: operation.documentId };
        });
    }
    executeReadOperation(operation, result) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!operation.documentId) {
                throw new Error('Document ID required for read operation');
            }
            const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId);
            const docSnap = yield (0, firestore_1.getDoc)(docRef);
            if (docSnap.exists()) {
                result.data = Object.assign({ id: docSnap.id }, docSnap.data());
            }
            else {
                result.data = null;
            }
        });
    }
    generateDocumentId() {
        return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    createTimeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Test timeout')), ms);
        });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ============================================
    // CONFLICT DETECTION AND RESOLUTION
    // ============================================
    setupDefaultConflictResolvers() {
        // Default conflict resolver for practice plans
        this.setConflictResolver('practicePlans', (conflict) => {
            const { localData, serverData } = conflict;
            // Merge strategy: combine both datasets, server wins on conflicts
            return Object.assign(Object.assign(Object.assign({}, localData), serverData), { updatedAt: (0, firestore_1.serverTimestamp)(), conflictResolved: true, resolvedBy: 'system', resolvedAt: (0, firestore_1.serverTimestamp)() });
        });
        // Default conflict resolver for plays
        this.setConflictResolver('plays', (conflict) => {
            var _a, _b;
            const { localData, serverData } = conflict;
            // Last-write-wins strategy
            const localTime = ((_a = localData.updatedAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
            const serverTime = ((_b = serverData.updatedAt) === null || _b === void 0 ? void 0 : _b.toMillis()) || 0;
            return localTime > serverTime ? localData : serverData;
        });
        // Default conflict resolver for players
        this.setConflictResolver('players', (conflict) => {
            const { localData, serverData } = conflict;
            // Field-level merge strategy
            return Object.assign(Object.assign(Object.assign({}, localData), serverData), { stats: Object.assign(Object.assign({}, localData.stats), serverData.stats), updatedAt: (0, firestore_1.serverTimestamp)() });
        });
    }
    setConflictResolver(collection, resolver) {
        this.conflictResolvers.set(collection, resolver);
    }
    detectConflicts(collection, documentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const conflicts = [];
            // Monitor document changes
            const unsubscribe = (0, firestore_1.onSnapshot)((0, firestore_1.doc)(firebase_1.db, collection, documentId), (doc) => {
                // This would implement conflict detection logic
                // For now, we'll simulate conflicts
            });
            return conflicts;
        });
    }
    resolveConflict(conflict) {
        return __awaiter(this, void 0, void 0, function* () {
            const resolver = this.conflictResolvers.get(conflict.collection);
            if (resolver) {
                const resolvedData = resolver(conflict);
                // Update the document with resolved data
                const docRef = (0, firestore_1.doc)(firebase_1.db, conflict.collection, conflict.documentId);
                yield (0, firestore_1.updateDoc)(docRef, Object.assign(Object.assign({}, resolvedData), { conflictResolved: true, resolvedAt: (0, firestore_1.serverTimestamp)() }));
                return resolvedData;
            }
            // Default resolution: server wins
            return conflict.serverData;
        });
    }
    // ============================================
    // REAL-TIME SYNCHRONIZATION TESTING
    // ============================================
    testRealTimeSync(collection, documentId, users) {
        return __awaiter(this, void 0, void 0, function* () {
            const testResult = {
                scenarioId: `realtime_sync_${Date.now()}`,
                startTime: Date.now(),
                endTime: 0,
                duration: 0,
                operations: [],
                conflicts: [],
                errors: [],
                success: false,
                summary: {
                    totalOperations: 0,
                    successfulOperations: 0,
                    failedOperations: 0,
                    conflictsDetected: 0,
                    conflictsResolved: 0,
                    averageOperationTime: 0,
                    totalErrors: 0
                }
            };
            try {
                // Set up real-time listeners for all users
                const listeners = users.map(user => this.setupRealTimeListener(collection, documentId, user, testResult));
                // Perform concurrent updates
                const updatePromises = users.map((user, index) => this.performConcurrentUpdate(collection, documentId, user, index, testResult));
                yield Promise.all(updatePromises);
                // Wait for synchronization
                yield this.sleep(2000);
                // Clean up listeners
                listeners.forEach(unsubscribe => unsubscribe());
                testResult.success = true;
            }
            catch (error) {
                testResult.errors.push({
                    type: 'operation_failed',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: Date.now()
                });
            }
            finally {
                testResult.endTime = Date.now();
                testResult.duration = testResult.endTime - testResult.startTime;
                this.calculateTestSummary(testResult);
            }
            return testResult;
        });
    }
    setupRealTimeListener(collection, documentId, user, testResult) {
        const docRef = (0, firestore_1.doc)(firebase_1.db, collection, documentId);
        return (0, firestore_1.onSnapshot)(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Check for conflicts
                if (data.conflictResolved) {
                    testResult.conflicts.push({
                        id: `conflict_${Date.now()}`,
                        type: 'write_conflict',
                        documentId,
                        collection,
                        users: [user.id],
                        localData: null,
                        serverData: data,
                        resolvedData: data,
                        resolutionStrategy: 'server_wins',
                        timestamp: Date.now()
                    });
                    testResult.summary.conflictsResolved++;
                }
            }
        });
    }
    performConcurrentUpdate(collection, documentId, user, index, testResult) {
        return __awaiter(this, void 0, void 0, function* () {
            const operationResult = {
                operationId: `update_${user.id}_${index}`,
                userId: user.id,
                type: 'update',
                success: false,
                startTime: Date.now(),
                endTime: 0,
                duration: 0
            };
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, collection, documentId);
                yield (0, firestore_1.updateDoc)(docRef, {
                    [`updates.${user.id}`]: {
                        value: `Update from ${user.name} at ${Date.now()}`,
                        timestamp: (0, firestore_1.serverTimestamp)()
                    },
                    updatedAt: (0, firestore_1.serverTimestamp)(),
                    updatedBy: user.id
                });
                operationResult.success = true;
                testResult.summary.successfulOperations++;
            }
            catch (error) {
                operationResult.error = error instanceof Error ? error.message : 'Unknown error';
                testResult.summary.failedOperations++;
            }
            finally {
                operationResult.endTime = Date.now();
                operationResult.duration = operationResult.endTime - operationResult.startTime;
                testResult.operations.push(operationResult);
            }
        });
    }
    // ============================================
    // TEST SCENARIO GENERATORS
    // ============================================
    generateConcurrentUpdateScenario(users, documentId) {
        const operations = users.map((user, index) => ({
            id: `update_${user.id}_${index}`,
            userId: user.id,
            type: 'update',
            collection: 'practicePlans',
            documentId,
            data: {
                [`concurrentUpdate_${user.id}`]: `Update from ${user.name}`,
                updatedBy: user.id
            },
            delay: Math.random() * 1000, // Random delay up to 1 second
            retries: 3
        }));
        return {
            id: `concurrent_update_${Date.now()}`,
            name: 'Concurrent Update Test',
            description: 'Test concurrent updates by multiple users',
            users,
            operations,
            expectedConflicts: users.length - 1,
            timeout: 30000
        };
    }
    generateConflictResolutionScenario(users) {
        const operations = [];
        // Create a document
        operations.push({
            id: 'create_doc',
            userId: users[0].id,
            type: 'create',
            collection: 'practicePlans',
            data: {
                name: 'Test Practice Plan',
                teamId: users[0].teamId,
                createdBy: users[0].id
            },
            delay: 0,
            retries: 3
        });
        // Concurrent updates by different users
        users.forEach((user, index) => {
            operations.push({
                id: `conflict_update_${user.id}`,
                userId: user.id,
                type: 'update',
                collection: 'practicePlans',
                documentId: '{{created_doc_id}}', // Will be replaced with actual ID
                data: {
                    [`userUpdate_${user.id}`]: `Update from ${user.name}`,
                    updatedBy: user.id
                },
                delay: 100 + (index * 50), // Staggered delays
                retries: 3
            });
        });
        return {
            id: `conflict_resolution_${Date.now()}`,
            name: 'Conflict Resolution Test',
            description: 'Test conflict resolution strategies',
            users,
            operations,
            expectedConflicts: users.length,
            timeout: 30000
        };
    }
    // ============================================
    // UTILITY METHODS
    // ============================================
    calculateTestSummary(testResult) {
        const { operations } = testResult;
        testResult.summary.totalOperations = operations.length;
        testResult.summary.successfulOperations = operations.filter(op => op.success).length;
        testResult.summary.failedOperations = operations.filter(op => !op.success).length;
        testResult.summary.conflictsDetected = testResult.conflicts.length;
        testResult.summary.conflictsResolved = testResult.conflicts.filter(c => c.resolvedData).length;
        testResult.summary.totalErrors = testResult.errors.length;
        const successfulOps = operations.filter(op => op.success);
        if (successfulOps.length > 0) {
            const totalTime = successfulOps.reduce((sum, op) => sum + op.duration, 0);
            testResult.summary.averageOperationTime = totalTime / successfulOps.length;
        }
    }
    cleanupTestData(collection, prefix = 'test_') {
        return __awaiter(this, void 0, void 0, function* () {
            // This would implement cleanup logic for test data
            console.log(`Cleaning up test data in ${collection} with prefix ${prefix}`);
        });
    }
    getActiveTests() {
        return Array.from(this.activeTests.values());
    }
    stopTest(testId) {
        this.activeTests.delete(testId);
    }
}
exports.MultiUserTestingManager = MultiUserTestingManager;
// ============================================
// REACT HOOKS
// ============================================
const react_1 = require("react");
const useMultiUserTesting = () => {
    const [manager] = (0, react_1.useState)(() => new MultiUserTestingManager());
    const [activeTests, setActiveTests] = (0, react_1.useState)([]);
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    const runTestScenario = (0, react_1.useCallback)((scenario) => __awaiter(void 0, void 0, void 0, function* () {
        setIsRunning(true);
        try {
            const result = yield manager.runTestScenario(scenario);
            setActiveTests(prev => [...prev, result]);
            return result;
        }
        finally {
            setIsRunning(false);
        }
    }), [manager]);
    const testRealTimeSync = (0, react_1.useCallback)((collection, documentId, users) => __awaiter(void 0, void 0, void 0, function* () {
        setIsRunning(true);
        try {
            const result = yield manager.testRealTimeSync(collection, documentId, users);
            setActiveTests(prev => [...prev, result]);
            return result;
        }
        finally {
            setIsRunning(false);
        }
    }), [manager]);
    const generateConcurrentUpdateScenario = (0, react_1.useCallback)((users, documentId) => {
        return manager.generateConcurrentUpdateScenario(users, documentId);
    }, [manager]);
    const generateConflictResolutionScenario = (0, react_1.useCallback)((users) => {
        return manager.generateConflictResolutionScenario(users);
    }, [manager]);
    return {
        manager,
        activeTests,
        isRunning,
        runTestScenario,
        testRealTimeSync,
        generateConcurrentUpdateScenario,
        generateConflictResolutionScenario,
        cleanupTestData: (collection, prefix) => manager.cleanupTestData(collection, prefix),
        getActiveTests: () => manager.getActiveTests(),
        stopTest: (testId) => manager.stopTest(testId)
    };
};
exports.useMultiUserTesting = useMultiUserTesting;
exports.default = MultiUserTestingManager;
