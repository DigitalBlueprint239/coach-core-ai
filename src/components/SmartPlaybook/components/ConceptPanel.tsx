/**
 * ConceptPanel.tsx - Concept-based route batching
 *
 * Shows offensive concept cards (Smash, Flood, Mesh, etc.) with coaching cues.
 * When a coach clicks "Apply", the system assigns all routes in the concept
 * to eligible players as a single undoable action.
 *
 * Player assignment logic:
 * - Identifies eligible receivers (WR, TE, RB) from the current formation
 * - Maps concept role slots to actual players by position and alignment
 * - Generates route points relative to each player's position
 */

import React, { memo, useMemo, useState } from 'react';
import { BookOpen, Play, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { concepts } from '../../../engine/offense/data.moderate';
import type { ConceptDef } from '../../../engine/offense/schema';

// Preset route points (relative to player position) for concept route assignment
const CONCEPT_ROUTE_POINTS: Record<string, Array<{ x: number; y: number }>> = {
  'hitch_5': [{ x: 0, y: 0 }, { x: 0, y: -15 }, { x: 0, y: -12 }],
  'corner_7': [{ x: 0, y: 0 }, { x: 0, y: -25 }, { x: 25, y: -45 }],
  'go_9': [{ x: 0, y: 0 }, { x: 0, y: -60 }],
  'flat_1': [{ x: 0, y: 0 }, { x: 5, y: -3 }, { x: 30, y: -6 }],
  'out_5': [{ x: 0, y: 0 }, { x: 0, y: -30 }, { x: 30, y: -30 }],
  'slant_2': [{ x: 0, y: 0 }, { x: 0, y: -10 }, { x: -25, y: -25 }],
  'shallow_cross_5': [{ x: 0, y: 0 }, { x: -5, y: -8 }, { x: -40, y: -10 }],
  'dig_6': [{ x: 0, y: 0 }, { x: 0, y: -35 }, { x: -30, y: -35 }],
  'curl_4': [{ x: 0, y: 0 }, { x: 0, y: -35 }, { x: 0, y: -30 }],
  'post_8': [{ x: 0, y: 0 }, { x: 0, y: -28 }, { x: -20, y: -50 }],
  'screen_0': [{ x: 0, y: 0 }, { x: 25, y: 2 }],
  'comeback_3': [{ x: 0, y: 0 }, { x: 0, y: -45 }, { x: 12, y: -38 }],
};

interface ConceptPanelProps {
  players: any[];
  onApplyConcept: (assignments: Array<{ playerId: string; routeId: string; points: Array<{ x: number; y: number }> }>, conceptId: string) => void;
}

/**
 * Maps concept player roles to actual players in the formation.
 * Prioritizes by position: WR > TE > RB for receiver roles.
 */
function assignConceptToPlayers(
  concept: ConceptDef,
  players: any[],
): Array<{ playerId: string; routeId: string; playerPosition: string; routeName: string }> {
  const receivers = players.filter((p: any) =>
    ['WR', 'TE', 'RB', 'FB'].includes(p.position?.toUpperCase())
  );

  if (receivers.length === 0) return [];

  // Sort receivers: outermost first (furthest from center x=300)
  const sorted = [...receivers].sort((a: any, b: any) =>
    Math.abs(b.x - 300) - Math.abs(a.x - 300)
  );

  const assignments: Array<{ playerId: string; routeId: string; playerPosition: string; routeName: string }> = [];
  const usedPlayerIds = new Set<string>();

  for (const coreRoute of concept.core_routes) {
    // Find best matching player for this role
    let candidate = null;
    const role = coreRoute.player.toLowerCase();

    if (role.includes('outside_wr') || role.includes('boundary')) {
      // Outside WR: use the WR furthest from center
      candidate = sorted.find((p: any) =>
        p.position === 'WR' && !usedPlayerIds.has(p.id)
      );
    } else if (role.includes('slot') || role.includes('te_or_slot')) {
      // Slot WR or TE: use a WR/TE closer to center
      candidate = sorted.find((p: any) =>
        (p.position === 'WR' || p.position === 'TE') && !usedPlayerIds.has(p.id)
      );
    } else if (role.includes('rb') || role.includes('back')) {
      candidate = sorted.find((p: any) =>
        (p.position === 'RB' || p.position === 'FB') && !usedPlayerIds.has(p.id)
      );
    } else if (role.includes('te')) {
      candidate = sorted.find((p: any) =>
        p.position === 'TE' && !usedPlayerIds.has(p.id)
      );
    } else {
      // Any available receiver
      candidate = sorted.find((p: any) => !usedPlayerIds.has(p.id));
    }

    if (candidate) {
      usedPlayerIds.add(candidate.id);
      assignments.push({
        playerId: candidate.id,
        routeId: coreRoute.route,
        playerPosition: candidate.position,
        routeName: coreRoute.route.replace(/_\d+$/, '').replace(/_/g, ' '),
      });
    }
  }

  return assignments;
}

const ConceptCard: React.FC<{
  concept: ConceptDef;
  players: any[];
  onApply: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = memo(({ concept, players, onApply, isExpanded, onToggle }) => {
  const assignments = useMemo(
    () => assignConceptToPlayers(concept, players),
    [concept, players]
  );
  const canApply = assignments.length >= 2;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <div className="text-sm font-semibold text-gray-800">{concept.concept_name}</div>
          <div className="text-[10px] text-gray-500">
            {concept.core_routes.map(r => r.route.replace(/_\d+$/, '').replace(/_/g, ' ')).join(' + ')}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-2">
          {/* Coaching Cue */}
          <p className="text-xs text-gray-600 italic">{concept.coaching_cue}</p>

          {/* Coverage Tags */}
          <div className="flex flex-wrap gap-1">
            <div className="flex items-center gap-0.5">
              <Shield size={10} className="text-green-600" />
              <span className="text-[10px] text-green-700">Best vs:</span>
            </div>
            {concept.best_vs.slice(0, 3).map(cov => (
              <span key={cov} className="px-1.5 py-0.5 text-[10px] bg-green-50 text-green-700 rounded">
                {cov.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          {/* Player Assignments Preview */}
          {assignments.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 font-medium">Assignments:</span>
              {assignments.map((a, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px] text-gray-600">
                  <span className="font-medium">{a.playerPosition}</span>
                  <span className="text-gray-400">→</span>
                  <span>{a.routeName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Apply Button */}
          <button
            onClick={onApply}
            disabled={!canApply}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              canApply
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play size={12} />
            {canApply ? 'Apply Concept' : 'Need 2+ receivers'}
          </button>
        </div>
      )}
    </div>
  );
});

ConceptCard.displayName = 'ConceptCard';

const ConceptPanel: React.FC<ConceptPanelProps> = memo(({ players, onApplyConcept }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApply = (concept: ConceptDef) => {
    const assignments = assignConceptToPlayers(concept, players);
    if (assignments.length < 2) return;

    const routeAssignments = assignments.map(a => {
      const player = players.find((p: any) => p.id === a.playerId);
      const points = CONCEPT_ROUTE_POINTS[a.routeId] || [{ x: 0, y: 0 }, { x: 0, y: -30 }];

      // Convert relative points to absolute
      const absolutePoints = points.map(pt => ({
        x: (player?.x || 300) + pt.x,
        y: (player?.y || 150) + pt.y,
      }));

      return {
        playerId: a.playerId,
        routeId: a.routeId,
        points: absolutePoints,
      };
    });

    onApplyConcept(routeAssignments, concept.concept_id);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <BookOpen size={16} className="text-gray-700" />
        <h3 className="font-semibold text-gray-800 text-sm">Concepts</h3>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Apply a full concept to assign multiple routes at once.
      </p>

      <div className="space-y-2">
        {concepts.map(concept => (
          <ConceptCard
            key={concept.concept_id}
            concept={concept}
            players={players}
            onApply={() => handleApply(concept)}
            isExpanded={expandedId === concept.concept_id}
            onToggle={() => setExpandedId(
              expandedId === concept.concept_id ? null : concept.concept_id
            )}
          />
        ))}
      </div>
    </div>
  );
});

ConceptPanel.displayName = 'ConceptPanel';

export default ConceptPanel;
