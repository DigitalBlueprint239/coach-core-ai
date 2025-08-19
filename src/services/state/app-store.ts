import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { dataService, Team, Player, PracticePlan, Game, AIInsight } from '../firebase/data-service';
import { useState, useEffect } from 'react';

// App State Types
export interface AppState {
  // User State
  user: {
    uid: string | null;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'head-coach' | 'assistant-coach' | 'administrator' | 'parent-volunteer';
    teamId: string | null;
    teamName: string | null;
  } | null;
  
  // Team State
  currentTeam: Team | null;
  teams: Team[];
  
  // Players State
  players: Player[];
  selectedPlayer: Player | null;
  
  // Practice Plans State
  practices: PracticePlan[];
  currentPractice: PracticePlan | null;
  
  // Games State
  games: Game[];
  currentGame: Game | null;
  
  // AI State
  aiInsights: AIInsight[];
  aiHistory: Array<{
    id: string;
    query: string;
    response: string;
    timestamp: Date;
    confidence: number;
  }>;
  
  // UI State
  isLoading: boolean;
  activeTab: string;
  showHelp: boolean;
  
  // Offline State
  offlineQueue: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    collection: string;
    data: any;
    timestamp: Date;
  }>;
  syncStatus: 'synced' | 'syncing' | 'offline';
  
  // Actions
  setUser: (user: AppState['user']) => void;
  setCurrentTeam: (team: Team | null) => void;
  setTeams: (teams: Team[]) => void;
  addPlayer: (player: Player) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  removePlayer: (id: string) => void;
  setPlayers: (players: Player[]) => void;
  setSelectedPlayer: (player: Player | null) => void;
  addPractice: (practice: PracticePlan) => void;
  updatePractice: (id: string, updates: Partial<PracticePlan>) => void;
  removePractice: (id: string) => void;
  setPractices: (practices: PracticePlan[]) => void;
  setCurrentPractice: (practice: PracticePlan | null) => void;
  addGame: (game: Game) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  removeGame: (id: string) => void;
  setGames: (games: Game[]) => void;
  setCurrentGame: (game: Game | null) => void;
  addAIInsight: (insight: AIInsight) => void;
  updateAIInsight: (id: string, updates: Partial<AIInsight>) => void;
  removeAIInsight: (id: string) => void;
  setAIInsights: (insights: AIInsight[]) => void;
  addAIMessage: (query: string, response: string, confidence: number) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: string) => void;
  setShowHelp: (show: boolean) => void;
  addToOfflineQueue: (operation: AppState['offlineQueue'][0]) => void;
  removeFromOfflineQueue: (id: string) => void;
  setSyncStatus: (status: AppState['syncStatus']) => void;
  syncOfflineData: () => Promise<void>;
  clearStore: () => void;
}

// Initial State
const initialState = {
  user: null,
  currentTeam: null,
  teams: [],
  players: [],
  selectedPlayer: null,
  practices: [],
  currentPractice: null,
  games: [],
  currentGame: null,
  aiInsights: [],
  aiHistory: [],
  isLoading: false,
  activeTab: 'dashboard',
  showHelp: false,
  offlineQueue: [],
  syncStatus: 'synced' as const,
};

