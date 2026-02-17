import type {
  Alignment,
  Assignment,
  CanonicalPlay,
  MotionDefinition,
  RouteDefinition,
} from '../../domains/canonicalPlay';

interface SmartPlayer {
  id: string;
  role: string;
  x: number;
  y: number;
  assignment?: string;
  routeType?: string;
  breakDepth?: number;
  timingWindowMs?: number;
}

export interface SmartPlaybookState {
  id?: string;
  phase?: 'offense' | 'defense' | 'specialTeams';
  formation?: { family?: string; variation?: string };
  personnel?: Partial<CanonicalPlay['personnel']>;
  players?: SmartPlayer[];
  motion?: Partial<MotionDefinition>;
  fieldContext?: Partial<CanonicalPlay['fieldContext']>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

const toAlignment = (player: SmartPlayer): Alignment => ({
  entityId: player.id,
  role: player.role,
  x: player.x,
  y: player.y,
});

const toAssignment = (player: SmartPlayer): Assignment => ({
  entityId: player.id,
  responsibility: player.assignment ?? 'execute-play-design',
});

const toRouteDefinition = (player: SmartPlayer): RouteDefinition => ({
  entityId: player.id,
  conceptRole: player.role,
  routeType: player.routeType ?? 'none',
  breakDepth: player.breakDepth ?? 0,
  timingWindowMs: player.timingWindowMs,
});

export const smartPlaybookStateToCanonicalPlay = (state: SmartPlaybookState): CanonicalPlay => {
  const players = state.players ?? [];

  return {
    id: state.id ?? 'unpersisted-play',
    phase: state.phase ?? 'offense',
    formation: {
      family: state.formation?.family ?? 'unknown',
      variation: state.formation?.variation ?? 'base',
    },
    personnel: {
      runningBacks: state.personnel?.runningBacks ?? 1,
      tightEnds: state.personnel?.tightEnds ?? 1,
      wideReceivers: state.personnel?.wideReceivers ?? 3,
      quarterbacks: state.personnel?.quarterbacks ?? 1,
    },
    alignments: players.map(toAlignment),
    assignments: players.map(toAssignment),
    routeDefinitions: players.filter((player) => player.routeType).map(toRouteDefinition),
    motion: {
      type: state.motion?.type ?? 'none',
      actorIds: state.motion?.actorIds ?? [],
      startFrame: state.motion?.startFrame,
      endFrame: state.motion?.endFrame,
    },
    fieldContext: {
      hash: state.fieldContext?.hash ?? 'middle',
      yardLine: state.fieldContext?.yardLine ?? 50,
      down: state.fieldContext?.down ?? 1,
      distance: state.fieldContext?.distance ?? 10,
      redZone: state.fieldContext?.redZone ?? false,
    },
    tags: state.tags ?? [],
    metadata: state.metadata ?? {},
  };
};
