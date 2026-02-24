// src/services/roster-service.ts
// Firestore CRUD operations for roster players stored as subcollections under teams.
// Path: teams/{teamId}/players/{playerId}

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  RosterPlayer,
  RosterPlayerCreate,
  RosterPlayerUpdate,
  POSITION_TO_GROUP,
} from '../types/roster';

function playersCollection(teamId: string) {
  return collection(db, 'teams', teamId, 'players');
}

function playerDoc(teamId: string, playerId: string) {
  return doc(db, 'teams', teamId, 'players', playerId);
}

// Check if a jersey number is already taken on this team
export async function isJerseyNumberTaken(
  teamId: string,
  jerseyNumber: number,
  excludePlayerId?: string
): Promise<boolean> {
  const q = query(
    playersCollection(teamId),
    where('number', '==', jerseyNumber)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  if (excludePlayerId) {
    return snapshot.docs.some((d) => d.id !== excludePlayerId);
  }
  return true;
}

// Add a new player to the roster
export async function addPlayer(
  teamId: string,
  data: Omit<RosterPlayerCreate, 'teamId' | 'positionGroup'>
): Promise<string> {
  const positionGroup = POSITION_TO_GROUP[data.position];
  const playerData = {
    ...data,
    teamId,
    positionGroup,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(playersCollection(teamId), playerData);
  return docRef.id;
}

// Update an existing player
export async function updatePlayer(
  teamId: string,
  playerId: string,
  updates: RosterPlayerUpdate
): Promise<void> {
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  // Auto-compute positionGroup when position changes
  if (updates.position) {
    updateData.positionGroup = POSITION_TO_GROUP[updates.position];
  }
  await updateDoc(playerDoc(teamId, playerId), updateData);
}

// Delete a player from the roster
export async function deletePlayer(
  teamId: string,
  playerId: string
): Promise<void> {
  await deleteDoc(playerDoc(teamId, playerId));
}

// Subscribe to real-time roster updates for a team.
// Returns an unsubscribe function — caller must invoke it on cleanup.
export function subscribeToRoster(
  teamId: string,
  callback: (players: RosterPlayer[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    playersCollection(teamId),
    orderBy('positionGroup'),
    orderBy('position'),
    orderBy('createdAt')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const players: RosterPlayer[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RosterPlayer[];
      callback(players);
    },
    (error) => {
      console.error('Roster subscription error:', error);
      if (onError) onError(error);
    }
  );
}
