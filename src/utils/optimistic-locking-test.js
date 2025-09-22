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
exports.optimisticLockingTestManager = exports.OptimisticLockingTestManager = void 0;
// src/utils/optimistic-locking-test.ts
const firestore_1 = require("../services/firestore");
class OptimisticLockingTestManager {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
    }
    /**
     * Test optimistic locking for a specific entity
     */
    testEntityOptimisticLocking(entityType, teamId, entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const testName = `Optimistic Locking Test - ${entityType}`;
            try {
                // Get current entity data
                const currentEntity = yield this.getCurrentEntity(entityType, teamId, entityId);
                if (!currentEntity) {
                    throw new Error(`${entityType} not found`);
                }
                // Simulate concurrent updates
                const updatePromises = [
                    this.simulateUpdate(entityType, teamId, entityId, { name: 'Update 1' }, 0),
                    this.simulateUpdate(entityType, teamId, entityId, { name: 'Update 2' }, 100),
                    this.simulateUpdate(entityType, teamId, entityId, { name: 'Update 3' }, 200)
                ];
                const results = yield Promise.allSettled(updatePromises);
                // Analyze results
                const successfulUpdates = results.filter(r => r.status === 'fulfilled').length;
                const conflicts = results.filter(r => {
                    var _a, _b;
                    return r.status === 'rejected' &&
                        ((_b = (_a = r.reason) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.includes('modified by another user'));
                }).length;
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: conflicts > 0, // Success if conflicts were detected
                    duration,
                    details: {
                        entityType,
                        operation: 'concurrent_update',
                        conflictDetected: conflicts > 0,
                        resolutionStrategy: 'optimistic_locking'
                    }
                };
            }
            catch (error) {
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    duration,
                    details: {
                        entityType,
                        operation: 'concurrent_update',
                        conflictDetected: false,
                        resolutionStrategy: 'none'
                    }
                };
            }
        });
    }
    /**
     * Test optimistic locking across all entity types
     */
    testAllEntities(teamId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                throw new Error('Test already running');
            }
            this.isRunning = true;
            this.testResults = [];
            try {
                // Create test entities if they don't exist
                const testEntities = yield this.createTestEntities(teamId);
                // Test each entity type
                const entityTypes = [
                    'play', 'practicePlan', 'player', 'team', 'user'
                ];
                for (const entityType of entityTypes) {
                    const entityId = testEntities[entityType];
                    if (entityId) {
                        const result = yield this.testEntityOptimisticLocking(entityType, teamId, entityId);
                        this.testResults.push(result);
                    }
                }
                return this.testResults;
            }
            finally {
                this.isRunning = false;
            }
        });
    }
    /**
     * Create test entities for testing
     */
    createTestEntities(teamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const entities = {};
            try {
                // Create test play
                const playId = yield (0, firestore_1.savePlay)(teamId, {
                    name: 'Test Play',
                    formation: '4-3',
                    description: 'Test play for optimistic locking',
                    routes: [],
                    players: [],
                    tags: ['test'],
                    difficulty: 'beginner',
                    sport: 'football'
                });
                entities.play = playId;
                // Create test practice plan
                const planId = yield (0, firestore_1.savePracticePlan)(teamId, {
                    name: 'Test Practice Plan',
                    date: new Date().toISOString(),
                    duration: 90,
                    periods: [],
                    goals: ['Test goal'],
                    notes: 'Test practice plan for optimistic locking'
                });
                entities.practicePlan = planId;
                // Create test player
                const playerId = yield (0, firestore_1.savePlayer)(teamId, {
                    firstName: 'Test',
                    lastName: 'Player',
                    jerseyNumber: 99,
                    position: 'quarterback',
                    grade: 10
                });
                entities.player = playerId;
                // Create test team
                const teamId = yield (0, firestore_1.saveTeam)({
                    name: 'Test Team',
                    sport: 'football',
                    level: 'varsity',
                    season: '2024',
                    coachIds: [],
                    playerIds: []
                });
                entities.team = teamId;
                // Create test user profile
                const userId = yield (0, firestore_1.saveUserProfile)({
                    email: 'test@example.com',
                    displayName: 'Test User',
                    roles: ['coach'],
                    teamIds: [teamId]
                });
                entities.user = userId;
            }
            catch (error) {
                console.error('Error creating test entities:', error);
            }
            return entities;
        });
    }
    /**
     * Get current entity data
     */
    getCurrentEntity(entityType, teamId, entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (entityType) {
                case 'play':
                    const plays = yield (0, firestore_1.getPlays)(teamId);
                    return plays.find(p => p.id === entityId);
                case 'practicePlan':
                    const plans = yield (0, firestore_1.getPracticePlans)(teamId);
                    return plans.find(p => p.id === entityId);
                case 'player':
                    const players = yield (0, firestore_1.getPlayers)(teamId);
                    return players.find(p => p.id === entityId);
                case 'team':
                    const teams = yield (0, firestore_1.getTeams)();
                    return teams.find(t => t.id === entityId);
                case 'user':
                    return yield (0, firestore_1.getUserProfile)(entityId);
                default:
                    return null;
            }
        });
    }
    /**
     * Simulate an update with delay
     */
    simulateUpdate(entityType, teamId, entityId, updates, delayMs) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait for the specified delay
            if (delayMs > 0) {
                yield new Promise(resolve => setTimeout(resolve, delayMs));
            }
            // Get current entity to include version
            const currentEntity = yield this.getCurrentEntity(entityType, teamId, entityId);
            if (!currentEntity) {
                throw new Error(`${entityType} not found`);
            }
            // Prepare update data with version
            const updateData = Object.assign(Object.assign({}, updates), { version: currentEntity.version });
            // Perform the update
            switch (entityType) {
                case 'play':
                    yield (0, firestore_1.updatePlay)(teamId, entityId, updateData);
                    break;
                case 'practicePlan':
                    yield (0, firestore_1.updatePracticePlan)(teamId, entityId, updateData);
                    break;
                case 'player':
                    yield (0, firestore_1.updatePlayer)(teamId, entityId, updateData);
                    break;
                case 'team':
                    yield (0, firestore_1.updateTeam)(entityId, updateData);
                    break;
                case 'user':
                    yield (0, firestore_1.updateUserProfile)(entityId, updateData);
                    break;
            }
        });
    }
    /**
     * Test conflict resolution strategies
     */
    testConflictResolutionStrategies(teamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            // Test 1: Last-write-wins strategy
            const lastWriteWinsResult = yield this.testLastWriteWinsStrategy(teamId);
            results.push(lastWriteWinsResult);
            // Test 2: Merge strategy
            const mergeResult = yield this.testMergeStrategy(teamId);
            results.push(mergeResult);
            // Test 3: User-defined resolution
            const userDefinedResult = yield this.testUserDefinedResolution(teamId);
            results.push(userDefinedResult);
            return results;
        });
    }
    /**
     * Test last-write-wins conflict resolution
     */
    testLastWriteWinsStrategy(teamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const testName = 'Last-Write-Wins Conflict Resolution';
            try {
                // Create a test entity
                const playId = yield (0, firestore_1.savePlay)(teamId, {
                    name: 'Conflict Test Play',
                    formation: '4-3',
                    description: 'Test play for conflict resolution',
                    routes: [],
                    players: [],
                    tags: ['test'],
                    difficulty: 'beginner',
                    sport: 'football'
                });
                // Simulate conflicting updates
                const update1 = this.simulateUpdate('play', teamId, playId, { name: 'Update 1' }, 0);
                const update2 = this.simulateUpdate('play', teamId, playId, { name: 'Update 2' }, 50);
                const results = yield Promise.allSettled([update1, update2]);
                // Check that one succeeded and one failed with conflict
                const successCount = results.filter(r => r.status === 'fulfilled').length;
                const conflictCount = results.filter(r => {
                    var _a, _b;
                    return r.status === 'rejected' &&
                        ((_b = (_a = r.reason) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.includes('modified by another user'));
                }).length;
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: successCount === 1 && conflictCount === 1,
                    duration,
                    details: {
                        entityType: 'play',
                        operation: 'conflict_resolution',
                        conflictDetected: conflictCount > 0,
                        resolutionStrategy: 'last_write_wins'
                    }
                };
            }
            catch (error) {
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    duration,
                    details: {
                        entityType: 'play',
                        operation: 'conflict_resolution',
                        conflictDetected: false,
                        resolutionStrategy: 'last_write_wins'
                    }
                };
            }
        });
    }
    /**
     * Test merge conflict resolution
     */
    testMergeStrategy(teamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const testName = 'Merge Conflict Resolution';
            try {
                // Create a test entity with multiple fields
                const playId = yield (0, firestore_1.savePlay)(teamId, {
                    name: 'Merge Test Play',
                    formation: '4-3',
                    description: 'Test play for merge resolution',
                    routes: [],
                    players: [],
                    tags: ['test'],
                    difficulty: 'beginner',
                    sport: 'football'
                });
                // Simulate updates to different fields
                const update1 = this.simulateUpdate('play', teamId, playId, {
                    name: 'Updated Name',
                    description: 'Updated description'
                }, 0);
                const update2 = this.simulateUpdate('play', teamId, playId, {
                    formation: '3-4',
                    difficulty: 'intermediate'
                }, 50);
                const results = yield Promise.allSettled([update1, update2]);
                // In optimistic locking, only one should succeed
                const successCount = results.filter(r => r.status === 'fulfilled').length;
                const conflictCount = results.filter(r => {
                    var _a, _b;
                    return r.status === 'rejected' &&
                        ((_b = (_a = r.reason) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.includes('modified by another user'));
                }).length;
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: successCount === 1 && conflictCount === 1,
                    duration,
                    details: {
                        entityType: 'play',
                        operation: 'merge_resolution',
                        conflictDetected: conflictCount > 0,
                        resolutionStrategy: 'optimistic_locking'
                    }
                };
            }
            catch (error) {
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    duration,
                    details: {
                        entityType: 'play',
                        operation: 'merge_resolution',
                        conflictDetected: false,
                        resolutionStrategy: 'optimistic_locking'
                    }
                };
            }
        });
    }
    /**
     * Test user-defined conflict resolution
     */
    testUserDefinedResolution(teamId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const testName = 'User-Defined Conflict Resolution';
            try {
                // Create a test entity
                const playId = yield (0, firestore_1.savePlay)(teamId, {
                    name: 'User Resolution Test',
                    formation: '4-3',
                    description: 'Test play for user-defined resolution',
                    routes: [],
                    players: [],
                    tags: ['test'],
                    difficulty: 'beginner',
                    sport: 'football'
                });
                // Simulate a conflict scenario
                const update1 = this.simulateUpdate('play', teamId, playId, { name: 'User Update 1' }, 0);
                const update2 = this.simulateUpdate('play', teamId, playId, { name: 'User Update 2' }, 100);
                const results = yield Promise.allSettled([update1, update2]);
                // Check that conflicts are properly detected
                const conflictCount = results.filter(r => {
                    var _a, _b;
                    return r.status === 'rejected' &&
                        ((_b = (_a = r.reason) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.includes('modified by another user'));
                }).length;
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: conflictCount > 0,
                    duration,
                    details: {
                        entityType: 'play',
                        operation: 'user_defined_resolution',
                        conflictDetected: conflictCount > 0,
                        resolutionStrategy: 'user_choice'
                    }
                };
            }
            catch (error) {
                const duration = Date.now() - startTime;
                return {
                    testName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    duration,
                    details: {
                        entityType: 'play',
                        operation: 'user_defined_resolution',
                        conflictDetected: false,
                        resolutionStrategy: 'user_choice'
                    }
                };
            }
        });
    }
    /**
     * Generate test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;
        const averageDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;
        let report = `
# Optimistic Locking Test Report

## Summary
- Total Tests: ${totalTests}
- Successful: ${successfulTests}
- Failed: ${failedTests}
- Success Rate: ${((successfulTests / totalTests) * 100).toFixed(2)}%
- Average Duration: ${averageDuration.toFixed(2)}ms

## Test Results
`;
        this.testResults.forEach((result, index) => {
            report += `
### ${index + 1}. ${result.testName}
- **Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
- **Entity Type**: ${result.details.entityType}
- **Operation**: ${result.details.operation}
- **Conflict Detected**: ${result.details.conflictDetected ? 'Yes' : 'No'}
- **Resolution Strategy**: ${result.details.resolutionStrategy}
${result.error ? `- **Error**: ${result.error}` : ''}
`;
        });
        return report;
    }
    /**
     * Get test results
     */
    getTestResults() {
        return [...this.testResults];
    }
    /**
     * Clear test results
     */
    clearTestResults() {
        this.testResults = [];
    }
}
exports.OptimisticLockingTestManager = OptimisticLockingTestManager;
// Export singleton instance
exports.optimisticLockingTestManager = new OptimisticLockingTestManager();
