import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useTeam } from './TeamContext';
import {
  RosterPlayer,
  RosterPlayerUpdate,
  RosterSummary,
  PositionGroup,
  PositionGroupSummary,
  POSITION_TO_GROUP,
  EXPERIENCE_LEVEL_ORDER,
  FootballPosition,
} from '../types/roster';
import {
  subscribeToRoster,
  addPlayer,
  updatePlayer,
  deletePlayer,
  isJerseyNumberTaken,
} from '../services/roster-service';

interface RosterContextType {
  players: RosterPlayer[];
  loading: boolean;
  error: string | null;
  summary: RosterSummary;
  addPlayer: (data: {
    name: string;
    number: number;
    position: FootballPosition;
    experienceLevel: RosterPlayer['experienceLevel'];
  }) => Promise<string>;
  updatePlayer: (playerId: string, updates: RosterPlayerUpdate) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  isJerseyNumberTaken: (number: number, excludePlayerId?: string) => Promise<boolean>;
  getRosterContextForAI: () => string;
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

export const useRoster = () => {
  const context = useContext(RosterContext);
  if (!context) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return context;
};

function buildGroupSummary(players: RosterPlayer[], group: PositionGroup): PositionGroupSummary {
  const groupPlayers = players.filter((p) => p.positionGroup === group);
  const positions: PositionGroupSummary['positions'] = {};
  for (const p of groupPlayers) {
    if (!positions[p.position]) {
      positions[p.position] = { total: 0, available: 0, starters: 0 };
    }
    positions[p.position].total++;
    if (p.availabilityStatus === 'available' || p.availabilityStatus === 'limited') {
      positions[p.position].available++;
    }
    if (p.experienceLevel === 'starter') {
      positions[p.position].starters++;
    }
  }
  return {
    total: groupPlayers.length,
    available: groupPlayers.filter(
      (p) => p.availabilityStatus === 'available' || p.availabilityStatus === 'limited'
    ).length,
    starters: groupPlayers.filter((p) => p.experienceLevel === 'starter').length,
    startersAvailable: groupPlayers.filter(
      (p) =>
        p.experienceLevel === 'starter' &&
        (p.availabilityStatus === 'available' || p.availabilityStatus === 'limited')
    ).length,
    positions,
  };
}

function buildSummary(players: RosterPlayer[]): RosterSummary {
  const injuries: string[] = [];
  for (const p of players) {
    if (p.availabilityStatus !== 'available') {
      const note = p.injuryNote ? ` (${p.injuryNote})` : '';
      injuries.push(`${p.name} #${p.number} ${p.position} - ${p.availabilityStatus}${note}`);
    }
  }
  return {
    totalPlayers: players.length,
    availableCount: players.filter((p) => p.availabilityStatus === 'available').length,
    injuredCount: players.filter((p) => p.availabilityStatus === 'injured').length,
    limitedCount: players.filter((p) => p.availabilityStatus === 'limited').length,
    outCount: players.filter((p) => p.availabilityStatus === 'out').length,
    positionGroups: {
      offense: buildGroupSummary(players, PositionGroup.OFFENSE),
      defense: buildGroupSummary(players, PositionGroup.DEFENSE),
      specialTeams: buildGroupSummary(players, PositionGroup.SPECIAL_TEAMS),
    },
    injuries,
  };
}

function buildAIRosterString(players: RosterPlayer[], summary: RosterSummary): string {
  if (players.length === 0) return '';

  const lines: string[] = [
    `Roster: ${summary.totalPlayers} players total, ${summary.availableCount} fully available.`,
  ];

  if (summary.injuredCount > 0 || summary.limitedCount > 0 || summary.outCount > 0) {
    lines.push(
      `Availability: ${summary.injuredCount} injured, ${summary.limitedCount} limited, ${summary.outCount} out.`
    );
  }

  const groups = [
    { label: 'Offense', data: summary.positionGroups.offense },
    { label: 'Defense', data: summary.positionGroups.defense },
    { label: 'Special Teams', data: summary.positionGroups.specialTeams },
  ];
  for (const g of groups) {
    if (g.data.total === 0) continue;
    const posDetails = Object.entries(g.data.positions)
      .map(([pos, info]) => `${info.available}/${info.total} ${pos}`)
      .join(', ');
    lines.push(`${g.label}: ${g.data.available}/${g.data.total} available (${posDetails}).`);
  }

  if (summary.injuries.length > 0) {
    lines.push('Injury report: ' + summary.injuries.join('; ') + '.');
  }

  return lines.join(' ');
}

export const RosterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentTeam } = useTeam();
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener tied to the current team
  useEffect(() => {
    if (!currentTeam) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToRoster(
      currentTeam.id,
      (roster) => {
        // Sort: by position group, then position, then experience level (starter first)
        const sorted = [...roster].sort((a, b) => {
          if (a.positionGroup !== b.positionGroup) {
            const groupOrder = { OFFENSE: 0, DEFENSE: 1, SPECIAL_TEAMS: 2 };
            return (groupOrder[a.positionGroup] ?? 3) - (groupOrder[b.positionGroup] ?? 3);
          }
          if (a.position !== b.position) return a.position.localeCompare(b.position);
          return (
            (EXPERIENCE_LEVEL_ORDER[a.experienceLevel] ?? 3) -
            (EXPERIENCE_LEVEL_ORDER[b.experienceLevel] ?? 3)
          );
        });
        setPlayers(sorted);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentTeam]);

  const summary = useMemo(() => buildSummary(players), [players]);

  const handleAddPlayer = useCallback(
    async (data: {
      name: string;
      number: number;
      position: FootballPosition;
      experienceLevel: RosterPlayer['experienceLevel'];
    }) => {
      if (!currentTeam) throw new Error('No team selected');
      return addPlayer(currentTeam.id, {
        name: data.name,
        number: data.number,
        position: data.position,
        experienceLevel: data.experienceLevel,
        availabilityStatus: 'available',
      });
    },
    [currentTeam]
  );

  const handleUpdatePlayer = useCallback(
    async (playerId: string, updates: RosterPlayerUpdate) => {
      if (!currentTeam) throw new Error('No team selected');
      return updatePlayer(currentTeam.id, playerId, updates);
    },
    [currentTeam]
  );

  const handleDeletePlayer = useCallback(
    async (playerId: string) => {
      if (!currentTeam) throw new Error('No team selected');
      return deletePlayer(currentTeam.id, playerId);
    },
    [currentTeam]
  );

  const handleIsJerseyTaken = useCallback(
    async (number: number, excludePlayerId?: string) => {
      if (!currentTeam) return false;
      return isJerseyNumberTaken(currentTeam.id, number, excludePlayerId);
    },
    [currentTeam]
  );

  const getRosterContextForAI = useCallback(() => {
    return buildAIRosterString(players, summary);
  }, [players, summary]);

  const value: RosterContextType = {
    players,
    loading,
    error,
    summary,
    addPlayer: handleAddPlayer,
    updatePlayer: handleUpdatePlayer,
    deletePlayer: handleDeletePlayer,
    isJerseyNumberTaken: handleIsJerseyTaken,
    getRosterContextForAI,
  };

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
};