// Create Store
export const useAppStore = create<AppState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // User Actions
      setUser: (user) => set({ user }),

      // Team Actions
      setCurrentTeam: (team) => set({ currentTeam: team }),
      setTeams: (teams) => set({ teams }),

      // Player Actions
      addPlayer: (player) => set((state) => ({ 
        players: [...state.players, player] 
      })),
      updatePlayer: (id, updates) => set((state) => ({
        players: state.players.map(p => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
        selectedPlayer: state.selectedPlayer?.id === id 
          ? { ...state.selectedPlayer, ...updates, updatedAt: new Date() }
          : state.selectedPlayer
      })),
      removePlayer: (id) => set((state) => ({
        players: state.players.filter(p => p.id !== id),
        selectedPlayer: state.selectedPlayer?.id === id ? null : state.selectedPlayer
      })),
      setPlayers: (players) => set({ players }),
      setSelectedPlayer: (player) => set({ selectedPlayer: player }),

      // Practice Actions
      addPractice: (practice) => set((state) => ({ 
        practices: [practice, ...state.practices] 
      })),
      updatePractice: (id, updates) => set((state) => ({
        practices: state.practices.map(p => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
        currentPractice: state.currentPractice?.id === id 
          ? { ...state.currentPractice, ...updates, updatedAt: new Date() }
          : state.currentPractice
      })),
      removePractice: (id) => set((state) => ({
        practices: state.practices.filter(p => p.id !== id),
        currentPractice: state.currentPractice?.id === id ? null : state.currentPractice
      })),
      setPractices: (practices) => set({ practices }),
      setCurrentPractice: (practice) => set({ currentPractice: practice }),

      // Game Actions
      addGame: (game) => set((state) => ({ 
        games: [game, ...state.games] 
      })),
      updateGame: (id, updates) => set((state) => ({
        games: state.games.map(g => 
          g.id === id ? { ...g, ...updates, updatedAt: new Date() } : g
        ),
        currentGame: state.currentGame?.id === id 
          ? { ...state.currentGame, ...updates, updatedAt: new Date() }
          : state.currentGame
      })),
      removeGame: (id) => set((state) => ({
        games: state.games.filter(g => g.id !== id),
        currentGame: state.currentGame?.id === id ? null : state.currentGame
      })),
      setGames: (games) => set({ games }),
      setCurrentGame: (game) => set({ currentGame: game }),

      // AI Actions
      addAIInsight: (insight) => set((state) => ({ 
        aiInsights: [insight, ...state.aiInsights] 
      })),
      updateAIInsight: (id, updates) => set((state) => ({
        aiInsights: state.aiInsights.map(i => 
          i.id === id ? { ...i, ...updates, updatedAt: new Date() } : i
        )
      })),
      removeAIInsight: (id) => set((state) => ({
        aiInsights: state.aiInsights.filter(i => i.id !== id)
      })),
      setAIInsights: (insights) => set({ aiInsights: insights }),
      addAIMessage: (query, response, confidence) => set((state) => ({
        aiHistory: [
          {
            id: Date.now().toString(),
            query,
            response,
            timestamp: new Date(),
            confidence
          },
          ...state.aiHistory.slice(0, 49) // Keep last 50 messages
        ]
      })),

      // UI Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setShowHelp: (show) => set({ showHelp: show }),

      // Offline Actions
      addToOfflineQueue: (operation) => set((state) => ({
        offlineQueue: [...state.offlineQueue, operation]
      })),
      removeFromOfflineQueue: (id) => set((state) => ({
        offlineQueue: state.offlineQueue.filter(op => op.id !== id)
      })),
      setSyncStatus: (status) => set({ syncStatus: status }),

      // Sync offline data when back online
      syncOfflineData: async () => {
        const state = get();
        if (state.offlineQueue.length === 0) return;

        set({ syncStatus: 'syncing' });

        try {
          const operations = state.offlineQueue.map(op => ({
            type: op.type as 'create' | 'update' | 'delete',
            collection: op.collection,
            id: op.id,
            data: op.data
          }));

          await dataService.batchOperation(operations);
          
          // Clear offline queue after successful sync
          set({ offlineQueue: [], syncStatus: 'synced' });
        } catch (error) {
          console.error('Failed to sync offline data:', error);
          set({ syncStatus: 'offline' });
        }
      },

      // Clear store (for logout)
      clearStore: () => set(initialState),
    })),
    {
      name: 'coach-core-storage',
      partialize: (state) => ({
        user: state.user,
        currentTeam: state.currentTeam,
        teams: state.teams,
        players: state.players,
        practices: state.practices,
        games: state.games,
        aiInsights: state.aiInsights,
        aiHistory: state.aiHistory.slice(0, 20), // Keep last 20 AI messages
        offlineQueue: state.offlineQueue,
        syncStatus: state.syncStatus,
      }),
      onRehydrateStorage: () => (state) => {
        // Rehydrate dates after storage
        if (state) {
          const rehydrateDates = (obj: any) => {
            if (obj && typeof obj === 'object') {
              Object.keys(obj).forEach(key => {
                if (key === 'createdAt' || key === 'updatedAt' || key === 'date') {
                  if (obj[key]) {
                    obj[key] = new Date(obj[key]);
                  }
                } else if (Array.isArray(obj[key])) {
                  obj[key].forEach(rehydrateDates);
                } else if (typeof obj[key] === 'object') {
                  rehydrateDates(obj[key]);
                }
              });
            }
          };
          
          rehydrateDates(state);
        }
      },
    }
  )
);

// Selectors for common data access patterns
export const useTeamData = () => useAppStore((state) => ({
  currentTeam: state.currentTeam,
  players: state.players,
  practices: state.practices,
  games: state.games,
  aiInsights: state.aiInsights,
}));

export const usePlayerData = () => useAppStore((state) => ({
  players: state.players,
  selectedPlayer: state.selectedPlayer,
}));

export const usePracticeData = () => useAppStore((state) => ({
  practices: state.practices,
  currentPractice: state.currentPractice,
}));

export const useGameData = () => useAppStore((state) => ({
  games: state.games,
  currentGame: state.currentGame,
}));

export const useAIState = () => useAppStore((state) => ({
  aiInsights: state.aiInsights,
  aiHistory: state.aiHistory,
}));

export const useOfflineState = () => useAppStore((state) => ({
  offlineQueue: state.offlineQueue,
  syncStatus: state.syncStatus,
}));

// Network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { syncOfflineData, setSyncStatus } = useAppStore();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineData, setSyncStatus]);

  return isOnline;
};

// Auto-sync when coming back online
useAppStore.subscribe(
  (state) => state.syncStatus,
  (syncStatus) => {
    if (syncStatus === 'synced' && navigator.onLine) {
      // Trigger any additional sync logic here
      console.log('Data synced successfully');
    }
  }
);

export default useAppStore;
