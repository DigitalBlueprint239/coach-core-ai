"use strict";
// ============================================
// COACH CORE AI - BACKEND INFRASTRUCTURE
// Complete backend services implementation
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.VersionControlService = exports.MonetizationService = exports.MultiSportService = exports.AIBrainService = exports.RBACService = exports.DatabaseService = void 0;
class DatabaseService {
    constructor(config) {
        this.offline = false;
        this.provider = config.provider;
        this.initializeProvider(config);
        this.setupOfflineMode();
    }
    initializeProvider(config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (config.provider === 'firebase') {
                // Firebase implementation
                const { initializeApp } = yield Promise.resolve().then(() => __importStar(require('firebase/app')));
                const { getFirestore, enableNetwork, disableNetwork } = yield Promise.resolve().then(() => __importStar(require('firebase/firestore')));
                const { getAuth } = yield Promise.resolve().then(() => __importStar(require('firebase/auth')));
                const { getStorage } = yield Promise.resolve().then(() => __importStar(require('firebase/storage')));
                const app = initializeApp(config.config);
                this.db = getFirestore(app);
                this.auth = getAuth(app);
                this.storage = getStorage(app);
                if (config.offlineEnabled) {
                    // Enable offline persistence
                    this.enableOfflineMode();
                }
            }
            else {
                // Supabase implementation
                const { createClient } = yield Promise.resolve().then(() => __importStar(require('@supabase/supabase-js')));
                const client = createClient(config.config.url, config.config.anonKey);
                this.db = client;
                this.auth = client.auth;
                this.storage = client.storage;
            }
        });
    }
    setupOfflineMode() {
        // Monitor network status
        window.addEventListener('online', () => {
            this.offline = false;
            this.syncOfflineData();
        });
        window.addEventListener('offline', () => {
            this.offline = true;
        });
    }
    enableOfflineMode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.provider === 'firebase') {
                // Firebase offline persistence is handled automatically
                console.log('Firebase offline mode enabled');
            }
        });
    }
    syncOfflineData() {
        return __awaiter(this, void 0, void 0, function* () {
            // Sync any offline changes when coming back online
            console.log('Syncing offline data...');
            const offlineQueue = this.getOfflineQueue();
            for (const operation of offlineQueue) {
                try {
                    yield this.executeOperation(operation);
                    this.removeFromOfflineQueue(operation.id);
                }
                catch (error) {
                    console.error('Failed to sync operation:', error);
                }
            }
        });
    }
    getOfflineQueue() {
        const queue = localStorage.getItem('offline_operations');
        return queue ? JSON.parse(queue) : [];
    }
    removeFromOfflineQueue(operationId) {
        const queue = this.getOfflineQueue();
        const updatedQueue = queue.filter(op => op.id !== operationId);
        localStorage.setItem('offline_operations', JSON.stringify(updatedQueue));
    }
    executeOperation(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (operation.type) {
                case 'create':
                    return this.create(operation.collection, operation.data);
                case 'update':
                    return this.update(operation.collection, operation.id, operation.data);
                case 'delete':
                    return this.delete(operation.collection, operation.id);
            }
        });
    }
    // Generic CRUD operations
    create(collection, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.offline) {
                return this.addToOfflineQueue('create', collection, data);
            }
            if (this.provider === 'firebase') {
                const { addDoc, collection: fbCollection } = yield Promise.resolve().then(() => __importStar(require('firebase/firestore')));
                return addDoc(fbCollection(this.db, collection), Object.assign(Object.assign({}, data), { createdAt: new Date(), updatedAt: new Date() }));
            }
            else {
                return this.db.from(collection).insert(Object.assign(Object.assign({}, data), { created_at: new Date(), updated_at: new Date() }));
            }
        });
    }
    read(collection, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.provider === 'firebase') {
                const { getDocs, collection: fbCollection, query, where } = yield Promise.resolve().then(() => __importStar(require('firebase/firestore')));
                let q = fbCollection(this.db, collection);
                if (filters) {
                    Object.entries(filters).forEach(([field, value]) => {
                        q = query(q, where(field, '==', value));
                    });
                }
                const snapshot = yield getDocs(q);
                return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            }
            else {
                let query = this.db.from(collection).select('*');
                if (filters) {
                    Object.entries(filters).forEach(([field, value]) => {
                        query = query.eq(field, value);
                    });
                }
                const { data } = yield query;
                return data;
            }
        });
    }
    update(collection, id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.offline) {
                return this.addToOfflineQueue('update', collection, data, id);
            }
            if (this.provider === 'firebase') {
                const { updateDoc, doc } = yield Promise.resolve().then(() => __importStar(require('firebase/firestore')));
                return updateDoc(doc(this.db, collection, id), Object.assign(Object.assign({}, data), { updatedAt: new Date() }));
            }
            else {
                return this.db.from(collection).update(Object.assign(Object.assign({}, data), { updated_at: new Date() })).eq('id', id);
            }
        });
    }
    delete(collection, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.offline) {
                return this.addToOfflineQueue('delete', collection, null, id);
            }
            if (this.provider === 'firebase') {
                const { deleteDoc, doc } = yield Promise.resolve().then(() => __importStar(require('firebase/firestore')));
                return deleteDoc(doc(this.db, collection, id));
            }
            else {
                return this.db.from(collection).delete().eq('id', id);
            }
        });
    }
    addToOfflineQueue(type, collection, data, id) {
        const operation = {
            id: `offline_${Date.now()}_${Math.random()}`,
            type,
            collection,
            data,
            docId: id,
            timestamp: new Date()
        };
        const queue = this.getOfflineQueue();
        queue.push(operation);
        localStorage.setItem('offline_operations', JSON.stringify(queue));
        return { id: operation.id, offline: true };
    }
}
exports.DatabaseService = DatabaseService;
class RBACService {
    constructor() {
        this.roles = new Map();
        this.initializeDefaultRoles();
    }
    initializeDefaultRoles() {
        const roles = [
            {
                id: 'athletic_director',
                name: 'Athletic Director',
                level: 100,
                permissions: [
                    { resource: '*', actions: ['read', 'write', 'delete', 'admin'] }
                ]
            },
            {
                id: 'head_coach',
                name: 'Head Coach',
                level: 90,
                permissions: [
                    { resource: 'plays', actions: ['read', 'write', 'delete'] },
                    { resource: 'roster', actions: ['read', 'write', 'delete'] },
                    { resource: 'analytics', actions: ['read', 'write'] },
                    { resource: 'practice_plans', actions: ['read', 'write', 'delete'] },
                    { resource: 'feedback', actions: ['read', 'write'] }
                ]
            },
            {
                id: 'assistant_coach',
                name: 'Assistant Coach',
                level: 80,
                permissions: [
                    { resource: 'plays', actions: ['read', 'write'] },
                    { resource: 'roster', actions: ['read'] },
                    { resource: 'analytics', actions: ['read'] },
                    { resource: 'practice_plans', actions: ['read', 'write'] },
                    { resource: 'feedback', actions: ['read'] }
                ]
            },
            {
                id: 'volunteer_coach',
                name: 'Volunteer Coach',
                level: 70,
                permissions: [
                    { resource: 'plays', actions: ['read'] },
                    { resource: 'roster', actions: ['read'] },
                    { resource: 'practice_plans', actions: ['read'] },
                    { resource: 'attendance', actions: ['read', 'write'] }
                ]
            },
            {
                id: 'player',
                name: 'Player',
                level: 50,
                permissions: [
                    { resource: 'plays', actions: ['read'] },
                    { resource: 'practice_plans', actions: ['read'] },
                    { resource: 'feedback', actions: ['write'] },
                    { resource: 'progress', actions: ['read'] }
                ]
            },
            {
                id: 'parent',
                name: 'Parent',
                level: 40,
                permissions: [
                    { resource: 'roster', actions: ['read'] }, // Only their child
                    { resource: 'schedule', actions: ['read'] },
                    { resource: 'progress', actions: ['read'] }, // Only their child
                    { resource: 'notifications', actions: ['read'] }
                ]
            }
        ];
        roles.forEach(role => this.roles.set(role.id, role));
    }
    hasPermission(user, resource, action) {
        // Check if user has any role that grants this permission
        return user.roles.some(roleId => {
            const role = this.roles.get(roleId);
            if (!role)
                return false;
            // Check for wildcard permission
            const wildcardPermission = role.permissions.find(p => p.resource === '*');
            if (wildcardPermission === null || wildcardPermission === void 0 ? void 0 : wildcardPermission.actions.includes(action))
                return true;
            // Check for specific resource permission
            const resourcePermission = role.permissions.find(p => p.resource === resource);
            return (resourcePermission === null || resourcePermission === void 0 ? void 0 : resourcePermission.actions.includes(action)) || false;
        });
    }
    getHighestRole(user) {
        let highestRole = null;
        let highestLevel = -1;
        user.roles.forEach(roleId => {
            const role = this.roles.get(roleId);
            if (role && role.level > highestLevel) {
                highestLevel = role.level;
                highestRole = role;
            }
        });
        return highestRole;
    }
    canAccessResource(user, resource, resourceOwnerId) {
        // Athletic directors can access everything
        if (user.roles.includes('athletic_director'))
            return true;
        // Coaches can access team resources
        if (user.roles.some(r => r.includes('coach'))) {
            return true; // Within their team context
        }
        // Players and parents can only access their own data
        if (user.roles.includes('player') || user.roles.includes('parent')) {
            return resourceOwnerId === user.id;
        }
        return false;
    }
}
exports.RBACService = RBACService;
class AIBrainService {
    constructor(config) {
        this.safetyRules = [];
        this.learningData = new Map();
        this.config = config;
        this.initializeSafetyRules();
    }
    initializeSafetyRules() {
        this.safetyRules = [
            {
                id: 'youth_contact_limit',
                ageGroup: 'youth',
                category: 'contact',
                rule: 'Maximum 2 contact drills per practice',
                severity: 'critical'
            },
            {
                id: 'youth_practice_duration',
                ageGroup: 'youth',
                category: 'duration',
                rule: 'Practice duration cannot exceed 90 minutes',
                severity: 'high'
            },
            {
                id: 'injury_consideration',
                ageGroup: '*',
                category: 'injury',
                rule: 'Injured players must have modified drills',
                severity: 'critical'
            },
            {
                id: 'hydration_breaks',
                ageGroup: '*',
                category: 'safety',
                rule: 'Mandatory water breaks every 15 minutes in hot weather',
                severity: 'high'
            }
        ];
    }
    generatePlaySuggestion(teamContext, gameContext = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            // Analyze team context and generate suggestion
            const suggestion = yield this.createBaseSuggestion(teamContext, gameContext);
            // Apply safety validation
            const safetyScore = this.validateSafety(suggestion, teamContext);
            suggestion.safety_score = safetyScore;
            // Add reasoning based on team data
            suggestion.reasoning = this.generateReasoning(teamContext, gameContext, suggestion);
            // Calculate confidence based on historical data
            suggestion.confidence = this.calculateConfidence(suggestion, teamContext);
            // Generate alternatives
            suggestion.alternatives = yield this.generateAlternatives(suggestion, teamContext);
            return suggestion;
        });
    }
    createBaseSuggestion(teamContext, gameContext) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would typically call an AI model (OpenAI, Claude, etc.)
            // For now, using rule-based logic with mock data
            const formations = this.getAppropriateFormations(teamContext);
            const selectedFormation = formations[Math.floor(Math.random() * formations.length)];
            return {
                id: `suggestion_${Date.now()}`,
                name: this.generatePlayName(selectedFormation, teamContext),
                description: `Strategic play designed for ${teamContext.ageGroup} level team`,
                formation: selectedFormation,
                players: this.generatePlayerPositions(selectedFormation),
                routes: this.generateRoutes(selectedFormation, teamContext),
                confidence: 0.75,
                reasoning: [],
                safety_score: 0,
                alternatives: [],
                metadata: {
                    difficulty: this.getDifficultyLevel(teamContext),
                    injury_risk: 'low',
                    success_probability: 0.72
                }
            };
        });
    }
    validateSafety(suggestion, teamContext) {
        let safetyScore = 100;
        const violations = [];
        // Check age-appropriate rules
        const ageRules = this.safetyRules.filter(rule => rule.ageGroup === teamContext.ageGroup || rule.ageGroup === '*');
        ageRules.forEach(rule => {
            const violation = this.checkRuleViolation(rule, suggestion, teamContext);
            if (violation) {
                violations.push(violation);
                safetyScore -= this.getSeverityPenalty(rule.severity);
            }
        });
        // Additional safety checks
        if (teamContext.injuries.length > 0) {
            safetyScore -= 10; // Reduce score if there are team injuries
        }
        if (suggestion.metadata.difficulty === 'advanced' && teamContext.skill_level !== 'advanced') {
            safetyScore -= 20; // Penalize difficulty mismatch
        }
        return Math.max(0, safetyScore);
    }
    checkRuleViolation(rule, suggestion, teamContext) {
        switch (rule.category) {
            case 'contact':
                if (suggestion.metadata.injury_risk === 'high' && teamContext.ageGroup === 'youth') {
                    return `High contact risk not appropriate for ${teamContext.ageGroup}`;
                }
                break;
            case 'difficulty':
                if (suggestion.metadata.difficulty === 'advanced' &&
                    !['advanced', 'high_school', 'college'].includes(teamContext.ageGroup)) {
                    return `Advanced plays not suitable for ${teamContext.ageGroup}`;
                }
                break;
        }
        return null;
    }
    getSeverityPenalty(severity) {
        switch (severity) {
            case 'critical': return 50;
            case 'high': return 30;
            case 'medium': return 20;
            case 'low': return 10;
            default: return 0;
        }
    }
    generateReasoning(teamContext, gameContext, suggestion) {
        var _a;
        const reasoning = [];
        // Add context-based reasoning
        if (teamContext.skill_level === 'beginner') {
            reasoning.push('Simplified execution suitable for developing players');
        }
        if (((_a = teamContext.recent_performance) === null || _a === void 0 ? void 0 : _a.passing_success) > 70) {
            reasoning.push('Team shows strong passing ability in recent games');
        }
        if (gameContext.weather === 'rainy') {
            reasoning.push('Weather-appropriate play with minimal ball handling');
        }
        // Add formation-specific reasoning
        reasoning.push(`${suggestion.formation} formation maximizes team strengths`);
        return reasoning;
    }
    calculateConfidence(suggestion, teamContext) {
        let confidence = 0.6; // Base confidence
        // Increase confidence based on team fit
        if (suggestion.metadata.difficulty === teamContext.skill_level) {
            confidence += 0.15;
        }
        // Historical success data (would come from real usage)
        const historicalSuccess = this.getHistoricalSuccess(suggestion.formation, teamContext);
        confidence += historicalSuccess * 0.2;
        // Safety considerations
        if (suggestion.safety_score > 80) {
            confidence += 0.1;
        }
        return Math.min(0.95, Math.max(0.3, confidence));
    }
    getHistoricalSuccess(formation, teamContext) {
        // Mock historical data - in production this would query real data
        const mockData = {
            'shotgun': 0.75,
            'i_formation': 0.68,
            'spread': 0.72
        };
        return mockData[formation] || 0.65;
    }
    getAppropriateFormations(teamContext) {
        const allFormations = ['shotgun', 'i_formation', 'spread', 'pro_set', 'pistol'];
        if (teamContext.ageGroup === 'youth') {
            return ['i_formation', 'pro_set']; // Simpler formations
        }
        if (teamContext.skill_level === 'advanced') {
            return allFormations; // All formations available
        }
        return ['shotgun', 'i_formation', 'spread']; // Moderate complexity
    }
    generatePlayerPositions(formation) {
        // Generate player positions based on formation
        const positions = {
            'shotgun': [
                { position: 'QB', x: 300, y: 200 },
                { position: 'RB', x: 250, y: 230 },
                { position: 'WR', x: 150, y: 150 },
                { position: 'WR', x: 450, y: 150 },
                { position: 'WR', x: 500, y: 180 }
            ],
            'i_formation': [
                { position: 'QB', x: 300, y: 180 },
                { position: 'FB', x: 300, y: 210 },
                { position: 'RB', x: 300, y: 240 },
                { position: 'WR', x: 150, y: 150 },
                { position: 'WR', x: 450, y: 150 }
            ]
        };
        return positions[formation] || positions['shotgun'];
    }
    generateRoutes(formation, teamContext) {
        // Generate routes based on formation and team capability
        const routes = [];
        if (teamContext.skill_level !== 'beginner') {
            routes.push({
                playerId: 1,
                points: [{ x: 450, y: 150 }, { x: 480, y: 130 }, { x: 510, y: 110 }],
                type: 'slant',
                color: '#3b82f6'
            });
        }
        return routes;
    }
    generatePlayName(formation, teamContext) {
        const formationNames = {
            'shotgun': 'Shotgun',
            'i_formation': 'I-Form',
            'spread': 'Spread'
        };
        const playTypes = ['Quick', 'Power', 'Deep', 'Screen'];
        const directions = ['Right', 'Left', 'Middle'];
        const formationName = formationNames[formation] || 'Pro';
        const playType = playTypes[Math.floor(Math.random() * playTypes.length)];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        return `${formationName} ${playType} ${direction}`;
    }
    getDifficultyLevel(teamContext) {
        if (teamContext.ageGroup === 'youth')
            return 'beginner';
        if (teamContext.skill_level === 'advanced')
            return 'advanced';
        return 'intermediate';
    }
    generateAlternatives(suggestion, teamContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                { name: 'Screen Pass Left', confidence: 0.68 },
                { name: 'Draw Play', confidence: 0.72 },
                { name: 'Quick Out', confidence: 0.65 }
            ];
        });
    }
    // Learning and feedback system
    recordFeedback(suggestionId, feedback, metadata) {
        if (!this.learningData.has('feedback')) {
            this.learningData.set('feedback', []);
        }
        this.learningData.get('feedback').push({
            suggestionId,
            feedback,
            metadata,
            timestamp: new Date()
        });
        // Persist learning data
        this.persistLearningData();
    }
    persistLearningData() {
        try {
            const data = Object.fromEntries(this.learningData);
            localStorage.setItem('ai_learning_data', JSON.stringify(data));
        }
        catch (error) {
            console.error('Failed to persist learning data:', error);
        }
    }
}
exports.AIBrainService = AIBrainService;
class MultiSportService {
    constructor() {
        this.sports = new Map();
        this.initializeSports();
    }
    initializeSports() {
        const sports = [
            {
                id: 'football',
                name: 'Football',
                positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'],
                formations: ['shotgun', 'i_formation', 'spread', '4-3', '3-4'],
                rules: {
                    maxPlayers: 11,
                    fieldDimensions: { width: 53.3, length: 120 },
                    safetyRules: ['contact_limits', 'hydration_breaks']
                },
                seasons: ['preseason', 'regular', 'playoffs']
            },
            {
                id: 'basketball',
                name: 'Basketball',
                positions: ['PG', 'SG', 'SF', 'PF', 'C'],
                formations: ['man_to_man', 'zone', 'press', 'motion'],
                rules: {
                    maxPlayers: 5,
                    fieldDimensions: { width: 50, length: 94 },
                    safetyRules: ['conditioning_limits', 'injury_protocols']
                },
                seasons: ['preseason', 'regular', 'playoffs', 'tournaments']
            },
            {
                id: 'soccer',
                name: 'Soccer',
                positions: ['GK', 'DF', 'MF', 'FW'],
                formations: ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1'],
                rules: {
                    maxPlayers: 11,
                    fieldDimensions: { width: 70, length: 120 },
                    safetyRules: ['heading_limits', 'hydration_protocols']
                },
                seasons: ['spring', 'fall', 'tournaments']
            }
        ];
        sports.forEach(sport => this.sports.set(sport.id, sport));
    }
    getSportConfig(sportId) {
        return this.sports.get(sportId) || null;
    }
    getAllSports() {
        return Array.from(this.sports.values());
    }
    validateTeamForSport(sportId, teamData) {
        const sport = this.getSportConfig(sportId);
        if (!sport) {
            return { valid: false, errors: ['Invalid sport'] };
        }
        const errors = [];
        // Validate player count
        if (teamData.players && teamData.players.length > sport.rules.maxPlayers) {
            errors.push(`Too many players for ${sport.name} (max: ${sport.rules.maxPlayers})`);
        }
        // Validate positions
        if (teamData.players) {
            teamData.players.forEach((player) => {
                if (player.position && !sport.positions.includes(player.position)) {
                    errors.push(`Invalid position '${player.position}' for ${sport.name}`);
                }
            });
        }
        return { valid: errors.length === 0, errors };
    }
}
exports.MultiSportService = MultiSportService;
class MonetizationService {
    constructor() {
        this.subscriptionTiers = [];
        this.sponsorshipTiers = [];
        this.initializeTiers();
    }
    initializeTiers() {
        this.subscriptionTiers = [
            {
                id: 'free',
                name: 'Free',
                price: 0,
                interval: 'monthly',
                features: [
                    'Basic playbook tools',
                    'Up to 3 teams',
                    'Community support',
                    'Basic templates'
                ],
                limits: {
                    teams: 3,
                    players: 50,
                    plays: 25,
                    storage: '100MB'
                }
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 19,
                interval: 'monthly',
                features: [
                    'Unlimited teams',
                    'AI suggestions',
                    'Advanced analytics',
                    'Video integration',
                    'Priority support',
                    'Custom templates'
                ],
                limits: {
                    teams: -1, // unlimited
                    players: 500,
                    plays: 200,
                    storage: '5GB'
                }
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: 99,
                interval: 'monthly',
                features: [
                    'Everything in Pro',
                    'White-label options',
                    'API access',
                    'SSO integration',
                    'Dedicated support',
                    'Custom development'
                ],
                limits: {
                    teams: -1,
                    players: -1,
                    plays: -1,
                    storage: '50GB'
                }
            }
        ];
        this.sponsorshipTiers = [
            {
                id: 'bronze',
                name: 'Bronze Sponsor',
                price: 500,
                benefits: [
                    'Logo on team pages',
                    'Newsletter mention',
                    '1 month duration'
                ],
                displayOptions: {
                    logo: true,
                    banner: false,
                    newsletter: true
                }
            },
            {
                id: 'silver',
                name: 'Silver Sponsor',
                price: 1500,
                benefits: [
                    'Logo on team pages',
                    'Banner on dashboard',
                    'Newsletter feature',
                    '3 month duration'
                ],
                displayOptions: {
                    logo: true,
                    banner: true,
                    newsletter: true
                }
            },
            {
                id: 'gold',
                name: 'Gold Sponsor',
                price: 3000,
                benefits: [
                    'Premium logo placement',
                    'Custom banner design',
                    'Monthly newsletter feature',
                    'Event mentions',
                    '6 month duration'
                ],
                displayOptions: {
                    logo: true,
                    banner: true,
                    newsletter: true
                }
            }
        ];
    }
    getSubscriptionTiers() {
        return this.subscriptionTiers;
    }
    getSponsorshipTiers() {
        return this.sponsorshipTiers;
    }
    validateFeatureAccess(userTier, feature) {
        const tier = this.subscriptionTiers.find(t => t.id === userTier);
        return tier ? tier.features.includes(feature) : false;
    }
    checkLimits(userTier, usage) {
        const tier = this.subscriptionTiers.find(t => t.id === userTier);
        if (!tier)
            return { exceeded: true, limits: {} };
        const exceeded = {
            teams: tier.limits.teams !== -1 && usage.teams > tier.limits.teams,
            players: tier.limits.players !== -1 && usage.players > tier.limits.players,
            plays: tier.limits.plays !== -1 && usage.plays > tier.limits.plays
        };
        return {
            exceeded: Object.values(exceeded).some(Boolean),
            limits: exceeded
        };
    }
}
exports.MonetizationService = MonetizationService;
class VersionControlService {
    constructor() {
        this.versions = new Map();
    }
    saveVersion(playId, data, changes, author) {
        if (!this.versions.has(playId)) {
            this.versions.set(playId, []);
        }
        const versions = this.versions.get(playId);
        const versionNumber = this.generateVersionNumber(versions);
        const version = {
            id: `${playId}_v${versionNumber}`,
            playId,
            version: versionNumber,
            data: JSON.parse(JSON.stringify(data)), // Deep copy
            changes,
            author,
            timestamp: new Date(),
            approved: false
        };
        versions.push(version);
        this.persistVersions(playId);
        return version.id;
    }
    getVersions(playId) {
        return this.versions.get(playId) || [];
    }
    restoreVersion(playId, versionId) {
        const versions = this.versions.get(playId) || [];
        const version = versions.find(v => v.id === versionId);
        if (!version) {
            throw new Error('Version not found');
        }
        return JSON.parse(JSON.stringify(version.data));
    }
    compareVersions(playId, version1, version2) {
        const versions = this.versions.get(playId) || [];
        const v1 = versions.find(v => v.version === version1);
        const v2 = versions.find(v => v.version === version2);
        if (!v1 || !v2) {
            throw new Error('One or both versions not found');
        }
        return {
            version1: v1,
            version2: v2,
            changes: this.calculateDiff(v1.data, v2.data)
        };
    }
    generateVersionNumber(versions) {
        if (versions.length === 0)
            return '1.0';
        const latestVersion = versions[versions.length - 1].version;
        const [major, minor] = latestVersion.split('.').map(Number);
        return `${major}.${minor + 1}`;
    }
    calculateDiff(data1, data2) {
        // Simple diff calculation - in production use a proper diff library
        const changes = {};
        Object.keys(data2).forEach(key => {
            if (JSON.stringify(data1[key]) !== JSON.stringify(data2[key])) {
                changes[key] = {
                    from: data1[key],
                    to: data2[key]
                };
            }
        });
        return changes;
    }
    persistVersions(playId) {
        const versions = this.versions.get(playId);
        if (versions) {
            localStorage.setItem(`play_versions_${playId}`, JSON.stringify(versions));
        }
    }
    loadVersions(playId) {
        const stored = localStorage.getItem(`play_versions_${playId}`);
        if (stored) {
            this.versions.set(playId, JSON.parse(stored));
        }
    }
}
exports.VersionControlService = VersionControlService;
