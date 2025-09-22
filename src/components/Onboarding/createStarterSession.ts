import { PracticePlan, PracticePeriod, Drill } from '../../types';
import { useAppStore } from '../../services/state/app-store';
import PracticeService from '../../services/practice/practice-service';

// Simple starter templates by sport/age could be expanded later
const starterDrills: Drill[] = [
  { id: 'warmup-1', name: 'Dynamic Warmup', description: 'Full-body mobility and activation', duration: 10, intensity: 'low' },
  { id: 'fundamentals-1', name: 'Passing Fundamentals', description: 'Short, accurate passes in motion', duration: 15, intensity: 'medium' },
  { id: 'teamplay-1', name: 'Small-Sided Scrimmage', description: 'Apply concepts in game-like setting', duration: 20, intensity: 'high' },
  { id: 'cooldown-1', name: 'Cooldown & Stretch', description: 'Recovery and flexibility', duration: 10, intensity: 'low' },
];

export function buildStarterSession(teamId: string, userId: string): PracticePlan {
  const periods: PracticePeriod[] = [
    { id: 'p1', name: 'Warmup', duration: 10, drills: [starterDrills[0]] },
    { id: 'p2', name: 'Fundamentals', duration: 15, drills: [starterDrills[1]] },
    { id: 'p3', name: 'Team Play', duration: 20, drills: [starterDrills[2]] },
    { id: 'p4', name: 'Cooldown', duration: 10, drills: [starterDrills[3]] },
  ];

  const total = periods.reduce((sum, p) => sum + p.duration, 0);
  const now = new Date();
  return {
    id: `starter_${Date.now()}`,
    teamId,
    title: 'Starter Session',
    description: 'A guided first practice to get started quickly',
    duration: total,
    periods,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };
}

export async function createAndSaveStarterSession(
  teamId: string,
  userId: string
): Promise<PracticePlan> {
  const plan = buildStarterSession(teamId, userId);
  const practiceService = new PracticeService();
  // Save locally (PracticeService persists to localStorage)
  await practiceService.savePracticePlan(plan);
  // Update app store for immediate UI reflection
  try {
    const { addPractice } = useAppStore.getState();
    addPractice(plan);
  } catch {
    // ignore store update errors in non-react contexts
  }
  return plan;
}

