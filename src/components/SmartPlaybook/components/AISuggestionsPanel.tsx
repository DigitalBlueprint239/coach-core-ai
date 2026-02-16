/**
 * AISuggestionsPanel.tsx – AI-powered play suggestions
 * - Collects game context (down, distance, field position, etc.)
 * - Calls AI service for play recommendations
 * - Falls back to smart local suggestions when no API is configured
 * - Allows coach to apply suggestions directly to the field
 */

import React, { useState, useCallback } from 'react';
import { useAI } from '../../../ai-brain/AIContext';
import {
  createPlayer,
  createRoute,
  ROUTE_COLORS
} from '../PlayController';

// ============================================
// TYPES
// ============================================

interface GameSituation {
  down: number;
  distance: number;
  fieldPosition: number; // Yards from own end zone (1-99)
  scoreDifferential: number; // Positive = winning, negative = losing
  timeRemaining: number; // Minutes remaining
  quarter: number;
}

interface PlaySuggestion {
  id: string;
  name: string;
  formation: string;
  description: string;
  confidence: number;
  reasoning: string;
  routes: { position: string; routeType: string; description: string }[];
  phase: 'offense' | 'defense';
  type: 'pass' | 'run' | 'special';
}

interface AISuggestionsPanelProps {
  onApplySuggestion: (players: any[], routes: any[], playName: string) => void;
  fieldWidth: number;
  fieldHeight: number;
}

// ============================================
// LOCAL SUGGESTION ENGINE (no API needed)
// ============================================

