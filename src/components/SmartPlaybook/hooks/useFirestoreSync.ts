/**
 * useFirestoreSync.ts — Bridges SmartPlaybook's local state with Firestore.
 *
 * Responsibilities:
 * 1. On mount: check auth → load from Firestore if authenticated, else localStorage
 * 2. On play save/delete: debounced write to Firestore + localStorage fallback
 * 3. On first auth: offer to migrate localStorage plays to Firestore
 * 4. Sync status indicator for the UI
 *
 * IMPORTANT: Only syncs canonical play data (savedPlays).
 * Does NOT sync undo/redo stacks, selected player, active tool, or preview routes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserPlay } from '../../../services/firestore';
import {
  saveUserPlay,
  updateUserPlay,
  deleteUserPlay,
  subscribeToUserPlays,
  migrateSmartPlaybookPlays
} from '../../../services/firestore';
import type { InternalPlay } from '../services/playSerializer';
import { serializePlay, deserializePlay } from '../services/playSerializer';
import type { User } from 'firebase/auth';

// ============================================
// TYPES
// ============================================

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface UseFirestoreSyncOptions {
  user: User | null;
  savedPlays: any[];
  setSavedPlays: (plays: any[]) => void;
  addNotification: (type: string, message: string) => void;
}

interface UseFirestoreSyncReturn {
  syncStatus: SyncStatus;
  isMigrationAvailable: boolean;
  migrateLocalPlays: () => Promise<void>;
  savePlayToFirestore: (play: any) => Promise<void>;
  deletePlayFromFirestore: (playId: string) => Promise<void>;
}

// ============================================
// LOCALSTORAGE HELPERS
// ============================================

const LS_KEY = 'smartPlaybook_plays';
const LS_MIGRATION_KEY = 'smartPlaybook_migrated';

function loadFromLocalStorage(): any[] {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(plays: any[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(plays));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

function hasMigrated(userId: string): boolean {
  return localStorage.getItem(LS_MIGRATION_KEY) === userId;
}

function hasLocalStoragePlays(): boolean {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) return false;
    const plays = JSON.parse(stored);
    return Array.isArray(plays) && plays.length > 0;
  } catch {
    return false;
  }
}

// ============================================
// HOOK
// ============================================

export function useFirestoreSync({
  user,
  savedPlays,
  setSavedPlays,
  addNotification
}: UseFirestoreSyncOptions): UseFirestoreSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [isMigrationAvailable, setIsMigrationAvailable] = useState(false);

  // Track whether we're receiving Firestore data (to avoid writing back what we just received)
  const isReceivingRef = useRef(false);
  // Track firestore doc IDs mapped to local play IDs
  const firestoreIdMapRef = useRef<Map<string, string>>(new Map());
  // Debounce timer
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----------------------------------------
  // 1. Subscribe to Firestore when authenticated
  // ----------------------------------------
  useEffect(() => {
    if (!user) {
      setSyncStatus('offline');
      // Load from localStorage for guest mode
      const localPlays = loadFromLocalStorage();
      if (localPlays.length > 0 && savedPlays.length === 0) {
        setSavedPlays(localPlays);
      }
      return;
    }

    setSyncStatus('syncing');

    const unsubscribe = subscribeToUserPlays(user.uid, (firestorePlays: UserPlay[]) => {
      isReceivingRef.current = true;

      // Deserialize and update local state
      const plays = firestorePlays.map(fp => {
        const internal = deserializePlay(fp);
        // Map firestore doc ID to local play ID
        if (fp.id) {
          firestoreIdMapRef.current.set(internal.id, fp.id);
        }
        return internal;
      });

      setSavedPlays(plays);
      // Also cache to localStorage for offline fallback
      saveToLocalStorage(plays);
      setSyncStatus('synced');

      // Reset flag after React processes the update
      setTimeout(() => { isReceivingRef.current = false; }, 100);
    });

    return () => {
      unsubscribe();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [user]);

  // ----------------------------------------
  // 2. Check migration availability
  // ----------------------------------------
  useEffect(() => {
    if (user && hasLocalStoragePlays() && !hasMigrated(user.uid)) {
      setIsMigrationAvailable(true);
    } else {
      setIsMigrationAvailable(false);
    }
  }, [user]);

  // ----------------------------------------
  // 3. Always keep localStorage in sync (offline fallback)
  // ----------------------------------------
  useEffect(() => {
    if (!isReceivingRef.current) {
      saveToLocalStorage(savedPlays);
    }
  }, [savedPlays]);

  // ----------------------------------------
  // Save a play to Firestore
  // ----------------------------------------
  const savePlayToFirestore = useCallback(async (play: any) => {
    if (!user) return;

    try {
      setSyncStatus('syncing');
      const serialized = serializePlay(play as InternalPlay);
      const existingDocId = firestoreIdMapRef.current.get(play.id);

      if (existingDocId && !existingDocId.startsWith('offline_')) {
        // Update existing document
        await updateUserPlay(existingDocId, serialized);
      } else {
        // Create new document
        const docId = await saveUserPlay(user.uid, serialized);
        firestoreIdMapRef.current.set(play.id, docId);
      }

      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to save play to Firestore:', error);
      setSyncStatus('error');
      // localStorage fallback already handled by the useEffect above
    }
  }, [user]);

  // ----------------------------------------
  // Delete a play from Firestore
  // ----------------------------------------
  const deletePlayFromFirestore = useCallback(async (playId: string) => {
    if (!user) return;

    try {
      setSyncStatus('syncing');
      const docId = firestoreIdMapRef.current.get(playId);
      if (docId && !docId.startsWith('offline_')) {
        await deleteUserPlay(docId);
        firestoreIdMapRef.current.delete(playId);
      }
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to delete play from Firestore:', error);
      setSyncStatus('error');
    }
  }, [user]);

  // ----------------------------------------
  // Migrate localStorage plays to Firestore
  // ----------------------------------------
  const migrateLocalPlays = useCallback(async () => {
    if (!user) return;

    try {
      setSyncStatus('syncing');
      const count = await migrateSmartPlaybookPlays(user.uid);
      setIsMigrationAvailable(false);
      setSyncStatus('synced');
      if (count > 0) {
        addNotification('success', `Migrated ${count} play${count !== 1 ? 's' : ''} to the cloud`);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setSyncStatus('error');
      addNotification('error', 'Failed to migrate plays. They are still saved locally.');
    }
  }, [user, addNotification]);

  return {
    syncStatus,
    isMigrationAvailable,
    migrateLocalPlays,
    savePlayToFirestore,
    deletePlayFromFirestore
  };
}
