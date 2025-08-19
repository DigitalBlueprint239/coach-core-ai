"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDEX_CONFIGS = exports.COLLECTIONS = exports.ValidationSchemas = void 0;
const football_1 = require("./football");
// ============================================
// VALIDATION SCHEMAS
// ============================================
exports.ValidationSchemas = {
    user: {
        email: { required: true, type: 'email', maxLength: 255 },
        displayName: { required: true, minLength: 2, maxLength: 100 },
        roles: { required: true, type: 'array', minLength: 1 },
        persona: { required: true, type: 'enum', values: ['first_time_coach', 'experienced_coach', 'youth_coach', 'high_school_coach', 'college_coach'] }
    },
    team: {
        name: { required: true, minLength: 2, maxLength: 100 },
        sport: { required: true, type: 'enum', values: ['football', 'basketball', 'soccer', 'baseball', 'volleyball', 'hockey', 'lacrosse', 'track', 'swimming', 'tennis'] },
        level: { required: true, type: 'enum', values: Object.values(football_1.FootballLevel) },
        coachIds: { required: true, type: 'array', minLength: 1 },
        constraints: { required: false, type: 'object' },
        level_extensions: { required: false, type: 'object' }
    },
    player: {
        firstName: { required: true, minLength: 1, maxLength: 50 },
        lastName: { required: true, minLength: 1, maxLength: 50 },
        jerseyNumber: { required: true, type: 'number', min: 0, max: 99 },
        position: { required: true, minLength: 1, maxLength: 50 },
        teamId: { required: true, type: 'string' },
        level: { required: true, type: 'enum', values: Object.values(football_1.FootballLevel) },
        constraints: { required: false, type: 'object' },
        level_extensions: { required: false, type: 'object' }
    },
    practicePlan: {
        name: { required: true, minLength: 1, maxLength: 200 },
        teamId: { required: true, type: 'string' },
        date: { required: true, type: 'timestamp' },
        duration: { required: true, type: 'number', min: 15, max: 480 },
        periods: { required: true, type: 'array', minLength: 1 }
    },
    play: {
        name: { required: true, minLength: 1, maxLength: 100 },
        teamId: { required: true, type: 'string' },
        formation: { required: true, minLength: 1, maxLength: 50 },
        description: { required: true, minLength: 10, maxLength: 1000 },
        routes: { required: true, type: 'array', minLength: 1 },
        players: { required: true, type: 'array', minLength: 1 },
        level: { required: true, type: 'enum', values: Object.values(football_1.FootballLevel) },
        constraints: { required: false, type: 'object' },
        level_extensions: { required: false, type: 'object' }
    }
};
// ============================================
// COLLECTION NAMES
// ============================================
exports.COLLECTIONS = {
    USERS: 'users',
    TEAMS: 'teams',
    PLAYERS: 'players',
    PRACTICE_PLANS: 'practicePlans',
    PLAYS: 'plays',
    ANALYTICS_EVENTS: 'analyticsEvents',
    FEEDBACK: 'feedback',
    AI_INSIGHTS: 'aiInsights',
    AI_CONVERSATIONS: 'aiConversations',
    NOTIFICATIONS: 'notifications',
    USER_PROFILES: 'userProfiles',
    TEAM_STATS: 'teamStats',
    PLAYER_STATS: 'playerStats',
    PRACTICE_FEEDBACK: 'practiceFeedback',
    ATTENDANCE: 'attendance',
    GAME_SCHEDULE: 'gameSchedule',
    ACHIEVEMENTS: 'achievements',
    BADGES: 'badges',
    EQUIPMENT: 'equipment',
    DRILL_LIBRARY: 'drillLibrary'
};
// ============================================
// INDEX CONFIGURATIONS
// ============================================
exports.INDEX_CONFIGS = {
    // User indexes
    users_email: { collection: 'users', fields: ['email', 'createdAt'] },
    users_roles: { collection: 'users', fields: ['roles', 'createdAt'] },
    users_teamIds: { collection: 'users', fields: ['teamIds', 'createdAt'] },
    // Team indexes
    teams_coachIds: { collection: 'teams', fields: ['coachIds', 'createdAt'] },
    teams_sport_ageGroup: { collection: 'teams', fields: ['sport', 'ageGroup', 'createdAt'] },
    teams_season: { collection: 'teams', fields: ['season', 'createdAt'] },
    // Player indexes
    players_teamId: { collection: 'players', fields: ['teamId', 'createdAt'] },
    players_position: { collection: 'players', fields: ['position', 'teamId'] },
    players_jerseyNumber: { collection: 'players', fields: ['jerseyNumber', 'teamId'] },
    // Practice plan indexes
    practicePlans_teamId_date: { collection: 'practicePlans', fields: ['teamId', 'date', 'createdAt'] },
    practicePlans_status: { collection: 'practicePlans', fields: ['status', 'teamId'] },
    practicePlans_createdBy: { collection: 'practicePlans', fields: ['createdBy', 'createdAt'] },
    // Play indexes
    plays_teamId_category: { collection: 'plays', fields: ['teamId', 'category', 'createdAt'] },
    plays_difficulty: { collection: 'plays', fields: ['difficulty', 'teamId'] },
    plays_tags: { collection: 'plays', fields: ['tags', 'teamId'] },
    // Analytics indexes
    analytics_userId_eventType: { collection: 'analyticsEvents', fields: ['userId', 'eventType', 'timestamp'] },
    analytics_teamId: { collection: 'analyticsEvents', fields: ['teamId', 'timestamp'] },
    // Notification indexes
    notifications_userId_read: { collection: 'notifications', fields: ['userId', 'isRead', 'createdAt'] },
    notifications_type: { collection: 'notifications', fields: ['type', 'userId'] }
};