function generateLocalSuggestions(situation: GameSituation): PlaySuggestion[] {
  const { down, distance, fieldPosition, scoreDifferential, timeRemaining, quarter } = situation;
  const suggestions: PlaySuggestion[] = [];

  const inRedZone = fieldPosition >= 80;
  const deepInOwnTerritory = fieldPosition <= 20;
  const isLongDistance = distance >= 8;
  const isShortDistance = distance <= 3;
  const isLateGame = quarter === 4 && timeRemaining <= 5;
  const isLosingLate = isLateGame && scoreDifferential < 0;

  // 4th down logic
  if (down === 4) {
    if (isShortDistance && fieldPosition >= 60) {
      suggestions.push({
        id: 'qb-sneak-4th',
        name: 'QB Sneak',
        formation: 'I-Formation',
        description: `Short yardage 4th down conversion. ${distance} yard${distance !== 1 ? 's' : ''} to go — QB sneak behind the center with power blocking.`,
        confidence: 0.72,
        reasoning: `4th and ${distance} at the ${fieldPosition}-yard line. Short yardage favors a direct QB sneak with a 72% historical success rate.`,
        routes: [
          { position: 'QB', routeType: 'custom', description: 'Sneak behind center' },
          { position: 'RB', routeType: 'custom', description: 'Lead block through A-gap' }
        ],
        phase: 'offense',
        type: 'run'
      });
    }
    suggestions.push({
      id: 'punt-4th',
      name: 'Punt Formation',
      formation: 'Special Teams',
      description: `Punt on 4th and ${distance}. Pin the opponent deep.`,
      confidence: deepInOwnTerritory ? 0.95 : 0.6,
      reasoning: fieldPosition <= 50
        ? `Conservative choice from the ${fieldPosition}-yard line.`
        : `Consider going for it — you're already in opponent territory.`,
      routes: [],
      phase: 'offense',
      type: 'special'
    });
  }

  // Short yardage (1st/2nd/3rd and short)
  if (isShortDistance && down <= 3) {
    suggestions.push({
      id: 'power-run',
      name: 'Power Run',
      formation: 'I-Formation',
      description: `Power run through the A-gap. Fullback leads for the running back with double-team on the nose tackle.`,
      confidence: 0.78,
      reasoning: `${down}${down === 1 ? 'st' : down === 2 ? 'nd' : 'rd'} and ${distance} — short yardage power run has a 78% conversion rate.`,
      routes: [
        { position: 'FB', routeType: 'custom', description: 'Lead block through A-gap' },
        { position: 'RB', routeType: 'custom', description: 'Follow FB through A-gap' },
        { position: 'TE', routeType: 'custom', description: 'Seal the edge' }
      ],
      phase: 'offense',
      type: 'run'
    });
  }

  // Long distance passing situations
  if (isLongDistance) {
    suggestions.push({
      id: 'spread-pass',
      name: 'Spread Pass — Mesh Concept',
      formation: 'Shotgun',
      description: `Spread formation with mesh routes. Two receivers cross underneath creating picks while the slot runs a deep post.`,
      confidence: 0.65,
      reasoning: `${down}${down === 1 ? 'st' : down === 2 ? 'nd' : 'rd'} and ${distance} — need to move the chains. Mesh concept creates natural separation against zone coverage.`,
      routes: [
        { position: 'WR', routeType: 'post', description: 'Deep post route (primary)' },
        { position: 'WR', routeType: 'slant', description: 'Shallow cross (mesh)' },
        { position: 'WR', routeType: 'in', description: 'Deep in route' },
        { position: 'TE', routeType: 'out', description: 'Flat route (check-down)' },
        { position: 'RB', routeType: 'out', description: 'Swing route (safety valve)' }
      ],
      phase: 'offense',
      type: 'pass'
    });
  }

  // Red zone
  if (inRedZone) {
    suggestions.push({
      id: 'redzone-fade',
      name: 'Red Zone Fade',
      formation: 'Shotgun',
      description: `Corner fade to the #1 receiver. High-point throw to the back pylon with a slant underneath as the hot route.`,
      confidence: 0.58,
      reasoning: `Red zone at the ${100 - fieldPosition}-yard line. Fade route gives your receiver a one-on-one opportunity in tight space.`,
      routes: [
        { position: 'WR', routeType: 'corner', description: 'Fade to back pylon' },
        { position: 'WR', routeType: 'slant', description: 'Quick slant (hot route)' },
        { position: 'TE', routeType: 'out', description: 'Flat route' }
      ],
      phase: 'offense',
      type: 'pass'
    });

    suggestions.push({
      id: 'redzone-power',
      name: 'Goal Line Power',
      formation: 'I-Formation',
      description: `Power run off-tackle with a pulling guard. Designed for the tight red zone where passing windows shrink.`,
      confidence: 0.68,
      reasoning: `Inside the ${100 - fieldPosition}. Ground game keeps the clock moving and reduces turnover risk.`,
      routes: [
        { position: 'FB', routeType: 'custom', description: 'Kick-out block on DE' },
        { position: 'RB', routeType: 'custom', description: 'Off-tackle behind pulling guard' }
      ],
      phase: 'offense',
      type: 'run'
    });
  }

  // Standard mid-field situations
  if (!inRedZone && !deepInOwnTerritory && !isShortDistance && !isLongDistance && down <= 3) {
    suggestions.push({
      id: 'play-action',
      name: 'Play Action Pass',
      formation: 'Shotgun',
      description: `Play action fake to the RB, then hit the TE on a seam route. WRs run clearing routes to pull coverage deep.`,
      confidence: 0.71,
      reasoning: `${down}${down === 1 ? 'st' : down === 2 ? 'nd' : 'rd'} and ${distance} at the ${fieldPosition}. Play action creates hesitation in linebackers, opening the middle of the field.`,
      routes: [
        { position: 'TE', routeType: 'go', description: 'Seam route (primary)' },
        { position: 'WR', routeType: 'post', description: 'Post route (clearing)' },
        { position: 'WR', routeType: 'corner', description: 'Corner route' },
        { position: 'RB', routeType: 'out', description: 'Check-down after fake' }
      ],
      phase: 'offense',
      type: 'pass'
    });

    suggestions.push({
      id: 'outside-zone',
      name: 'Outside Zone Run',
      formation: 'Shotgun',
      description: `Outside zone run to the weak side. O-line zone blocks left, RB reads the first down lineman and cuts.`,
      confidence: 0.7,
      reasoning: `Balanced situation — outside zone creates multiple cutback lanes and keeps the defense honest.`,
      routes: [
        { position: 'RB', routeType: 'custom', description: 'Zone run to weak side' },
        { position: 'TE', routeType: 'custom', description: 'Reach block on edge' }
      ],
      phase: 'offense',
      type: 'run'
    });
  }

  // Losing late — aggressive plays
  if (isLosingLate) {
    suggestions.unshift({
      id: 'hail-mary',
      name: 'Four Verticals',
      formation: 'Shotgun',
      description: `All four receivers run vertical routes. Spread the defense and attack deep with maximum urgency.`,
      confidence: 0.42,
      reasoning: `Down ${Math.abs(scoreDifferential)} with ${timeRemaining} minutes left in Q4. Need chunk plays — four verticals stretches the secondary thin.`,
      routes: [
        { position: 'WR', routeType: 'go', description: 'Go route (outside left)' },
        { position: 'WR', routeType: 'go', description: 'Go route (slot left)' },
        { position: 'WR', routeType: 'go', description: 'Go route (slot right)' },
        { position: 'TE', routeType: 'go', description: 'Seam route' }
      ],
      phase: 'offense',
      type: 'pass'
    });
  }

  // Ensure we always have at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      id: 'hb-dive',
      name: 'HB Dive',
      formation: 'Shotgun',
      description: 'Standard halfback dive up the middle. A safe, reliable play to move the chains.',
      confidence: 0.65,
      reasoning: `Standard situation — HB dive is a dependable baseline play.`,
      routes: [
        { position: 'RB', routeType: 'custom', description: 'Dive through A-gap' }
      ],
      phase: 'offense',
      type: 'run'
    });
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ============================================
// BUILD FORMATION FOR FIELD
// ============================================

