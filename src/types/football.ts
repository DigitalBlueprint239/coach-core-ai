// FootballLevel enum for all supported levels
export enum FootballLevel {
  YOUTH_6U = "youth_6u",
  YOUTH_8U = "youth_8u",
  YOUTH_10U = "youth_10u",
  YOUTH_12U = "youth_12u",
  YOUTH_14U = "youth_14u",
  MIDDLE_SCHOOL = "middle_school",
  JV = "jv",
  VARSITY = "varsity",
  COLLEGE = "college",
  SEMI_PRO = "semi_pro",
  PROFESSIONAL = "professional"
}

// Base entity for all football-related data
export interface BaseFootballEntity {
  // id: string; // Removed to avoid conflict with BaseDocument
  level: FootballLevel;
  created_at: string; // ISO date
  updated_at: string;
  metadata?: Record<string, any>;
}

// Level constraints and extensions
export interface LevelConstraints {
  max_players: number;
  field_dimensions: { width: number; length: number };
  allowed_formations: string[];
  contact_rules: Record<string, any>;
  timing_restrictions?: Record<string, any>;
  equipment_requirements?: string[];
}

// Play interface (extensible)
export interface Play extends BaseFootballEntity {
  name: string;
  formation: string;
  personnel?: string;
  routes?: any[];
  assignments?: any[];
  constraints?: LevelConstraints;
  simplified_description?: string;
  skill_requirements?: string[];
  safety_rating?: string;
  // Add more as needed
}

// Player interface (extensible)
export interface Player extends BaseFootballEntity {
  teamId: string;
  firstName: string;
  lastName: string;
  position: string;
  grade?: number;
  email?: string;
  parentEmail?: string;
  skill_level?: string;
  age_group?: FootballLevel;
  // Add more as needed
}

// Team interface (extensible)
export interface Team extends BaseFootballEntity {
  name: string;
  sport: string;
  season?: string;
  coachIds?: string[];
  playerIds?: string[];
  settings?: Record<string, any>;
  stats?: Record<string, any>;
  // Add more as needed
}

// YouthPlay and AdvancedPlay for progressive complexity
export interface YouthPlay {
  name: string;
  formation: "i-formation" | "spread" | "single-back";
  play_type: "run" | "pass";
  direction: "left" | "middle" | "right";
  fun_factor: 1 | 2 | 3 | 4 | 5;
  complexity: "basic" | "intermediate" | "advanced";
  recommended_age: number[];
  visual_guide: string;
}

export interface AdvancedPlay extends YouthPlay {
  motion?: any[];
  audibles?: any[];
  protection_scheme?: string;
  route_combinations?: any[];
  defensive_keys?: any[];
} 