import { addBreadcrumb } from '../utils/breadcrumbs';
import { HealthSignal, HealthSignalAction } from './healthTypes';

export const RESOLVED_SIGNALS_STORAGE_KEY = 'coachcore.health.resolvedSignals';

export interface HealthActionContext {
  navigate: (target: string, payload?: Record<string, unknown>) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  setComposerDraft: (draft: { teamId?: string; message: string }) => void;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

const getStorage = (storage?: Pick<Storage, 'getItem' | 'setItem'>): Pick<Storage, 'getItem' | 'setItem'> =>
  storage ?? localStorage;

export const getResolvedSignals = (storage?: Pick<Storage, 'getItem' | 'setItem'>): string[] => {
  const raw = getStorage(storage).getItem(RESOLVED_SIGNALS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const persistResolvedSignal = (signalId: string, storage?: Pick<Storage, 'getItem' | 'setItem'>): void => {
  const existing = new Set(getResolvedSignals(storage));
  existing.add(signalId);
  getStorage(storage).setItem(RESOLVED_SIGNALS_STORAGE_KEY, JSON.stringify([...existing]));
};

export const filterResolvedSignals = (
  signals: HealthSignal[],
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): HealthSignal[] => {
  const resolved = new Set(getResolvedSignals(storage));
  return signals.filter((signal) => !resolved.has(signal.id));
};

const reminderMessageFromSignal = (signal: HealthSignal): string => {
  if (signal.type === 'WAIVER_MISSING') {
    return `Reminder: please complete your waiver for ${signal.title.replace('Waiver missing: ', '')}.`;
  }
  if (signal.type === 'PAYMENT_MISSING') {
    return `Reminder: we still need a payment method on file for ${signal.title.replace('Payment missing: ', '')}.`;
  }
  return `Reminder: ${signal.description}`;
};

export const dispatchHealthAction = (
  action: HealthSignalAction,
  signal: HealthSignal,
  context: HealthActionContext
): boolean => {
  try {
    switch (action.type) {
      case 'SEND_REMINDER_MESSAGE': {
        const teamId = typeof action.payload?.teamId === 'string' ? action.payload.teamId : signal.teamId;
        context.setComposerDraft({ teamId, message: reminderMessageFromSignal(signal) });
        context.navigate('chat', { teamId, from: 'season-health' });
        addBreadcrumb({ at: Date.now(), category: 'action', message: 'health_send_reminder', data: { signalId: signal.id, teamId } });
        context.showSuccess('Reminder drafted in Team Chat.');
        return true;
      }
      case 'NAVIGATE_TO_ROSTER': {
        context.navigate('teams', { teamId: signal.teamId, from: 'season-health' });
        context.showSuccess('Opened roster management.');
        return true;
      }
      case 'NAVIGATE_TO_SCHEDULE_ITEM': {
        context.navigate('schedule', { teamId: signal.teamId, eventId: signal.entityId, from: 'season-health' });
        context.showSuccess('Opened schedule details.');
        return true;
      }
      case 'MARK_SIGNAL_RESOLVED': {
        persistResolvedSignal(signal.id, context.storage);
        addBreadcrumb({ at: Date.now(), category: 'action', message: 'health_mark_resolved', data: { signalId: signal.id } });
        context.showSuccess('Signal marked as resolved.');
        return true;
      }
      default: {
        context.showError('Action is not supported yet.');
        return false;
      }
    }
  } catch (error) {
    context.showError('Could not complete that action. Please try again.');
    addBreadcrumb({
      at: Date.now(),
      category: 'error',
      message: 'health_action_failed',
      data: { signalId: signal.id, actionType: action.type, error: error instanceof Error ? error.message : 'unknown' }
    });
    return false;
  }
};