function buildFormationPlayers(
  suggestion: PlaySuggestion,
  centerX: number,
  centerY: number,
  spacing: number
): any[] {
  if (suggestion.formation === 'Shotgun') {
    return [
      createPlayer(centerX - spacing * 2, centerY, 'LT', 76),
      createPlayer(centerX - spacing, centerY, 'LG', 66),
      createPlayer(centerX, centerY, 'C', 55),
      createPlayer(centerX + spacing, centerY, 'RG', 67),
      createPlayer(centerX + spacing * 2, centerY, 'RT', 77),
      createPlayer(centerX, centerY + 56, 'QB', 12),
      createPlayer(centerX - spacing, centerY + 72, 'RB', 21),
      createPlayer(centerX - spacing * 4, centerY, 'WR', 80),
      createPlayer(centerX + spacing * 4, centerY, 'WR', 81),
      createPlayer(centerX - spacing * 2.5, centerY - 32, 'WR', 11),
      createPlayer(centerX + spacing * 2.5, centerY + 32, 'TE', 88)
    ];
  }

  if (suggestion.formation === 'I-Formation') {
    return [
      createPlayer(centerX - spacing * 2, centerY, 'LT', 76),
      createPlayer(centerX - spacing, centerY, 'LG', 66),
      createPlayer(centerX, centerY, 'C', 55),
      createPlayer(centerX + spacing, centerY, 'RG', 67),
      createPlayer(centerX + spacing * 2, centerY, 'RT', 77),
      createPlayer(centerX, centerY + 40, 'QB', 12),
      createPlayer(centerX, centerY + 72, 'FB', 45),
      createPlayer(centerX, centerY + 104, 'RB', 21),
      createPlayer(centerX - spacing * 4, centerY, 'WR', 80),
      createPlayer(centerX + spacing * 4, centerY, 'WR', 81),
      createPlayer(centerX + spacing * 2.5, centerY + 32, 'TE', 88)
    ];
  }

  // Default to shotgun
  return [
    createPlayer(centerX - spacing * 2, centerY, 'LT', 76),
    createPlayer(centerX - spacing, centerY, 'LG', 66),
    createPlayer(centerX, centerY, 'C', 55),
    createPlayer(centerX + spacing, centerY, 'RG', 67),
    createPlayer(centerX + spacing * 2, centerY, 'RT', 77),
    createPlayer(centerX, centerY + 56, 'QB', 12),
    createPlayer(centerX - spacing, centerY + 72, 'RB', 21),
    createPlayer(centerX - spacing * 4, centerY, 'WR', 80),
    createPlayer(centerX + spacing * 4, centerY, 'WR', 81),
    createPlayer(centerX - spacing * 2.5, centerY - 32, 'WR', 11),
    createPlayer(centerX + spacing * 2.5, centerY + 32, 'TE', 88)
  ];
}

