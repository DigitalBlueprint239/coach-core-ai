/**
 * SyncStatusIndicator — Shows Firestore sync state in the playbook header.
 *
 * States:
 * - synced (green): All changes saved to cloud
 * - syncing (yellow): Write in progress
 * - offline (gray): Guest mode or no connection (localStorage only)
 * - error (red): Sync failed
 */

import React from 'react';
import type { SyncStatus } from '../hooks/useFirestoreSync';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  isAuthenticated: boolean;
}

const STATUS_CONFIG: Record<SyncStatus, { color: string; bg: string; label: string; dot: string }> = {
  synced:  { color: 'text-green-700', bg: 'bg-green-50', label: 'Synced',     dot: 'bg-green-500' },
  syncing: { color: 'text-yellow-700', bg: 'bg-yellow-50', label: 'Syncing...', dot: 'bg-yellow-500' },
  offline: { color: 'text-gray-500', bg: 'bg-gray-50', label: 'Offline',     dot: 'bg-gray-400' },
  error:   { color: 'text-red-700', bg: 'bg-red-50', label: 'Sync Error',  dot: 'bg-red-500' },
};

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ status, isAuthenticated }) => {
  const config = STATUS_CONFIG[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.color} ${config.bg}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} ${status === 'syncing' ? 'animate-pulse' : ''}`} />
      <span>{isAuthenticated ? config.label : 'Local Only'}</span>
    </div>
  );
};

export default SyncStatusIndicator;
