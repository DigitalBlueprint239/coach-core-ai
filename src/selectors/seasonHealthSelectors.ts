import { Team } from '../contexts/TeamContext';
import { HealthAttendanceEntry, HealthRosterEntry, HealthScheduleEntry, HealthTeam } from '../health/healthTypes';

export interface SelectorMeta {
  available: boolean;
  lastUpdatedAt: number | null;
  source: 'firestore' | 'local_storage' | 'unavailable';
}

export interface SelectorResult<T> {
  data: T;
  meta: SelectorMeta;
}

export interface TeamHealthAuxData {
  attendanceByTeam: Record<string, HealthAttendanceEntry[]>;
  paymentByPlayerId: Record<string, { hasPaymentMethod: boolean; updatedAt?: number }>;
  waiverByPlayerId: Record<string, { hasWaiver: boolean; updatedAt?: number }>;
  scheduleByTeam: Record<string, HealthScheduleEntry[]>;
  updatedAt?: number;
}

const parseLocalJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const readHealthAuxData = (): SelectorResult<TeamHealthAuxData> => {
  const parsed = parseLocalJson<TeamHealthAuxData>('coachcore.health.auxData');
  if (!parsed) {
    return {
      data: {
        attendanceByTeam: {},
        paymentByPlayerId: {},
        waiverByPlayerId: {},
        scheduleByTeam: {}
      },
      meta: {
        available: false,
        lastUpdatedAt: null,
        source: 'unavailable'
      }
    };
  }

  return {
    data: {
      attendanceByTeam: parsed.attendanceByTeam || {},
      paymentByPlayerId: parsed.paymentByPlayerId || {},
      waiverByPlayerId: parsed.waiverByPlayerId || {},
      scheduleByTeam: parsed.scheduleByTeam || {},
      updatedAt: parsed.updatedAt
    },
    meta: {
      available: true,
      lastUpdatedAt: parsed.updatedAt ?? Date.now(),
      source: 'local_storage'
    }
  };
};

export const getTeams = (teams: Team[]): SelectorResult<HealthTeam[]> => ({
  data: teams.map((team) => ({
    id: team.id,
    name: team.name,
    expectedRosterSize: Math.max(team.memberDetails?.length || 0, 16),
    updatedAt: team.updatedAt instanceof Date ? team.updatedAt.getTime() : Date.now()
  })),
  meta: {
    available: teams.length > 0,
    lastUpdatedAt: teams[0]?.updatedAt instanceof Date ? teams[0].updatedAt.getTime() : teams.length > 0 ? Date.now() : null,
    source: teams.length > 0 ? 'firestore' : 'unavailable'
  }
});

export const getRosterByTeam = (
  teamId: string,
  teams: Team[],
  auxData: TeamHealthAuxData
): SelectorResult<HealthRosterEntry[]> => {
  const team = teams.find((item) => item.id === teamId);
  if (!team) {
    return { data: [], meta: { available: false, lastUpdatedAt: null, source: 'unavailable' } };
  }

  const roster = (team.memberDetails || []).map((member) => {
    const payment = auxData.paymentByPlayerId[member.id];
    const waiver = auxData.waiverByPlayerId[member.id];

    return {
      playerId: member.id,
      teamId,
      playerName: member.email || member.id,
      hasWaiver: waiver?.hasWaiver ?? false,
      hasPaymentMethod: payment?.hasPaymentMethod ?? false,
      updatedAt:
        waiver?.updatedAt || payment?.updatedAt || (member.joinedAt instanceof Date ? member.joinedAt.getTime() : Date.now())
    };
  });

  return {
    data: roster,
    meta: {
      available: roster.length > 0,
      lastUpdatedAt: auxData.updatedAt ?? (team.updatedAt instanceof Date ? team.updatedAt.getTime() : Date.now()),
      source: 'firestore'
    }
  };
};

export const getScheduleByTeam = (teamId: string, auxData: TeamHealthAuxData): SelectorResult<HealthScheduleEntry[]> => ({
  data: auxData.scheduleByTeam[teamId] || [],
  meta: {
    available: Array.isArray(auxData.scheduleByTeam[teamId]) && auxData.scheduleByTeam[teamId].length > 0,
    lastUpdatedAt: auxData.updatedAt ?? null,
    source: auxData.updatedAt ? 'local_storage' : 'unavailable'
  }
});

export const getAttendanceByTeam = (teamId: string, auxData: TeamHealthAuxData): SelectorResult<HealthAttendanceEntry[]> => ({
  data: auxData.attendanceByTeam[teamId] || [],
  meta: {
    available: Array.isArray(auxData.attendanceByTeam[teamId]) && auxData.attendanceByTeam[teamId].length > 0,
    lastUpdatedAt: auxData.updatedAt ?? null,
    source: auxData.updatedAt ? 'local_storage' : 'unavailable'
  }
});