// Route direction vectors for each route type
const ROUTE_VECTORS: Record<string, { dx: number; dy: number }[]> = {
  slant:  [{ dx: 0, dy: -20 }, { dx: 40, dy: -60 }],
  post:   [{ dx: 0, dy: -30 }, { dx: 30, dy: -80 }],
  corner: [{ dx: 0, dy: -30 }, { dx: -40, dy: -80 }],
  out:    [{ dx: 0, dy: -25 }, { dx: -50, dy: -25 }],
  in:     [{ dx: 0, dy: -25 }, { dx: 40, dy: -25 }],
  hitch:  [{ dx: 0, dy: -40 }, { dx: 0, dy: -30 }],
  go:     [{ dx: 0, dy: -40 }, { dx: 0, dy: -100 }],
  custom: [{ dx: 0, dy: -30 }, { dx: 0, dy: -60 }]
};

function buildSuggestionRoutes(
  suggestion: PlaySuggestion,
  players: any[]
): any[] {
  const routes: any[] = [];
  const routeColors = [
    ROUTE_COLORS.primary,
    ROUTE_COLORS.default,
    ROUTE_COLORS.secondary,
    ROUTE_COLORS.warning,
    '#8b5cf6' // purple for 5th route
  ];

  // Match suggestion routes to placed players
  const positionPlayers: Record<string, any[]> = {};
  for (const p of players) {
    if (!positionPlayers[p.position]) positionPlayers[p.position] = [];
    positionPlayers[p.position].push(p);
  }

  suggestion.routes.forEach((routeDef, idx) => {
    const available = positionPlayers[routeDef.position];
    if (!available || available.length === 0) return;
    const player = available.shift()!;

    const vectors = ROUTE_VECTORS[routeDef.routeType] || ROUTE_VECTORS.custom;
    // Alternate direction for duplicate route types
    const mirror = idx % 2 === 1 ? -1 : 1;

    const points = [
      { x: player.x, y: player.y },
      ...vectors.map(v => ({
        x: player.x + v.dx * mirror,
        y: player.y + v.dy
      }))
    ];

    try {
      routes.push(createRoute(
        player.id,
        points,
        routeDef.routeType === 'custom' ? 'custom' : routeDef.routeType,
        routeColors[idx % routeColors.length]
      ));
    } catch (e) {
      // Skip invalid routes
      console.warn('Skipping route:', e);
    }
  });

  return routes;
}

// ============================================
// COMPONENT
// ============================================

