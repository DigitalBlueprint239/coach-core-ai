import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SeasonHealthDashboard from '../SeasonHealthDashboard';
import { HealthSignal } from '../healthTypes';

const now = Date.now();

const signals: HealthSignal[] = [
  {
    id: 'critical-1',
    type: 'WAIVER_MISSING',
    severity: 'critical',
    teamId: 't1',
    entityId: 'p1',
    title: 'Waiver missing: Alex',
    description: 'Missing waiver form',
    detectedAt: now,
    recommendedAction: { type: 'SEND_REMINDER_MESSAGE', label: 'Send reminder' }
  },
  {
    id: 'warn-1',
    type: 'PAYMENT_MISSING',
    severity: 'warn',
    teamId: 't1',
    entityId: 'p2',
    title: 'Payment missing: Jordan',
    description: 'Missing payment method',
    detectedAt: now - 10 * 24 * 60 * 60 * 1000,
    recommendedAction: { type: 'NAVIGATE_TO_ROSTER', label: 'View roster' }
  }
];

const status = {
  freshnessTimestamp: now,
  completeness: {
    teamsAvailable: true,
    rosterAvailable: true,
    scheduleAvailable: false,
    attendanceAvailable: true,
    paymentsAvailable: false,
    waiversAvailable: true
  }
};

describe('SeasonHealthDashboard', () => {
  it('renders mocked signals', () => {
    render(<SeasonHealthDashboard signals={signals} dataStatus={status} onAction={vi.fn()} />);
    expect(screen.getByText('Waiver missing: Alex')).toBeTruthy();
    expect(screen.getByText('Payment missing: Jordan')).toBeTruthy();
  });

  it('renders completeness flags', () => {
    render(<SeasonHealthDashboard signals={signals} dataStatus={status} onAction={vi.fn()} />);
    expect(screen.getByText(/Payments: Not Connected/)).toBeTruthy();
    expect(screen.getByText(/Waivers: Connected/)).toBeTruthy();
  });

  it('filters by critical and this week', () => {
    render(<SeasonHealthDashboard signals={signals} dataStatus={status} onAction={vi.fn()} />);

    fireEvent.click(screen.getByText('Critical'));
    expect(screen.getByText('Waiver missing: Alex')).toBeTruthy();
    expect(screen.queryByText('Payment missing: Jordan')).toBeNull();

    fireEvent.click(screen.getByText('This Week'));
    expect(screen.getByText('Waiver missing: Alex')).toBeTruthy();
    expect(screen.queryByText('Payment missing: Jordan')).toBeNull();
  });

  it('triggers Fix CTA handler with selected action', () => {
    const onAction = vi.fn();
    render(<SeasonHealthDashboard signals={signals} dataStatus={status} onAction={onAction} />);

    fireEvent.click(screen.getAllByText('Send reminder')[0]);

    expect(onAction).toHaveBeenCalledWith(signals[0], signals[0].recommendedAction);
  });

  it('gracefully shows unavailable data state', () => {
    render(
      <SeasonHealthDashboard
        signals={[]}
        dataStatus={{
          freshnessTimestamp: null,
          completeness: {
            teamsAvailable: false,
            rosterAvailable: false,
            scheduleAvailable: false,
            attendanceAvailable: false,
            paymentsAvailable: false,
            waiversAvailable: false
          }
        }}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText('No signals for this filter.')).toBeTruthy();
    expect(screen.getByText(/Freshness: No recent sync/)).toBeTruthy();
  });
});
