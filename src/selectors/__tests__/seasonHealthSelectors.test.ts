import { describe, expect, it, vi } from 'vitest';
import {
  getAttendanceByTeam,
  getPaymentsStatusByTeam,
  getRosterByTeam,
  getScheduleByTeam,
  getSeasonHealthSelectorBundle,
  getTeams,
  getWaiversStatusByTeam,
  readHealthAuxData
} from '../seasonHealthSelectors';

const teams = [
  {
    id: 't1',
    name: 'Varsity',
    code: 'AAA111',
    ownerId: 'owner',
    memberIds: ['p1', 'p2'],
    memberDetails: [
      { id: 'p1', email: 'p1@example.com', role: 'member', joinedAt: new Date('2026-01-01T00:00:00.000Z') },
      { id: 'p2', email: 'p2@example.com', role: 'member', joinedAt: new Date('2026-01-02T00:00:00.000Z') }
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z')
  }
] as any;

const aux = {
  attendanceByTeam: {
    t1: [{ teamId: 't1', eventId: 'e1', eventDate: '2026-01-10T00:00:00.000Z', attendedCount: 5, rosterCount: 10 }]
  },
  paymentByPlayerId: {
    p1: { hasPaymentMethod: true, updatedAt: 100 },
    p2: { hasPaymentMethod: false, updatedAt: 110 }
  },
  waiverByPlayerId: {
    p1: { hasWaiver: true, updatedAt: 200 },
    p2: { hasWaiver: false, updatedAt: 210 }
  },
  scheduleByTeam: {
    t1: [{ teamId: 't1', eventId: 's1', title: 'Practice', startsAt: '2026-01-10T17:00:00.000Z', endsAt: '2026-01-10T18:00:00.000Z' }]
  },
  updatedAt: 500
};

describe('seasonHealthSelectors', () => {
  it('maps canonical selectors with completeness metadata', () => {
    const teamResult = getTeams(teams);
    const rosterResult = getRosterByTeam('t1', teams, aux);
    const scheduleResult = getScheduleByTeam('t1', aux);
    const attendanceResult = getAttendanceByTeam('t1', aux);
    const paymentsResult = getPaymentsStatusByTeam('t1', rosterResult.data, aux);
    const waiversResult = getWaiversStatusByTeam('t1', rosterResult.data, aux);

    expect(teamResult.meta.available).toBe(true);
    expect(rosterResult.data).toHaveLength(2);
    expect(scheduleResult.meta.available).toBe(true);
    expect(attendanceResult.meta.available).toBe(true);
    expect(paymentsResult.meta.available).toBe(true);
    expect(waiversResult.meta.available).toBe(true);
  });

  it('returns bundle and computes freshness', () => {
    const bundle = getSeasonHealthSelectorBundle('t1', teams, { data: aux, meta: { available: true, lastUpdatedAt: 500, source: 'local_storage' } });
    expect(bundle.teams).toHaveLength(1);
    expect(bundle.roster).toHaveLength(2);
    expect(bundle.dataStatus.freshnessTimestamp).toBeGreaterThan(0);
    expect(bundle.dataStatus.completeness.paymentsAvailable).toBe(true);
  });

  it('handles unavailable local source gracefully', () => {
    const getItem = vi.fn(() => null);
    vi.stubGlobal('localStorage', { getItem });

    const res = readHealthAuxData();
    expect(res.meta.available).toBe(false);
    expect(res.data.scheduleByTeam).toEqual({});

    vi.unstubAllGlobals();
  });
});