const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({
  onApplySuggestion,
  fieldWidth,
  fieldHeight
}) => {
  const ai = useAI();

  const [situation, setSituation] = useState<GameSituation>({
    down: 1,
    distance: 10,
    fieldPosition: 50,
    scoreDifferential: 0,
    timeRemaining: 30,
    quarter: 1
  });

  const [suggestions, setSuggestions] = useState<PlaySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const updateSituation = useCallback((field: keyof GameSituation, value: number) => {
    setSituation(prev => ({ ...prev, [field]: value }));
  }, []);

  const getSuggestions = useCallback(async () => {
    setLoading(true);
    setSuggestions([]);
    setAppliedId(null);

    try {
      // Try AI service first
      const gameContext = {
        gameId: 'live',
        opponent: 'Opponent',
        date: new Date() as any,
        location: 'Home',
        down: situation.down,
        distance: situation.distance,
        fieldPosition: `own ${situation.fieldPosition}`,
        scoreDifferential: situation.scoreDifferential,
        timeRemaining: situation.timeRemaining
      };

      const teamContext = {
        teamId: 'current',
        teamName: 'My Team',
        sport: 'football' as any,
        ageGroup: 'high_school' as any,
        skillLevel: 'intermediate',
        playerCount: 11
      };

      const result = await ai.generatePlaySuggestion(gameContext, teamContext);

      if (result && result.suggestions) {
        // Map AI response to our format
        const aiSuggestions: PlaySuggestion[] = result.suggestions.map((s: any, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          name: s.name || s.title || 'AI Suggestion',
          formation: s.formation || 'Shotgun',
          description: s.description || s.suggestion || '',
          confidence: s.confidence || 0.7,
          reasoning: s.reasoning || '',
          routes: s.routes || [],
          phase: 'offense' as const,
          type: (s.type || 'pass') as 'pass' | 'run' | 'special'
        }));
        setSuggestions(aiSuggestions);
      } else {
        // Fallback to local engine
        setSuggestions(generateLocalSuggestions(situation));
      }
    } catch (err) {
      // AI service unavailable — use local engine
      console.log('AI service unavailable, using local suggestions');
      setSuggestions(generateLocalSuggestions(situation));
    } finally {
      setLoading(false);
    }
  }, [ai, situation]);

  const handleApply = useCallback((suggestion: PlaySuggestion) => {
    const centerX = fieldWidth / 2;
    const centerY = fieldHeight / 2;
    const spacing = 48;

    const players = buildFormationPlayers(suggestion, centerX, centerY, spacing);
    const routes = buildSuggestionRoutes(suggestion, players);

    onApplySuggestion(players, routes, suggestion.name);
    setAppliedId(suggestion.id);
  }, [fieldWidth, fieldHeight, onApplySuggestion]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.75) return 'text-green-700 bg-green-100';
    if (confidence >= 0.55) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getTypeColor = (type: string) => {
    if (type === 'pass') return 'bg-blue-100 text-blue-700';
    if (type === 'run') return 'bg-green-100 text-green-700';
    return 'bg-purple-100 text-purple-700';
  };

  const ordinal = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h3 className="text-sm font-semibold text-gray-900">AI Play Suggestions</h3>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Game Situation Form */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Down */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Down</label>
                <select
                  value={situation.down}
                  onChange={e => updateSituation('down', parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1st</option>
                  <option value={2}>2nd</option>
                  <option value={3}>3rd</option>
                  <option value={4}>4th</option>
                </select>
              </div>

              {/* Distance */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Distance</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={situation.distance}
                  onChange={e => updateSituation('distance', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Field Position */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Field Pos (own)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={situation.fieldPosition}
                  onChange={e => updateSituation('fieldPosition', Math.min(99, Math.max(1, parseInt(e.target.value) || 50)))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Quarter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quarter</label>
                <select
                  value={situation.quarter}
                  onChange={e => updateSituation('quarter', parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Score */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Score +/-</label>
                <input
                  type="number"
                  min={-50}
                  max={50}
                  value={situation.scoreDifferential}
                  onChange={e => updateSituation('scoreDifferential', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time (min)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={situation.timeRemaining}
                  onChange={e => updateSituation('timeRemaining', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Situation Summary */}
          <div className="px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-600 text-center">
            {ordinal(situation.down)} & {situation.distance} at{' '}
            {situation.fieldPosition <= 50
              ? `own ${situation.fieldPosition}`
              : `opp ${100 - situation.fieldPosition}`}
            {' | '}Q{situation.quarter}{' '}
            {situation.timeRemaining}min{' '}
            {situation.scoreDifferential > 0 ? `+${situation.scoreDifferential}` : situation.scoreDifferential < 0 ? situation.scoreDifferential : 'Tied'}
          </div>

          {/* Suggest Button */}
          <button
            onClick={getSuggestions}
            disabled={loading}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              'Suggest Plays'
            )}
          </button>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </p>

              {suggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className={`border rounded-lg p-2.5 transition-colors ${
                    appliedId === suggestion.id
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Suggestion Header */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                      {suggestion.name}
                    </h4>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1 mb-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getTypeColor(suggestion.type)}`}>
                      {suggestion.type}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {suggestion.formation}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 mb-1.5 leading-relaxed">
                    {suggestion.description}
                  </p>

                  {/* Reasoning */}
                  <p className="text-xs text-gray-500 italic mb-2">
                    {suggestion.reasoning}
                  </p>

                  {/* Routes */}
                  {suggestion.routes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Routes:</p>
                      <div className="space-y-0.5">
                        {suggestion.routes.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="font-mono bg-gray-100 px-1 rounded text-gray-700">{r.position}</span>
                            <span>{r.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply Button */}
                  {suggestion.type !== 'special' && (
                    <button
                      onClick={() => handleApply(suggestion)}
                      className={`w-full py-1.5 text-xs font-medium rounded transition-colors ${
                        appliedId === suggestion.id
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {appliedId === suggestion.id ? 'Applied to Field' : 'Apply to Field'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AISuggestionsPanel;
