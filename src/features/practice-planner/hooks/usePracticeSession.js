"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePracticeStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.usePracticeStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    currentSession: null,
    sessions: [],
    isLiveMode: false,
    elapsedTime: 0,
    createSession: (session) => set((state) => {
        const newSession = Object.assign(Object.assign({}, session), { id: `session_${Date.now()}` });
        return {
            currentSession: newSession,
            sessions: [...state.sessions, newSession],
        };
    }),
    addDrill: (drill) => set((state) => {
        if (!state.currentSession)
            return state;
        return {
            currentSession: Object.assign(Object.assign({}, state.currentSession), { drills: [...state.currentSession.drills, drill] }),
        };
    }),
    removeDrill: (drillId) => set((state) => {
        if (!state.currentSession)
            return state;
        return {
            currentSession: Object.assign(Object.assign({}, state.currentSession), { drills: state.currentSession.drills.filter((d) => d.id !== drillId) }),
        };
    }),
    reorderDrills: (startIndex, endIndex) => set((state) => {
        if (!state.currentSession)
            return state;
        const drills = [...state.currentSession.drills];
        const [removed] = drills.splice(startIndex, 1);
        drills.splice(endIndex, 0, removed);
        return {
            currentSession: Object.assign(Object.assign({}, state.currentSession), { drills }),
        };
    }),
    startLiveMode: () => set({ isLiveMode: true, elapsedTime: 0 }),
    stopLiveMode: () => set({ isLiveMode: false }),
    updateElapsedTime: (time) => set({ elapsedTime: time }),
}), {
    name: 'practice-storage',
}));
