import {
  GenerateHealthSignalsInput,
  HealthAttendanceEntry,
  HealthSignal,
  HealthSignalSeverity,
  HealthScheduleEntry,
  HealthTeam
} from './healthTypes';

const SEVERITY_ORDER: Record<HealthSignalSeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2
};

const toTimestamp = (value?: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return Date.now();
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Date.now() : ts;
};

const signalId = (parts: Array<string | number | undefined>): string => parts.filter(Boolean).join(':');

const isAttendanceDrop = (entry: HealthAttendanceEntry): boolean => {
  if (!entry.rosterCount) return false;
  return entry.attendedCount / entry.rosterCount < 0.6;
};

const teamSignals = (team: HealthTeam, rosterCount: number): HealthSignal[] => {
  if (!team.expectedRosterSize || rosterCount >= team.expectedRosterSize) return [];

  const missing = team.expectedRosterSize - rosterCount;
  return [
    {
      id: signalId(['ROSTER_INCOMPLETE', team.id, team.updatedAt ?? team.expectedRosterSize]),
      type: 'ROSTER_INCOMPLETE',
      severity: missing >= 3 ? 'critical' : 'warn',
      teamId: team.id,
      entityId: team.id,
      title: `Roster incomplete for ${team.name}`,
      description: `${missing} roster spot${missing === 1 ? '' : 's'} still unfilled.`,
      recommendedAction: {
        type: 'NAVIGATE_TO_ROSTER',
        label: 'View roster',
        payload: { teamId: team.id }
      },
      detectedAt: toTimestamp(team.updatedAt)
    }
  ];
};

const scheduleConflictSignals = (schedule: HealthScheduleEntry[]): HealthSignal[] => {
  const byTeam = schedule.reduce<Record<string, HealthScheduleEntry[]>>((acc, item) => {
    acc[item.teamId] = [...(acc[item.teamId] || []), item];
    return acc;
  }, {});

  const signals: HealthSignal[] = [];

  Object.entries(byTeam).forEach(([teamId, entries]) => {
    const sorted = [...entries].sort((a, b) => toTimestamp(a.startsAt) - toTimestamp(b.startsAt));
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (toTimestamp(current.endsAt) > toTimestamp(next.startsAt)) {
        signals.push({
          id: signalId(['SCHEDULE_CONFLICT', teamId, current.eventId, next.eventId, current.updatedAt ?? next.updatedAt]),
          type: 'SCHEDULE_CONFLICT',
          severity: 'critical',
          teamId,
          entityId: current.eventId,
          title: 'Schedule conflict detected',
          description: `${current.title} overlaps with ${next.title}.`,
          recommendedAction: {
            type: 'NAVIGATE_TO_SCHEDULE_ITEM',
            label: 'Review schedule',
            payload: { teamId, eventId: current.eventId }
          },
          detectedAt: Math.max(toTimestamp(current.updatedAt), toTimestamp(next.updatedAt))
        });
      }
    }
  });

  return signals;
};

export const generateHealthSignals = (input: GenerateHealthSignalsInput): HealthSignal[] => {
  const signals: HealthSignal[] = [];

  input.teams.forEach((team) => {
    const teamRoster = input.roster.filter((entry) => entry.teamId === team.id);
    signals.push(...teamSignals(team, teamRoster.length));

    teamRoster
      .filter((entry) => !entry.hasWaiver)
      .forEach((entry) => {
        signals.push({
          id: signalId(['WAIVER_MISSING', team.id, entry.playerId, entry.updatedAt]),
          type: 'WAIVER_MISSING',
          severity: 'critical',
          teamId: team.id,
          entityId: entry.playerId,
          title: `Waiver missing: ${entry.playerName}`,
          description: 'Player cannot participate until waiver is completed.',
          recommendedAction: {
            type: 'SEND_REMINDER_MESSAGE',
            label: 'Send reminder',
            payload: { teamId: team.id, playerId: entry.playerId, playerName: entry.playerName, reminderType: 'waiver' }
          },
          detectedAt: toTimestamp(entry.updatedAt)
        });
      });

    teamRoster
      .filter((entry) => !entry.hasPaymentMethod)
      .forEach((entry) => {
        signals.push({
          id: signalId(['PAYMENT_MISSING', team.id, entry.playerId, entry.updatedAt]),
          type: 'PAYMENT_MISSING',
          severity: 'warn',
          teamId: team.id,
          entityId: entry.playerId,
          title: `Payment missing: ${entry.playerName}`,
          description: 'No active payment method on file.',
          recommendedAction: {
            type: 'SEND_REMINDER_MESSAGE',
            label: 'Send reminder',
            payload: { teamId: team.id, playerId: entry.playerId, playerName: entry.playerName, reminderType: 'payment' }
          },
          detectedAt: toTimestamp(entry.updatedAt)
        });
      });
  });

  input.attendance.filter(isAttendanceDrop).forEach((entry) => {
    const attendanceRate = Math.round((entry.attendedCount / entry.rosterCount) * 100);
    signals.push({
      id: signalId(['ATTENDANCE_DROP', entry.teamId, entry.eventId, entry.updatedAt ?? entry.eventDate]),
      type: 'ATTENDANCE_DROP',
      severity: attendanceRate < 45 ? 'critical' : 'warn',
      teamId: entry.teamId,
      entityId: entry.eventId,
      title: 'Attendance dropped below target',
      description: `Only ${attendanceRate}% attendance recorded for latest event.`,
      recommendedAction: {
        type: 'SEND_REMINDER_MESSAGE',
        label: 'Send reminder',
        payload: { teamId: entry.teamId, eventId: entry.eventId, reminderType: 'attendance' }
      },
      detectedAt: toTimestamp(entry.updatedAt ?? entry.eventDate)
    });
  });

  signals.push(...scheduleConflictSignals(input.schedule));

  return signals.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.detectedAt - a.detectedAt;
  });
};
