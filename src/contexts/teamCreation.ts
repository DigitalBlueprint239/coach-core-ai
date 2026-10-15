import type {Team} from './TeamContext';

export interface TeamCreationOperation {
  uid: string;
  id: string;
  name: string;
  code: string;
  startedAt: number;
}
export interface TeamCreationState {
  operation: TeamCreationOperation | null;
  phase: 'idle' | 'saving' | 'unconfirmed' | 'confirmed' | 'blocked';
  error: string | null;
}
export interface TeamCreationGateway {
  create: (operation: TeamCreationOperation, signal: AbortSignal) => Promise<Team>;
}
function decodeOperation(raw: string, uid: string): TeamCreationOperation {
  const op: TeamCreationOperation = JSON.parse(raw);
  if (op.uid !== uid || !/^[A-Za-z0-9]{20}$/.test(op.id) ||
    typeof op.name !== 'string' || !op.name.trim() || op.name.length > 80 ||
    !/^[A-Z0-9]{8}$/.test(op.code) || !Number.isFinite(op.startedAt)) throw new Error('Invalid pending creation.');
  return op;
}

// A durable operation is saved BEFORE the first request. Retry never allocates
// another id. No team fields, security rules or legacy data are migrated.
export class TeamCreation {
  state: TeamCreationState = {operation: null, phase: 'idle', error: null};
  confirmedTeam: Team | null = null;
  private listeners = new Set<() => void>();
  private active: Promise<string> | null = null;
  private confirmActive: ((team: Team) => void) | null = null;
  private cancelActive: (() => void) | null = null;
  private disposed = false;

  constructor(private uid: string, private key: string, private storage: Storage,
    private gateway: TeamCreationGateway, private allocate: (name: string) => TeamCreationOperation) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const op = decodeOperation(raw, uid);
        this.state = {operation: op, phase: 'unconfirmed', error: null};
      }
    } catch {
      this.state = {operation: null, phase: 'blocked',
        error: 'Pending team creation cannot be read safely. No new team was submitted. Keep this browser data and contact support.'};
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  activate() { this.disposed = false; }
  private emit(state: TeamCreationState) {
    if (this.disposed) return;
    this.state = state;
    this.listeners.forEach(listener => listener());
  }

  // Only call with authoritative, non-pending server data for the captured uid.
  confirm(team: Team) {
    const op = this.state.operation;
    if (this.disposed || !op || team.id !== op.id || team.ownerId !== this.uid ||
      team.name !== op.name || team.code !== op.code) return;
    try {
      const raw = this.storage.getItem(this.key);
      if (raw && decodeOperation(raw, this.uid).id === op.id) this.storage.removeItem(this.key);
    } catch {
      // A retained journal is safe: future retry is create-only at the same id.
    }
    this.confirmedTeam = team;
    this.emit({operation: op, phase: 'confirmed', error: null});
    this.confirmActive?.(team);
  }

  start(name: string): Promise<string> {
    if (this.disposed) return Promise.reject(new Error('Account changed. Pending creation retained.'));
    if (this.state.phase === 'blocked') return Promise.reject(new Error(this.state.error!));
    let op = this.state.phase === 'confirmed' ? null : this.state.operation;
    if (!op) {
      try {
        const raw = this.storage.getItem(this.key);
        if (raw) op = decodeOperation(raw, this.uid);
      } catch {
        return Promise.reject(new Error('Pending team creation cannot be read safely. No team was submitted.'));
      }
    }
    if (op && name.trim() !== op.name) return Promise.reject(new Error('Finish the pending team creation before creating another team.'));
    if (this.active) return this.active;
    if (!op) {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 80) return Promise.reject(new Error('Team name must contain 1–80 characters.'));
      op = this.allocate(trimmed);
      try { this.storage.setItem(this.key, JSON.stringify(op)); } catch {
        return Promise.reject(new Error('Cannot preserve a safe retry on this device. No team was submitted.'));
      }
    }
    const operation = op;
    this.emit({operation, phase: 'saving', error: null});
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const confirmation = new Promise<Team>((resolve, reject) => {
      this.confirmActive = resolve;
      this.cancelActive = () => { abort.abort(); reject(new Error('Account changed. Pending creation retained.')); };
    });
    const deadline = new Promise<Team>((_, reject) => {
      timer = setTimeout(() => {
        abort.abort();
        reject(new Error('Still saving. Check your connection. We are checking the server for this team; retry uses the same team ID.'));
      }, 10_000);
    });
    const request = this.gateway.create(operation, abort.signal);
    const attempt = Promise.race([request, confirmation, deadline]).then(team => {
      if (this.disposed) throw new Error('Account changed. Pending creation retained.');
      this.confirm(team);
      if (this.state.phase !== 'confirmed') throw new Error('Server confirmation did not match this team. Pending creation retained.');
      return operation.id;
    }).catch(error => {
      if (!this.disposed && this.state.phase !== 'confirmed') this.emit({operation, phase: 'unconfirmed',
        error: error instanceof Error ? error.message : 'Team not confirmed. Check your connection and retry the same creation.'});
      throw error;
    }).finally(() => {
      clearTimeout(timer);
      abort.abort();
      if (this.active === attempt) {
        this.active = null;
        this.confirmActive = null;
        this.cancelActive = null;
      }
    });
    this.active = attempt;
    return attempt;
  }

  dispose() {
    this.disposed = true;
    this.cancelActive?.();
    this.listeners.clear();
  }
}
