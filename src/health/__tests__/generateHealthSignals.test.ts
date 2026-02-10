import { describe, expect, it } from 'vitest';
import { generateHealthSignals } from '../generateHealthSignals';

describe('generateHealthSignals', () => {
  it('builds and sorts signals by severity then recency', () => {
    const signals = generateHealthSignals({
      teams: [{ id: 't1', name: 'Tigers', expectedRosterSize: 5, updatedAt: 100 }],
      roster: [
        { playerId: 'p1', teamId: 't1', playerName: 'A', hasWaiver: false, hasPaymentMethod: false, updatedAt: 200 },
        { playerId: 'p2', teamId: 't1', playerName: 'B', hasWaiver: true, hasPaymentMethod: true, updatedAt: 300 }
      ],
      attendance: [{ teamId: 't1', eventId: 'e1', eventDate: '2026-01-01T00:00:00.000Z', attendedCount: 1, rosterCount: 5, updatedAt: 500 }],
      schedule: [
        { teamId: 't1', eventId: 's1', title: 'A', startsAt: '2026-01-01T17:00:00.000Z', endsAt: '2026-01-01T18:00:00.000Z', updatedAt: 400 },
        { teamId: 't1', eventId: 's2', title: 'B', startsAt: '2026-01-01T17:30:00.000Z', endsAt: '2026-01-01T18:15:00.000Z', updatedAt: 450 }
      ]
    });

    expect(signals[0].severity).toBe('critical');
    expect(signals.some((s) => s.type === 'WAIVER_MISSING')).toBe(true);
    expect(signals.some((s) => s.type === 'PAYMENT_MISSING')).toBe(true);
    expect(signals.some((s) => s.type === 'SCHEDULE_CONFLICT')).toBe(true);
    expect(signals.some((s) => s.type === 'ROSTER_INCOMPLETE')).toBe(true);
  });

  it('does not create attendance signal when rate stays above threshold', () => {
    const signals = generateHealthSignals({
      teams: [{ id: 't1', name: 'Tigers', expectedRosterSize: 2 }],
      roster: [
        { playerId: 'p1', teamId: 't1', playerName: 'A', hasWaiver: true, hasPaymentMethod: true },
        { playerId: 'p2', teamId: 't1', playerName: 'B', hasWaiver: true, hasPaymentMethod: true }
      ],
      attendance: [{ teamId: 't1', eventId: 'e1', eventDate: '2026-01-01T00:00:00.000Z', attendedCount: 2, rosterCount: 2 }],
      schedule: []
    });

    expect(signals.find((s) => s.type === 'ATTENDANCE_DROP')).toBeFalsy();
  });
});
