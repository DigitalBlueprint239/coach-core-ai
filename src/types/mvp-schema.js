"use strict";
// MVP Schema - Simplified interfaces for demo
// These wrap our existing comprehensive models for easier MVP development
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromMVPPracticePlan = exports.fromMVPPlayer = exports.fromMVPTeam = exports.fromMVPCoach = exports.toMVPDrill = exports.toMVPPracticePlan = exports.toMVPPlayer = exports.toMVPTeam = exports.toMVPCoach = void 0;
const firestore_1 = require("firebase/firestore");
// ============================================
// CONVERSION UTILITIES
// ============================================
// Convert our advanced models to MVP simplified versions
const toMVPCoach = (user) => ({
    id: user.id || '',
    email: user.email,
    displayName: user.displayName,
    teams: user.teamIds,
    subscription: user.subscription.tier
});
exports.toMVPCoach = toMVPCoach;
const toMVPTeam = (team) => ({
    id: team.id || '',
    name: team.name,
    sport: team.sport,
    level: team.level,
    coachId: team.coachIds[0] || '',
    players: [] // Will be populated separately
});
exports.toMVPTeam = toMVPTeam;
const toMVPPlayer = (player) => ({
    id: player.id || '',
    name: `${player.firstName} ${player.lastName}`,
    position: player.position,
    jerseyNumber: player.jerseyNumber,
    status: 'active' // Default for MVP
});
exports.toMVPPlayer = toMVPPlayer;
const toMVPPracticePlan = (plan) => ({
    id: plan.id || '',
    teamId: plan.teamId,
    title: plan.name,
    date: (plan.date instanceof firestore_1.Timestamp ? plan.date.toDate() : plan.date),
    duration: plan.duration,
    objectives: plan.goals,
    drills: plan.periods.flatMap(period => period.drills.map(drill => ({
        drillId: drill.id,
        name: drill.name,
        duration: drill.duration,
        order: period.order,
        modifications: ''
    }))),
    notes: plan.notes,
    aiGenerated: true // Assume AI generated for MVP
});
exports.toMVPPracticePlan = toMVPPracticePlan;
const toMVPDrill = (drill) => ({
    id: drill.id,
    name: drill.name,
    category: drill.category,
    sport: 'football', // Default for MVP
    skillFocus: [drill.category],
    duration: drill.duration,
    equipment: drill.equipment,
    description: drill.description,
    instructions: drill.instructions,
    difficulty: drill.difficulty
});
exports.toMVPDrill = toMVPDrill;
// Convert MVP models back to our advanced models
const fromMVPCoach = (mvpCoach) => ({
    email: mvpCoach.email,
    displayName: mvpCoach.displayName,
    teamIds: mvpCoach.teams,
    subscription: { tier: mvpCoach.subscription, status: 'active', expiresAt: firestore_1.Timestamp.fromDate(new Date()), features: [], billingCycle: 'monthly' }
});
exports.fromMVPCoach = fromMVPCoach;
const fromMVPTeam = (mvpTeam) => ({
    name: mvpTeam.name,
    sport: mvpTeam.sport,
    level: mvpTeam.level,
    coachIds: [mvpTeam.coachId]
});
exports.fromMVPTeam = fromMVPTeam;
const fromMVPPlayer = (mvpPlayer) => ({
    firstName: mvpPlayer.name.split(' ')[0] || '',
    lastName: mvpPlayer.name.split(' ').slice(1).join(' ') || '',
    position: mvpPlayer.position,
    jerseyNumber: mvpPlayer.jerseyNumber || 0
});
exports.fromMVPPlayer = fromMVPPlayer;
const fromMVPPracticePlan = (mvpPlan) => ({
    name: mvpPlan.title,
    date: mvpPlan.date,
    duration: mvpPlan.duration,
    goals: mvpPlan.objectives,
    notes: mvpPlan.notes || '',
    periods: mvpPlan.drills.map(drill => ({
        id: drill.drillId,
        name: drill.name,
        duration: drill.duration,
        type: 'skill_development',
        drills: [],
        notes: drill.modifications || '',
        order: drill.order
    }))
});
exports.fromMVPPracticePlan = fromMVPPracticePlan;
