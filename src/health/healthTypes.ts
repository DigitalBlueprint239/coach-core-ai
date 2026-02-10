export type HealthSignalType =
  | 'PAYMENT_MISSING'
  | 'WAIVER_MISSING'
  | 'ROSTER_INCOMPLETE'
  | 'ATTENDANCE_DROP'
  | 'SCHEDULE_CONFLICT';

export type HealthSignalSeverity = 'info' | 'warn' | 'critical';

export type HealthActionType =
  | 'SEND_REMINDER_MESSAGE'
  | 'NAVIGATE_TO_ROSTER'
  | 'NAVIGATE_TO_SCHEDULE_ITEM'
  | 'MARK_SIGNAL_RESOLVED';

export interface HealthSignalAction {
  type: HealthActionType;
  label: string;
  payload?: Record<string, unknown>;
}

export interface HealthSignal {
  id: string;
  type: HealthSignalType;
  severity: HealthSignalSeverity;
  teamId: string;
  entityId: string;
  title: string;
  description: string;
  recommendedAction?: HealthSignalAction;
  detectedAt: number;
}

export interface HealthTeam {
  id: string;
  name: string;
  expectedRosterSize?: number;
  updatedAt?: number;
}

export interface HealthRosterEntry {
  playerId: string;
  teamId: string;
  playerName: string;
  hasWaiver: boolean;
  hasPaymentMethod: boolean;
  updatedAt?: number;
}

export interface HealthAttendanceEntry {
  teamId: string;
  eventId: string;
  eventDate: string;
  attendedCount: number;
  rosterCount: number;
  updatedAt?: number;
}

export interface HealthScheduleEntry {
  teamId: string;
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  updatedAt?: number;
}

export interface GenerateHealthSignalsInput {
  teams: HealthTeam[];
  roster: HealthRosterEntry[];
  attendance: HealthAttendanceEntry[];
  schedule: HealthScheduleEntry[];
}
