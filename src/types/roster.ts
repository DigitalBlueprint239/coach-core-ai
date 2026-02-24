// src/types/roster.ts
// Football-specific roster types used across the entire application.
// These types are read by the AI for roster-aware practice plan generation.

import { Timestamp, FieldValue } from 'firebase/firestore';

// All 22 football positions
export enum FootballPosition {
  QB = 'QB',
  RB = 'RB',
  FB = 'FB',
  WR = 'WR',
  TE = 'TE',
  LT = 'LT',
  LG = 'LG',
  C = 'C',
  RG = 'RG',
  RT = 'RT',
  DE = 'DE',
  DT = 'DT',
  NT = 'NT',
  OLB = 'OLB',
  MLB = 'MLB',
  ILB = 'ILB',
  CB = 'CB',
  FS = 'FS',
  SS = 'SS',
  K = 'K',
  P = 'P',
  LS = 'LS',
}

export enum PositionGroup {
  OFFENSE = 'OFFENSE',
  DEFENSE = 'DEFENSE',
  SPECIAL_TEAMS = 'SPECIAL_TEAMS',
}

export const POSITION_TO_GROUP: Record<FootballPosition, PositionGroup> = {
  [FootballPosition.QB]: PositionGroup.OFFENSE,
  [FootballPosition.RB]: PositionGroup.OFFENSE,
  [FootballPosition.FB]: PositionGroup.OFFENSE,
  [FootballPosition.WR]: PositionGroup.OFFENSE,
  [FootballPosition.TE]: PositionGroup.OFFENSE,
  [FootballPosition.LT]: PositionGroup.OFFENSE,
  [FootballPosition.LG]: PositionGroup.OFFENSE,
  [FootballPosition.C]: PositionGroup.OFFENSE,
  [FootballPosition.RG]: PositionGroup.OFFENSE,
  [FootballPosition.RT]: PositionGroup.OFFENSE,
  [FootballPosition.DE]: PositionGroup.DEFENSE,
  [FootballPosition.DT]: PositionGroup.DEFENSE,
  [FootballPosition.NT]: PositionGroup.DEFENSE,
  [FootballPosition.OLB]: PositionGroup.DEFENSE,
  [FootballPosition.MLB]: PositionGroup.DEFENSE,
  [FootballPosition.ILB]: PositionGroup.DEFENSE,
  [FootballPosition.CB]: PositionGroup.DEFENSE,
  [FootballPosition.FS]: PositionGroup.DEFENSE,
  [FootballPosition.SS]: PositionGroup.DEFENSE,
  [FootballPosition.K]: PositionGroup.SPECIAL_TEAMS,
  [FootballPosition.P]: PositionGroup.SPECIAL_TEAMS,
  [FootballPosition.LS]: PositionGroup.SPECIAL_TEAMS,
};

// Human-readable labels for positions
export const POSITION_LABELS: Record<FootballPosition, string> = {
  [FootballPosition.QB]: 'Quarterback',
  [FootballPosition.RB]: 'Running Back',
  [FootballPosition.FB]: 'Fullback',
  [FootballPosition.WR]: 'Wide Receiver',
  [FootballPosition.TE]: 'Tight End',
  [FootballPosition.LT]: 'Left Tackle',
  [FootballPosition.LG]: 'Left Guard',
  [FootballPosition.C]: 'Center',
  [FootballPosition.RG]: 'Right Guard',
  [FootballPosition.RT]: 'Right Tackle',
  [FootballPosition.DE]: 'Defensive End',
  [FootballPosition.DT]: 'Defensive Tackle',
  [FootballPosition.NT]: 'Nose Tackle',
  [FootballPosition.OLB]: 'Outside Linebacker',
  [FootballPosition.MLB]: 'Middle Linebacker',
  [FootballPosition.ILB]: 'Inside Linebacker',
  [FootballPosition.CB]: 'Cornerback',
  [FootballPosition.FS]: 'Free Safety',
  [FootballPosition.SS]: 'Strong Safety',
  [FootballPosition.K]: 'Kicker',
  [FootballPosition.P]: 'Punter',
  [FootballPosition.LS]: 'Long Snapper',
};

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  [PositionGroup.OFFENSE]: 'Offense',
  [PositionGroup.DEFENSE]: 'Defense',
  [PositionGroup.SPECIAL_TEAMS]: 'Special Teams',
};

export type ExperienceLevel = 'starter' | 'backup' | 'developmental';
export type AvailabilityStatus = 'available' | 'injured' | 'limited' | 'out';

export interface RosterPlayer {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: FootballPosition;
  positionGroup: PositionGroup;
  experienceLevel: ExperienceLevel;
  availabilityStatus: AvailabilityStatus;
  injuryNote?: string;
  attendanceRate?: number;
  coachNotes?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// What gets passed to Firestore on create (id is auto-generated)
export type RosterPlayerCreate = Omit<RosterPlayer, 'id' | 'createdAt' | 'updatedAt'>;

// What gets passed to Firestore on update
export type RosterPlayerUpdate = Partial<Omit<RosterPlayer, 'id' | 'teamId' | 'createdAt' | 'updatedAt'>>;

// Structured summary for AI consumption
export interface RosterSummary {
  totalPlayers: number;
  availableCount: number;
  injuredCount: number;
  limitedCount: number;
  outCount: number;
  positionGroups: {
    offense: PositionGroupSummary;
    defense: PositionGroupSummary;
    specialTeams: PositionGroupSummary;
  };
  injuries: string[];
}

export interface PositionGroupSummary {
  total: number;
  available: number;
  starters: number;
  startersAvailable: number;
  positions: Record<string, { total: number; available: number; starters: number }>;
}

export const EXPERIENCE_LEVEL_ORDER: Record<ExperienceLevel, number> = {
  starter: 0,
  backup: 1,
  developmental: 2,
};

export const AVAILABILITY_COLORS: Record<AvailabilityStatus, string> = {
  available: 'bg-green-500',
  limited: 'bg-yellow-500',
  injured: 'bg-red-500',
  out: 'bg-gray-400',
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Available',
  limited: 'Limited',
  injured: 'Injured',
  out: 'Out',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  starter: 'Starter',
  backup: 'Backup',
  developmental: 'Developmental',
};

export const EXPERIENCE_COLORS: Record<ExperienceLevel, string> = {
  starter: 'bg-blue-100 text-blue-800',
  backup: 'bg-gray-100 text-gray-700',
  developmental: 'bg-purple-100 text-purple-700',
};
