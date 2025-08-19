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
exports.useSecurityVerification = exports.SecurityVerificationManager = void 0;
// src/utils/security-verification.ts
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../services/firebase");
// ============================================
// SECURITY VERIFICATION MANAGER
// ============================================
class SecurityVerificationManager {
    constructor() {
        this.testUsers = new Map();
        this.testData = new Map();
        this.securityTests = [];
        this.initializeTestUsers();
        this.initializeSecurityTests();
    }
    // ============================================
    // TEST USER MANAGEMENT
    // ============================================
    initializeTestUsers() {
        // Admin user
        this.testUsers.set('admin', {
            userId: 'admin_user',
            roles: ['admin'],
            teamIds: ['team_1', 'team_2'],
            isAuthenticated: true,
            customClaims: { admin: true }
        });
        // Head coach
        this.testUsers.set('head_coach', {
            userId: 'head_coach_user',
            roles: ['head_coach'],
            teamIds: ['team_1'],
            isAuthenticated: true,
            customClaims: { teamOwner: true }
        });
        // Assistant coach
        this.testUsers.set('assistant_coach', {
            userId: 'assistant_coach_user',
            roles: ['assistant_coach'],
            teamIds: ['team_1'],
            isAuthenticated: true,
            customClaims: { teamMember: true }
        });
        // Player
        this.testUsers.set('player', {
            userId: 'player_user',
            roles: ['player'],
            teamIds: ['team_1'],
            isAuthenticated: true,
            customClaims: { teamMember: true }
        });
        // Parent
        this.testUsers.set('parent', {
            userId: 'parent_user',
            roles: ['parent'],
            teamIds: ['team_1'],
            isAuthenticated: true,
            customClaims: { hasChildren: true }
        });
        // Unauthenticated user
        this.testUsers.set('anonymous', {
            userId: 'anonymous_user',
            roles: [],
            teamIds: [],
            isAuthenticated: false,
            customClaims: {}
        });
        // Cross-team user
        this.testUsers.set('cross_team', {
            userId: 'cross_team_user',
            roles: ['head_coach'],
            teamIds: ['team_2'],
            isAuthenticated: true,
            customClaims: { teamOwner: true }
        });
    }
    // ============================================
    // SECURITY TEST INITIALIZATION
    // ============================================
    initializeSecurityTests() {
        // User access tests
        this.addUserAccessTests();
        // Team access tests
        this.addTeamAccessTests();
        // Player access tests
        this.addPlayerAccessTests();
        // Practice plan access tests
        this.addPracticePlanAccessTests();
        // Play access tests
        this.addPlayAccessTests();
        // Data isolation tests
        this.addDataIsolationTests();
        // Privilege escalation tests
        this.addPrivilegeEscalationTests();
        // Injection attack tests
        this.addInjectionTests();
    }
    addUserAccessTests() {
        // Test user profile access
        this.securityTests.push({
            id: 'user_profile_self_access',
            name: 'User can access own profile',
            description: 'User should be able to read their own profile',
            operation: {
                type: 'read',
                collection: 'users',
                documentId: 'head_coach_user'
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'user_profile_other_access',
            name: 'User cannot access other user profile',
            description: 'User should not be able to read other user profiles',
            operation: {
                type: 'read',
                collection: 'users',
                documentId: 'player_user'
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'user_profile_anonymous_access',
            name: 'Anonymous user cannot access user profiles',
            description: 'Unauthenticated users should not access user profiles',
            operation: {
                type: 'read',
                collection: 'users',
                documentId: 'head_coach_user'
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('anonymous')
        });
    }
    addTeamAccessTests() {
        // Test team access for team members
        this.securityTests.push({
            id: 'team_member_access',
            name: 'Team member can access team data',
            description: 'Team members should be able to read their team data',
            operation: {
                type: 'read',
                collection: 'teams',
                documentId: 'team_1'
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'team_non_member_access',
            name: 'Non-team member cannot access team data',
            description: 'Users not in the team should not access team data',
            operation: {
                type: 'read',
                collection: 'teams',
                documentId: 'team_1'
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('cross_team')
        });
        this.securityTests.push({
            id: 'team_owner_update',
            name: 'Team owner can update team data',
            description: 'Team owners should be able to update team settings',
            operation: {
                type: 'update',
                collection: 'teams',
                documentId: 'team_1',
                data: { name: 'Updated Team Name' }
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'team_member_update_denied',
            name: 'Team member cannot update team data',
            description: 'Regular team members should not update team settings',
            operation: {
                type: 'update',
                collection: 'teams',
                documentId: 'team_1',
                data: { name: 'Unauthorized Update' }
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('assistant_coach')
        });
    }
    addPlayerAccessTests() {
        // Test player data access
        this.securityTests.push({
            id: 'player_team_coach_access',
            name: 'Team coach can access player data',
            description: 'Coaches should be able to read player data in their team',
            operation: {
                type: 'read',
                collection: 'players',
                documentId: 'player_1'
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'player_other_team_access',
            name: 'Other team coach cannot access player data',
            description: 'Coaches should not access player data from other teams',
            operation: {
                type: 'read',
                collection: 'players',
                documentId: 'player_1'
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('cross_team')
        });
        this.securityTests.push({
            id: 'player_medical_info_access',
            name: 'Medical info access restricted',
            description: 'Medical information should be restricted to authorized personnel',
            operation: {
                type: 'read',
                collection: 'players',
                documentId: 'player_1'
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach'),
            metadata: { checkMedicalInfo: true }
        });
    }
    addPracticePlanAccessTests() {
        // Test practice plan access
        this.securityTests.push({
            id: 'practice_plan_team_access',
            name: 'Team member can access practice plans',
            description: 'Team members should access practice plans for their team',
            operation: {
                type: 'read',
                collection: 'practicePlans',
                documentId: 'plan_1'
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'practice_plan_create',
            name: 'Coach can create practice plans',
            description: 'Coaches should be able to create practice plans',
            operation: {
                type: 'create',
                collection: 'practicePlans',
                data: {
                    teamId: 'team_1',
                    name: 'Test Practice Plan',
                    date: firestore_1.Timestamp.now(),
                    duration: 90
                }
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'practice_plan_player_create_denied',
            name: 'Player cannot create practice plans',
            description: 'Players should not create practice plans',
            operation: {
                type: 'create',
                collection: 'practicePlans',
                data: {
                    teamId: 'team_1',
                    name: 'Unauthorized Plan',
                    date: firestore_1.Timestamp.now(),
                    duration: 90
                }
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('player')
        });
    }
    addPlayAccessTests() {
        // Test play access
        this.securityTests.push({
            id: 'play_team_access',
            name: 'Team member can access plays',
            description: 'Team members should access plays for their team',
            operation: {
                type: 'read',
                collection: 'plays',
                documentId: 'play_1'
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'play_create_coach',
            name: 'Coach can create plays',
            description: 'Coaches should be able to create plays',
            operation: {
                type: 'create',
                collection: 'plays',
                data: {
                    teamId: 'team_1',
                    name: 'Test Play',
                    formation: 'Shotgun',
                    description: 'A test play'
                }
            },
            expectedResult: 'allow',
            userContext: this.testUsers.get('head_coach')
        });
    }
    addDataIsolationTests() {
        // Test data isolation between teams
        this.securityTests.push({
            id: 'team_data_isolation',
            name: 'Team data isolation',
            description: 'Users should only access data from their teams',
            operation: {
                type: 'list',
                collection: 'players',
                filters: { teamId: 'team_2' }
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'cross_team_query_denied',
            name: 'Cross-team query denied',
            description: 'Queries across teams should be denied',
            operation: {
                type: 'query',
                collection: 'practicePlans',
                filters: { teamId: 'team_2' }
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('head_coach')
        });
    }
    addPrivilegeEscalationTests() {
        // Test privilege escalation attempts
        this.securityTests.push({
            id: 'role_escalation_attempt',
            name: 'Role escalation attempt',
            description: 'Users should not be able to escalate their roles',
            operation: {
                type: 'update',
                collection: 'users',
                documentId: 'assistant_coach_user',
                data: { roles: ['admin'] }
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('assistant_coach')
        });
        this.securityTests.push({
            id: 'team_ownership_escalation',
            name: 'Team ownership escalation',
            description: 'Users should not be able to claim team ownership',
            operation: {
                type: 'update',
                collection: 'teams',
                documentId: 'team_1',
                data: { ownerId: 'assistant_coach_user' }
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('assistant_coach')
        });
    }
    addInjectionTests() {
        // Test injection attacks
        this.securityTests.push({
            id: 'sql_injection_attempt',
            name: 'SQL injection attempt',
            description: 'Should prevent SQL injection in queries',
            operation: {
                type: 'query',
                collection: 'users',
                filters: { email: "'; DROP TABLE users; --" }
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('head_coach')
        });
        this.securityTests.push({
            id: 'path_traversal_attempt',
            name: 'Path traversal attempt',
            description: 'Should prevent path traversal attacks',
            operation: {
                type: 'read',
                collection: 'users',
                documentId: '../../../etc/passwd'
            },
            expectedResult: 'deny',
            userContext: this.testUsers.get('head_coach')
        });
    }
    // ============================================
    // SECURITY TEST EXECUTION
    // ============================================
    runSecurityTests() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting security verification...');
            const startTime = Date.now();
            const results = [];
            const recommendations = [];
            const vulnerabilities = [];
            // Run each security test
            for (const test of this.securityTests) {
                const result = yield this.executeSecurityTest(test);
                results.push(result);
                // Analyze test results for recommendations and vulnerabilities
                this.analyzeTestResult(result, recommendations, vulnerabilities);
            }
            // Generate compliance status
            const compliance = this.checkCompliance(results);
            // Calculate summary
            const summary = this.calculateSummary(results, Date.now() - startTime);
            const report = {
                summary,
                tests: results,
                recommendations,
                vulnerabilities,
                compliance
            };
            console.log('Security verification completed');
            return report;
        });
    }
    executeSecurityTest(test) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const result = {
                testId: test.id,
                testName: test.name,
                success: false,
                expectedResult: test.expectedResult,
                actualResult: 'deny',
                duration: 0,
                timestamp: Date.now()
            };
            try {
                const operation = test.operation;
                let success = false;
                switch (operation.type) {
                    case 'read':
                        success = yield this.testReadOperation(operation, test.userContext);
                        break;
                    case 'write':
                    case 'create':
                        success = yield this.testCreateOperation(operation, test.userContext);
                        break;
                    case 'update':
                        success = yield this.testUpdateOperation(operation, test.userContext);
                        break;
                    case 'delete':
                        success = yield this.testDeleteOperation(operation, test.userContext);
                        break;
                    case 'list':
                        success = yield this.testListOperation(operation, test.userContext);
                        break;
                    case 'query':
                        success = yield this.testQueryOperation(operation, test.userContext);
                        break;
                }
                result.actualResult = success ? 'allow' : 'deny';
                result.success = (result.actualResult === result.expectedResult);
            }
            catch (error) {
                result.error = error instanceof Error ? error.message : 'Unknown error';
                result.actualResult = 'deny';
                result.success = (result.expectedResult === 'deny');
            }
            finally {
                result.duration = Date.now() - startTime;
            }
            return result;
        });
    }
    testReadOperation(operation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId);
                const docSnap = yield (0, firestore_1.getDoc)(docRef);
                return docSnap.exists();
            }
            catch (error) {
                return false;
            }
        });
    }
    testCreateOperation(operation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId || this.generateDocumentId());
                yield (0, firestore_1.setDoc)(docRef, Object.assign(Object.assign({}, operation.data), { createdBy: userContext.userId, createdAt: (0, firestore_1.serverTimestamp)() }));
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    testUpdateOperation(operation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId);
                yield (0, firestore_1.updateDoc)(docRef, Object.assign(Object.assign({}, operation.data), { updatedBy: userContext.userId, updatedAt: (0, firestore_1.serverTimestamp)() }));
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    testDeleteOperation(operation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const docRef = (0, firestore_1.doc)(firebase_1.db, operation.collection, operation.documentId);
                yield (0, firestore_1.deleteDoc)(docRef);
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    testListOperation(operation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collectionRef = (0, firestore_1.collection)(firebase_1.db, operation.collection);
                const snapshot = yield (0, firestore_1.getDocs)(collectionRef);
                return !snapshot.empty;
            }
            catch (error) {
                return false;
            }
        });
    }
    testQueryOperation(operation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let q = (0, firestore_1.collection)(firebase_1.db, operation.collection);
                if (operation.filters) {
                    Object.entries(operation.filters).forEach(([field, value]) => {
                        q = (0, firestore_1.query)(q, (0, firestore_1.where)(field, '==', value));
                    });
                }
                if (operation.orderBy) {
                    q = (0, firestore_1.query)(q, (0, firestore_1.orderBy)(operation.orderBy));
                }
                if (operation.limit) {
                    q = (0, firestore_1.query)(q, (0, firestore_1.limit)(operation.limit));
                }
                const snapshot = yield (0, firestore_1.getDocs)(q);
                return !snapshot.empty;
            }
            catch (error) {
                return false;
            }
        });
    }
    generateDocumentId() {
        return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // ============================================
    // ANALYSIS AND REPORTING
    // ============================================
    analyzeTestResult(result, recommendations, vulnerabilities) {
        if (!result.success) {
            if (result.expectedResult === 'allow' && result.actualResult === 'deny') {
                // False negative - legitimate access denied
                recommendations.push({
                    type: 'medium',
                    title: 'Legitimate access denied',
                    description: `Test "${result.testName}" failed - legitimate access was denied`,
                    impact: 'Users may not be able to perform necessary operations',
                    remediation: 'Review security rules for overly restrictive conditions',
                    ruleAffected: 'Access control rules'
                });
            }
            else if (result.expectedResult === 'deny' && result.actualResult === 'allow') {
                // False positive - unauthorized access allowed
                vulnerabilities.push({
                    type: 'unauthorized_access',
                    severity: 'high',
                    title: 'Unauthorized access allowed',
                    description: `Test "${result.testName}" failed - unauthorized access was allowed`,
                    affectedRules: ['Access control rules'],
                    exploitScenario: 'Attackers could access sensitive data or perform unauthorized operations',
                    remediation: 'Strengthen security rules to properly restrict access'
                });
            }
        }
    }
    checkCompliance(results) {
        const compliance = {
            gdpr: true,
            hipaa: true,
            ferpa: true,
            sox: true,
            issues: []
        };
        // Check GDPR compliance
        const dataAccessTests = results.filter(r => r.testName.includes('data') || r.testName.includes('profile'));
        if (dataAccessTests.some(r => !r.success && r.expectedResult === 'allow')) {
            compliance.gdpr = false;
            compliance.issues.push('Data access controls may not meet GDPR requirements');
        }
        // Check HIPAA compliance
        const medicalTests = results.filter(r => r.testName.includes('medical') || r.testName.includes('health'));
        if (medicalTests.some(r => !r.success && r.expectedResult === 'deny')) {
            compliance.hipaa = false;
            compliance.issues.push('Medical data access controls may not meet HIPAA requirements');
        }
        // Check FERPA compliance
        const studentTests = results.filter(r => r.testName.includes('student') || r.testName.includes('grade'));
        if (studentTests.some(r => !r.success && r.expectedResult === 'deny')) {
            compliance.ferpa = false;
            compliance.issues.push('Student data access controls may not meet FERPA requirements');
        }
        return compliance;
    }
    calculateSummary(results, duration) {
        const totalTests = results.length;
        const passedTests = results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = (passedTests / totalTests) * 100;
        const criticalIssues = results.filter(r => !r.success && r.expectedResult === 'deny').length;
        const warnings = results.filter(r => !r.success && r.expectedResult === 'allow').length;
        return {
            totalTests,
            passedTests,
            failedTests,
            successRate,
            criticalIssues,
            warnings,
            testDuration: duration
        };
    }
    // ============================================
    // UTILITY METHODS
    // ============================================
    addCustomTest(test) {
        this.securityTests.push(test);
    }
    getTestUsers() {
        return new Map(this.testUsers);
    }
    createCustomUserContext(userId, roles, teamIds) {
        return {
            userId,
            roles,
            teamIds,
            isAuthenticated: true,
            customClaims: {}
        };
    }
    generateSecurityReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const report = yield this.runSecurityTests();
            return JSON.stringify(report, null, 2);
        });
    }
}
exports.SecurityVerificationManager = SecurityVerificationManager;
// ============================================
// REACT HOOKS
// ============================================
const react_1 = require("react");
const useSecurityVerification = () => {
    const [manager] = (0, react_1.useState)(() => new SecurityVerificationManager());
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    const [lastReport, setLastReport] = (0, react_1.useState)(null);
    const runSecurityTests = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        setIsRunning(true);
        try {
            const report = yield manager.runSecurityTests();
            setLastReport(report);
            return report;
        }
        finally {
            setIsRunning(false);
        }
    }), [manager]);
    const generateReport = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        return manager.generateSecurityReport();
    }), [manager]);
    return {
        manager,
        isRunning,
        lastReport,
        runSecurityTests,
        generateReport,
        addCustomTest: (test) => manager.addCustomTest(test),
        getTestUsers: () => manager.getTestUsers(),
        createCustomUserContext: (userId, roles, teamIds) => manager.createCustomUserContext(userId, roles, teamIds)
    };
};
exports.useSecurityVerification = useSecurityVerification;
exports.default = SecurityVerificationManager;
