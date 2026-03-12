import type { DomainPhase } from '../contracts/intelligence';

export type FieldHash = 'left' | 'middle' | 'right';

export interface FormationDefinition {
  family: string;
  variation: string;
}

export interface PersonnelDefinition {
  runningBacks: number;
  tightEnds: number;
  wideReceivers: number;
  quarterbacks?: number;
  defensiveBacks?: number;
  linebackers?: number;
  defensiveLine?: number;
  specialists?: string[];
}

export interface Alignment {
  entityId: string;
  role: string;
  x: number;
  y: number;
  side?: 'left' | 'right' | 'middle';
  depth?: number;
}

export interface Assignment {
  entityId: string;
  responsibility: string;
  technique?: string;
  timing?: string;
}

export interface RouteDefinition {
  entityId: string;
  conceptRole: string;
  routeType: string;
  breakDepth: number;
  landmarks?: string[];
  timingWindowMs?: number;
}

export interface MotionDefinition {
  type: 'none' | 'shift' | 'jet' | 'orbit' | 'trade' | 'custom';
  actorIds: string[];
  startFrame?: number;
  endFrame?: number;
}

export interface FieldContext {
  hash: FieldHash;
  yardLine: number;
  down: 1 | 2 | 3 | 4;
  distance: number;
  redZone: boolean;
}

export interface CanonicalPlay {
  id: string;
  phase: DomainPhase;
  formation: FormationDefinition;
  personnel: PersonnelDefinition;
  alignments: Alignment[];
  assignments: Assignment[];
  routeDefinitions: RouteDefinition[];
  motion: MotionDefinition;
  fieldContext: FieldContext;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface AnalysisContext {
  gamePlanId?: string;
  installDay?: string;
  opponentProfile?: string;
  strictness?: 'lenient' | 'balanced' | 'strict';
}
