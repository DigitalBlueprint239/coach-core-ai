// Test-only browser hooks, loaded ONLY in emulator builds (see src/firebase.ts).
//
// They let a real-browser test drive the app's own Firebase SDK session for
// states the UI deliberately has no button for (anonymous and password
// sessions, direct reads of another team's data). Tests that use them are
// labelled "SDK-in-browser" in the report and are never counted as UI
// workflows. A production build cannot contain this module: the import is
// inside a compile-time-false branch, and the bundle scan asserts that the
// `__coachCoreE2E` marker is absent.
import type { Auth } from 'firebase/auth';
import { signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, updateDoc, runTransaction, Timestamp, type UpdateData, type DocumentData } from 'firebase/firestore';
import { callCoachAI } from '../services/coach-ai-client';

type Result = { ok: true; data?: unknown } | { ok: false; code: string };

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, code: String((err as { code?: string })?.code || 'unknown') };
  }
}

// Firestore Timestamps cannot cross the Playwright boundary; tests send
// `{ __ts: iso }` and get plain JSON back.
function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.__ts === 'string') return Timestamp.fromDate(new Date(o.__ts));
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, revive(v)]));
  }
  return value;
}

export function installEmulatorHooks(auth: Auth, db: Firestore): void {
  (window as unknown as { __coachCoreE2E: unknown }).__coachCoreE2E = {
    uid: () => auth.currentUser?.uid ?? null,
    signInAnonymously: () => run(() => signInAnonymously(auth).then(() => undefined)),
    signInWithPassword: (email: string, password: string) =>
      run(() => signInWithEmailAndPassword(auth, email, password).then(() => undefined)),
    get: (path: string) => run(async () => {
      const snap = await getDoc(doc(db, path));
      return snap.exists() ? JSON.parse(JSON.stringify(snap.data())) : null;
    }),
    // Same read a create-only import transaction performs (exists check).
    txGet: (path: string) => run(() => runTransaction(db, async (tx) => {
      const snap = await tx.get(doc(db, path));
      return snap.exists() ? 'exists' : 'missing';
    })),
    // Gateway kill-switch check through the app's own AI client (the UI no
    // longer offers AI generation). Returns the client's stable error reason.
    coachAI: (teamId: string) => callCoachAI('practice_plan', teamId, {
      ageGroup: '10U', skillLevel: 'beginner', durationMinutes: 60, objectives: ['Tackling'],
    } as never).then(() => ({ ok: true }), (e: { code?: string; reason?: string }) => ({ ok: false, code: String(e?.code), reason: String(e?.reason) })),
    set: (path: string, data: unknown) => run(() => setDoc(doc(db, path), revive(data) as object)),
    update: (path: string, data: unknown) =>
      run(() => updateDoc(doc(db, path), revive(data) as UpdateData<DocumentData>)),
  };
}
