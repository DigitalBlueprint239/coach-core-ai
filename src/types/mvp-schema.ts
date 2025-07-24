// MVP Schema - Simplified interfaces for demo
// These wrap our existing comprehensive models for easier MVP development

import { Timestamp } from 'firebase/firestore';
import { 
  User, Team, Player, PracticePlan, Drill, Play,
  TeamContext, GameContext, PlayerContext 
} from './firestore-schema';

// ============================================
// MVP SIMPLIFIED INTERFACES
// ============================================

// Simplified Coach interface for MVP
export interface MVPCoach {
  id: string;
  email: string;
  displayName: string;
  teams: string[]; // Team IDs
  subscription: 'free' | 'pro' | 'enterprise';
}

// Simplified Team interface for MVP
export interface MVPTeam {
  id: string;
  name: string;
  sport: 'football' | 'basketball' | 'soccer';
  level: 'youth' | 'highschool' | 'college';
  coachId: string;
  players: MVPPlayer[];
}

// Simplified Player interface for MVP
export interface MVPPlayer {
  id: string;
  name: string;
  position: string;
  jerseyNumber?: number;
  status: 'active' | 'injured' | 'inactive';
}

// Simplified Practice Plan for MVP
export interface MVPPracticePlan {
  id: string;
  teamId: string;
  title: string;
  date: Date;
  duration: number; // minutes
  objectives: string[];
  drills: MVPPracticeDrill[];
  notes?: string;
  aiGenerated: boolean;
}

// Simplified Practice Drill for MVP
export interface MVPPracticeDrill {
  drillId: string;
  name: string;
  duration: number;
  order: number;
  modifications?: string;
}

// Simplified Drill Library for MVP
export interface MVPDrill {
  id: string;
  name: string;
  category: 'warmup' | 'skill' | 'conditioning' | 'scrimmage' | 'cooldown';
  sport: 'football' | 'basketball' | 'soccer';
  skillFocus: string[];
  duration: number;
  equipment: string[];
  description: string;
  instructions: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ============================================
// CONVERSION UTILITIES
// ============================================

// Convert our advanced models to MVP simplified versions
export const toMVPCoach = (user: User): MVPCoach => ({
  id: user.id || '',
  email: user.email,
  displayName: user.displayName,
  teams: user.teamIds,
  subscription: user.subscription.tier
});

export const toMVPTeam = (team: Team): MVPTeam => ({
  id: team.id || '',
  name: team.name,
  sport: team.sport as 'football' | 'basketball' | 'soccer',
  level: team.level as 'youth' | 'highschool' | 'college',
  coachId: team.coachIds[0] || '',
  players: [] // Will be populated separately
});

export const toMVPPlayer = (player: Player): MVPPlayer => ({
  id: player.id || '',
  name: `${player.firstName} ${player.lastName}`,
  position: player.position,
  jerseyNumber: player.jerseyNumber,
  status: 'active' // Default for MVP
});

export const toMVPPracticePlan = (plan: PracticePlan): MVPPracticePlan => ({
  id: plan.id || '',
  teamId: plan.teamId,
  title: plan.name,
  date: (plan.date instanceof Timestamp ? plan.date.toDate() : plan.date) as Date,
  duration: plan.duration,
  objectives: plan.goals,
  drills: plan.periods.flatMap(period => 
    period.drills.map(drill => ({
      drillId: drill.id,
      name: drill.name,
      duration: drill.duration,
      order: period.order,
      modifications: ''
    }))
  ),
  notes: plan.notes,
  aiGenerated: true // Assume AI generated for MVP
});

export const toMVPDrill = (drill: Drill): MVPDrill => ({
  id: drill.id,
  name: drill.name,
  category: drill.category as any,
  sport: 'football', // Default for MVP
  skillFocus: [drill.category],
  duration: drill.duration,
  equipment: drill.equipment,
  description: drill.description,
  instructions: drill.instructions,
  difficulty: drill.difficulty
});

// Convert MVP models back to our advanced models
export const fromMVPCoach = (mvpCoach: MVPCoach): Partial<User> => ({
  email: mvpCoach.email,
  displayName: mvpCoach.displayName,
  teamIds: mvpCoach.teams,
  subscription: { tier: mvpCoach.subscription, status: 'active', expiresAt: Timestamp.fromDate(new Date()), features: [], billingCycle: 'monthly' }
});

export const fromMVPTeam = (mvpTeam: MVPTeam): Partial<Team> => ({
  name: mvpTeam.name,
  sport: mvpTeam.sport,
  level: mvpTeam.level as any,
  coachIds: [mvpTeam.coachId]
});

export const fromMVPPlayer = (mvpPlayer: MVPPlayer): Partial<Player> => ({
  firstName: mvpPlayer.name.split(' ')[0] || '',
  lastName: mvpPlayer.name.split(' ').slice(1).join(' ') || '',
  position: mvpPlayer.position as any,
  jerseyNumber: mvpPlayer.jerseyNumber || 0
});

export const fromMVPPracticePlan = (mvpPlan: MVPPracticePlan): Partial<PracticePlan> => ({
  name: mvpPlan.title,
  date: mvpPlan.date as any,
  duration: mvpPlan.duration,
  goals: mvpPlan.objectives,
  notes: mvpPlan.notes || '',
  periods: mvpPlan.drills.map(drill => ({
    id: drill.drillId,
    name: drill.name,
    duration: drill.duration,
    type: 'skill_development' as any,
    drills: [],
    notes: drill.modifications || '',
    order: drill.order
  }))
}); 