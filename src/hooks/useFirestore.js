"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMigration = exports.usePlaybook = exports.usePracticePlans = void 0;
// src/hooks/useFirestore.ts
const react_1 = require("react");
const firestore_1 = require("../services/firestore");
// Hook for managing practice plans
const usePracticePlans = (teamId) => {
    const [plans, setPlans] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Load plans on mount and when teamId changes
    (0, react_1.useEffect)(() => {
        if (!teamId) {
            setPlans([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        // Subscribe to real-time updates
        const unsubscribe = (0, firestore_1.subscribeToPracticePlans)(teamId, (updatedPlans) => {
            setPlans(updatedPlans);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [teamId]);
    const createPlan = (0, react_1.useCallback)((planData) => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamId)
            throw new Error('No team selected');
        try {
            setError(null);
            yield (0, firestore_1.savePracticePlan)(teamId, planData);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create practice plan';
            setError(errorMessage);
            throw err;
        }
    }), [teamId]);
    const updatePlan = (0, react_1.useCallback)((planId, updates) => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamId)
            throw new Error('No team selected');
        try {
            setError(null);
            yield (0, firestore_1.updatePracticePlan)(teamId, planId, updates);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update practice plan';
            setError(errorMessage);
            throw err;
        }
    }), [teamId]);
    const removePlan = (0, react_1.useCallback)((planId) => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamId)
            throw new Error('No team selected');
        try {
            setError(null);
            yield (0, firestore_1.deletePracticePlan)(teamId, planId);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete practice plan';
            setError(errorMessage);
            throw err;
        }
    }), [teamId]);
    return {
        plans,
        loading,
        error,
        createPlan,
        updatePlan,
        removePlan
    };
};
exports.usePracticePlans = usePracticePlans;
// Hook for managing plays
const usePlaybook = (teamId) => {
    const [plays, setPlays] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Load plays on mount and when teamId changes
    (0, react_1.useEffect)(() => {
        if (!teamId) {
            setPlays([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        // Subscribe to real-time updates
        const unsubscribe = (0, firestore_1.subscribeToPlays)(teamId, (updatedPlays) => {
            setPlays(updatedPlays);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [teamId]);
    const createPlay = (0, react_1.useCallback)((playData) => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamId)
            throw new Error('No team selected');
        try {
            setError(null);
            yield (0, firestore_1.savePlay)(teamId, playData);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create play';
            setError(errorMessage);
            throw err;
        }
    }), [teamId]);
    const updatePlayLocal = (0, react_1.useCallback)((playId, updates) => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamId)
            throw new Error('No team selected');
        try {
            setError(null);
            yield (0, firestore_1.updatePlay)(teamId, playId, updates);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update play';
            setError(errorMessage);
            throw err;
        }
    }), [teamId]);
    const removePlay = (0, react_1.useCallback)((playId) => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamId)
            throw new Error('No team selected');
        try {
            setError(null);
            yield (0, firestore_1.deletePlay)(teamId, playId);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete play';
            setError(errorMessage);
            throw err;
        }
    }), [teamId]);
    return {
        plays,
        loading,
        error,
        createPlay,
        updatePlay: updatePlayLocal,
        removePlay
    };
};
exports.usePlaybook = usePlaybook;
// Hook for data migration
const useMigration = (teamId) => {
    const [isMigrating, setIsMigrating] = (0, react_1.useState)(false);
    const [hasLocalData, setHasLocalData] = (0, react_1.useState)(false);
    // Check for existing localStorage data
    (0, react_1.useEffect)(() => {
        const plans = localStorage.getItem('practicePlans');
        const plays = localStorage.getItem('plays');
        setHasLocalData(!!(plans || plays));
    }, []);
    const migrateData = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamId)
            throw new Error('No team selected');
        setIsMigrating(true);
        try {
            yield (0, firestore_1.migrateFromLocalStorage)(teamId);
            setHasLocalData(false);
        }
        catch (err) {
            throw err;
        }
        finally {
            setIsMigrating(false);
        }
    }), [teamId]);
    return {
        isMigrating,
        hasLocalData,
        migrateData
    };
};
exports.useMigration = useMigration;
