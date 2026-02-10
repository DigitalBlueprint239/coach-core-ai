import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearBreadcrumbs, getBreadcrumbs } from '../../utils/breadcrumbs';
import { createReminderTemplate, dispatchHealthAction, filterResolvedSignals, getResolvedSignals, persistResolvedSignal } from '../healthActions';
import { HealthSignal } from '../healthTypes';

const signal: HealthSignal = {
  id: 'WAIVER_MISSING:t1:p1:1',
  type: 'WAIVER_MISSING',
  severity: 'critical',
  teamId: 't1',
  entityId: 'p1',
  title: 'Waiver missing: Alex',
  description: 'Missing waiver',
  detectedAt: Date.now(),
  recommendedAction: { type: 'SEND_REMINDER_MESSAGE', label: 'Send reminder', payload: { teamId: 't1' } }
};

const mkStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((k: string) => values.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => values.set(k, v))
  };
};

describe('healthActions', () => {
  beforeEach(() => {
    clearBreadcrumbs();
  });

  it('dispatches reminder action and logs breadcrumb', () => {
    const navigate = vi.fn();
    const setComposerDraft = vi.fn();
    const showSuccess = vi.fn();
    const showError = vi.fn();

    const ok = dispatchHealthAction(
      { type: 'SEND_REMINDER_MESSAGE', label: 'Send reminder', payload: { teamId: 't1' } },
      signal,
      { navigate, setComposerDraft, showSuccess, showError }
    );

    expect(ok).toBe(true);
    expect(navigate).toHaveBeenCalledWith('chat', expect.any(Object));
    expect(setComposerDraft).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('complete your waiver') }));
    expect(showSuccess).toHaveBeenCalled();
    expect(getBreadcrumbs().some((crumb) => crumb.message === 'health_send_reminder')).toBe(true);
  });

  it('supports payload-aware deep link navigation', () => {
    const navigate = vi.fn();

    dispatchHealthAction(
      { type: 'NAVIGATE_TO_SCHEDULE_ITEM', label: 'Review schedule', payload: { eventId: 'event-77' } },
      { ...signal, type: 'SCHEDULE_CONFLICT', entityId: 'event-default' },
      { navigate, setComposerDraft: vi.fn(), showSuccess: vi.fn(), showError: vi.fn() }
    );

    dispatchHealthAction(
      { type: 'NAVIGATE_TO_ROSTER', label: 'View roster', payload: { playerId: 'player-42' } },
      signal,
      { navigate, setComposerDraft: vi.fn(), showSuccess: vi.fn(), showError: vi.fn() }
    );

    expect(navigate).toHaveBeenCalledWith('schedule', expect.objectContaining({ eventId: 'event-77' }));
    expect(navigate).toHaveBeenCalledWith('teams', expect.objectContaining({ playerId: 'player-42' }));
  });

  it('exposes reminder template by signal type', () => {
    expect(createReminderTemplate(signal)).toContain('complete your waiver');
    expect(createReminderTemplate({ ...signal, type: 'PAYMENT_MISSING', title: 'Payment missing: Alex' })).toContain('payment method');
  });

  it('persists resolved signal and filters it out', () => {
    const storage = mkStorage();

    persistResolvedSignal(signal.id, storage as any);
    expect(getResolvedSignals(storage as any)).toContain(signal.id);

    const filtered = filterResolvedSignals([signal], storage as any);
    expect(filtered).toHaveLength(0);
  });

  it('dispatches mark resolved action with breadcrumb', () => {
    const storage = mkStorage();
    const showSuccess = vi.fn();

    const ok = dispatchHealthAction(
      { type: 'MARK_SIGNAL_RESOLVED', label: 'Mark resolved' },
      signal,
      {
        navigate: vi.fn(),
        setComposerDraft: vi.fn(),
        showSuccess,
        showError: vi.fn(),
        storage: storage as any
      }
    );

    expect(ok).toBe(true);
    expect(showSuccess).toHaveBeenCalled();
    expect(getResolvedSignals(storage as any)).toContain(signal.id);
    expect(getBreadcrumbs().some((crumb) => crumb.message === 'health_mark_resolved')).toBe(true);
  });
});
