// src/components/SmartPlaybook/src/services/firebase.ts
//
// CONSOLIDATION NOTE (2026-02-24):
// This file previously called initializeApp() independently with its own
// firebaseConfig, creating a second Firebase app instance. Two app instances
// can silently write to separate databases and cause session/auth conflicts.
//
// This file is part of the SmartPlaybook sub-project directory structure.
// The active SmartPlaybook.tsx (src/components/SmartPlaybook/SmartPlaybook.tsx)
// does NOT currently import from here — plays are saved to localStorage.
// This consolidation is pre-emptive: if a future session wires Firestore into
// the playbook, this ensures it will use the shared project instance.
//
// All Firebase access flows through src/services/firebase.ts.

export { app, auth, db } from '../../../../services/firebase';

// Re-export service types that callers in this sub-directory may import.
// These types are defined in src/services/firestore.ts (the shared layer).
export type {
  PracticePlan,
  Play,
} from '../../../../services/firestore';
