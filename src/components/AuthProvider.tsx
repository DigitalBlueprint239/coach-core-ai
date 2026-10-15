// Kept for backward compatibility: the single auth implementation lives in
// src/hooks/useAuth.tsx. Do not add a second provider here (Day 1 F-02).
export { AuthProvider, useAuth } from '../hooks/useAuth';
export type { AuthContextType, AuthStatus } from '../hooks/useAuth';
