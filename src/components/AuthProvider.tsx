// src/components/AuthProvider.tsx
//
// WHY THIS FILE EXISTS AS A RE-EXPORT:
// App.tsx imports AuthProvider from this path. hooks/useAuth.tsx is the real
// implementation (email/password auth, browserLocalPersistence). Rather than
// changing every import site, this file re-exports from the canonical location.
//
// PREVIOUS BUG: This file used to contain a second AuthProvider using
// signInAnonymously, creating a separate React context. Dashboard.tsx used
// hooks/useAuth.tsx's context — so useAuth() threw "must be used within an
// AuthProvider" because the anonymous context was never the one provided.
// That file has been replaced with this re-export to close the conflict.

export { AuthProvider, useAuth } from '../hooks/useAuth';