export const getPaymentsStatusByTeam = (
  teamId: string,
  roster: HealthRosterEntry[],
  auxData: TeamHealthAuxData
): SelectorResult<{ playerId: string; hasPaymentMethod: boolean; updatedAt?: number }[]> => {
  const teamRoster = roster.filter((entry) => entry.teamId === teamId);
  const records = teamRoster.map((entry) => ({
    playerId: entry.playerId,
    hasPaymentMethod: entry.hasPaymentMethod,
    updatedAt: entry.updatedAt
  }));

  const hasSourceData = teamRoster.some((entry) => Boolean(auxData.paymentByPlayerId[entry.playerId]));

  return {
    data: records,
    meta: {
      available: hasSourceData,
      lastUpdatedAt: hasSourceData
        ? records.reduce((max, entry) => Math.max(max, entry.updatedAt || 0), 0) || auxData.updatedAt || null
        : null,
      source: hasSourceData ? 'local_storage' : 'unavailable'
    }
  };
};

export const getWaiversStatusByTeam = (
  teamId: string,
  roster: HealthRosterEntry[],
  auxData: TeamHealthAuxData
): SelectorResult<{ playerId: string; hasWaiver: boolean; updatedAt?: number }[]> => {
  const teamRoster = roster.filter((entry) => entry.teamId === teamId);
  const records = teamRoster.map((entry) => ({
    playerId: entry.playerId,
    hasWaiver: entry.hasWaiver,
    updatedAt: entry.updatedAt
  }));

  const hasSourceData = teamRoster.some((entry) => Boolean(auxData.waiverByPlayerId[entry.playerId]));

  return {
    data: records,
    meta: {
      available: hasSourceData,
      lastUpdatedAt: hasSourceData
        ? records.reduce((max, entry) => Math.max(max, entry.updatedAt || 0), 0) || auxData.updatedAt || null
        : null,
      source: hasSourceData ? 'local_storage' : 'unavailable'
    }
  };
};


export interface SeasonHealthDataStatus {
  freshnessTimestamp: number | null;
  completeness: {
    teamsAvailable: boolean;
    rosterAvailable: boolean;
    scheduleAvailable: boolean;
    attendanceAvailable: boolean;
    paymentsAvailable: boolean;
    waiversAvailable: boolean;
  };
}

export interface SeasonHealthSelectorBundle {
  teams: HealthTeam[];
  roster: HealthRosterEntry[];
  schedule: HealthScheduleEntry[];
  attendance: HealthAttendanceEntry[];
  dataStatus: SeasonHealthDataStatus;
}

export const getSeasonHealthSelectorBundle = (
  teamId: string | undefined,
  teams: Team[],
  auxDataResult: SelectorResult<TeamHealthAuxData>
): SeasonHealthSelectorBundle => {
  const teamsResult = getTeams(teams);
  if (!teamId) {
    return {
      teams: teamsResult.data,
      roster: [],
      schedule: [],
      attendance: [],
      dataStatus: {
        freshnessTimestamp: teamsResult.meta.lastUpdatedAt,
        completeness: {
          teamsAvailable: teamsResult.meta.available,
          rosterAvailable: false,
          scheduleAvailable: false,
          attendanceAvailable: false,
          paymentsAvailable: false,
          waiversAvailable: false
        }
      }
    };
  }

  const rosterResult = getRosterByTeam(teamId, teams, auxDataResult.data);
  const scheduleResult = getScheduleByTeam(teamId, auxDataResult.data);
  const attendanceResult = getAttendanceByTeam(teamId, auxDataResult.data);
  const paymentsResult = getPaymentsStatusByTeam(teamId, rosterResult.data, auxDataResult.data);
  const waiversResult = getWaiversStatusByTeam(teamId, rosterResult.data, auxDataResult.data);

  const freshness = [
    teamsResult.meta.lastUpdatedAt,
    rosterResult.meta.lastUpdatedAt,
    scheduleResult.meta.lastUpdatedAt,
    attendanceResult.meta.lastUpdatedAt,
    paymentsResult.meta.lastUpdatedAt,
    waiversResult.meta.lastUpdatedAt,
    auxDataResult.meta.lastUpdatedAt
  ].filter((value): value is number => typeof value === 'number');

  return {
    teams: teamsResult.data,
    roster: rosterResult.data,
    schedule: scheduleResult.data,
    attendance: attendanceResult.data,
    dataStatus: {
      freshnessTimestamp: freshness.length ? Math.max(...freshness) : null,
      completeness: {
        teamsAvailable: teamsResult.meta.available,
        rosterAvailable: rosterResult.meta.available,
        scheduleAvailable: scheduleResult.meta.available,
        attendanceAvailable: attendanceResult.meta.available,
        paymentsAvailable: paymentsResult.meta.available,
        waiversAvailable: waiversResult.meta.available
      }
    }
  };
};
