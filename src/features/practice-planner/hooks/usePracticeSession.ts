import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Drill {
  id: string;
  name: string;
  duration: number;
  category: string;
  equipment: string[];
  players: number;
}

interface PracticeSession {
  id: string;
  name: string;
  date: Date;
  duration: number;
  drills: Drill[];
  notes: string;
}

interface PracticeStore {
  currentSession: PracticeSession | null;
  sessions: PracticeSession[];
  isLiveMode: boolean;
  elapsedTime: number;

  // Actions
  createSession: (session: Omit<PracticeSession, 'id'>) => void;
  addDrill: (drill: Drill) => void;
  removeDrill: (drillId: string) => void;
  reorderDrills: (startIndex: number, endIndex: number) => void;
  startLiveMode: () => void;
  stopLiveMode: () => void;
  updateElapsedTime: (time: number) => void;
}

export const usePracticeStore = create<PracticeStore>()(
  persist(
    set => ({
      currentSession: null,
      sessions: [],
      isLiveMode: false,
      elapsedTime: 0,

      createSession: session =>
        set(state => {
          const newSession = {
            ...session,
            id: `session_${Date.now()}`,
          };
          return {
            currentSession: newSession,
            sessions: [...state.sessions, newSession],
          };
        }),

      addDrill: drill =>
        set(state => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              drills: [...state.currentSession.drills, drill],
            },
          };
        }),

      removeDrill: drillId =>
        set(state => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              drills: state.currentSession.drills.filter(d => d.id !== drillId),
            },
          };
        }),

      reorderDrills: (startIndex, endIndex) =>
        set(state => {
          if (!state.currentSession) return state;
          const drills = [...state.currentSession.drills];
          const [removed] = drills.splice(startIndex, 1);
          drills.splice(endIndex, 0, removed);
          return {
            currentSession: {
              ...state.currentSession,
              drills,
            },
          };
        }),

      startLiveMode: () => set({ isLiveMode: true, elapsedTime: 0 }),
      stopLiveMode: () => set({ isLiveMode: false }),
      updateElapsedTime: time => set({ elapsedTime: time }),
    }),
    {
      name: 'practice-storage',
    }
  )
);
