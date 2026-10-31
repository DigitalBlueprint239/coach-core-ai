import type { DefenderRole, OffenseRole } from './types';

/** Baseline term → the team's own term (e.g. { H: 'F', TE: 'Sniffer' }). */
export type Terminology = Readonly<Record<string, string>>;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Renames whole terms in one pass; longer terms first, and a replacement is never replaced again. */
export function applyTerminology(text: string, t: Terminology): string {
  const keys = Object.keys(t).filter(k => k.length > 0).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  const pattern = new RegExp(`(?<![A-Za-z0-9_])(?:${keys.map(escape).join('|')})(?![A-Za-z0-9_])`, 'g');
  return text.replace(pattern, match => t[match] ?? match);
}

export function labelFor(role: OffenseRole | DefenderRole, t: Terminology): string {
  return t[role] ?? role;
}
