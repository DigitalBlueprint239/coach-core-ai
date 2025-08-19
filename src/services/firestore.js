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
exports.updateWithOptimisticLocking = exports.migrateFromLocalStorage = exports.getMaxQueueSize = exports.getOfflineQueueSize = exports.isOffline = exports.subscribeToTeams = exports.subscribeToPlayers = exports.subscribeToPlays = exports.subscribeToPracticePlans = exports.deleteUserProfile = exports.updateUserProfile = exports.getUserProfile = exports.saveUserProfile = exports.deleteTeam = exports.updateTeam = exports.getTeams = exports.saveTeam = exports.deletePlayer = exports.updatePlayer = exports.getPlayers = exports.savePlayer = exports.deletePlay = exports.updatePlay = exports.getPlays = exports.savePlay = exports.deletePracticePlan = exports.updatePracticePlan = exports.getPracticePlans = exports.savePracticePlan = exports.onAuthStateChange = exports.waitForAuth = void 0;
// src/services/firestore.ts
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const auth_1 = require("firebase/auth");
// Initialize Firebase
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};
// Initialize Firebase only once
let app;
if (!(0, app_1.getApps)().length) {
    app = (0, app_1.initializeApp)(firebaseConfig);
}
else {
    app = (0, app_1.getApps)()[0];
}
const db = (0, firestore_1.getFirestore)(app);
const auth = (0, auth_1.getAuth)(app);
// Connect to emulators in development
if (process.env.REACT_APP_USE_EMULATOR === 'true' && process.env.NODE_ENV === 'development') {
    try {
        (0, firestore_1.connectFirestoreEmulator)(db, 'localhost', 8080);
        (0, auth_1.connectAuthEmulator)(auth, 'http://localhost:9099');
    }
    catch (error) {
        console.log('Emulators already connected');
    }
}
/**
 * Generic optimistic locking update function
 */
function updateWithOptimisticLocking(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { collectionName, documentId, updates, currentUser, additionalFields } = options;
        const docRef = (0, firestore_1.doc)(db, collectionName, documentId);
        try {
            yield (0, firestore_1.runTransaction)(db, (transaction) => __awaiter(this, void 0, void 0, function* () {
                const docSnapshot = yield transaction.get(docRef);
                if (!docSnapshot.exists()) {
                    throw new Error(`${collectionName} document not found or has been deleted`);
                }
                const currentData = docSnapshot.data();
                const currentVersion = currentData.version || 0;
                const expectedVersion = updates.version || currentVersion;
                // Check if the document has been modified by another user
                if (currentVersion !== expectedVersion) {
                    throw new Error(`${collectionName} has been modified by another user. Please refresh and try again.`);
                }
                const updateData = Object.assign(Object.assign(Object.assign({}, updates), additionalFields), { version: currentVersion + 1, lastModifiedBy: currentUser.uid, lastModifiedAt: (0, firestore_1.serverTimestamp)(), updatedAt: new Date() });
                transaction.update(docRef, updateData);
            }));
        }
        catch (error) {
            if (!isOnline) {
                // For offline mode, queue the update without version checking
                const data = Object.assign(Object.assign(Object.assign({}, updates), additionalFields), { updatedAt: new Date() });
                addToOfflineQueue({
                    type: 'update',
                    collection: collectionName,
                    docId: documentId,
                    data
                });
                return;
            }
            // Re-throw the error with a more user-friendly message
            if (error instanceof Error) {
                throw new Error(`Failed to update ${collectionName}: ${error.message}`);
            }
            throw error;
        }
    });
}
exports.updateWithOptimisticLocking = updateWithOptimisticLocking;
// ============================================
// AUTHENTICATION UTILITIES
// ============================================
function getCurrentUser() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User must be authenticated to perform this operation');
    }
    return user;
}
function waitForAuth() {
    return new Promise((resolve) => {
        const unsubscribe = (0, auth_1.onAuthStateChanged)(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}
exports.waitForAuth = waitForAuth;
function onAuthStateChange(listener) {
    return (0, auth_1.onAuthStateChanged)(auth, listener);
}
exports.onAuthStateChange = onAuthStateChange;
// ============================================
// OFFLINE QUEUE MANAGEMENT
// ============================================
let offlineQueue = [];
let isOnline = navigator.onLine;
// Load offline queue from localStorage
function loadOfflineQueue() {
    try {
        const stored = localStorage.getItem('coach_core_offline_queue');
        if (stored) {
            offlineQueue = JSON.parse(stored);
        }
    }
    catch (error) {
        console.error('Failed to load offline queue:', error);
        offlineQueue = [];
    }
}
// Save offline queue to localStorage
function saveOfflineQueue() {
    try {
        localStorage.setItem('coach_core_offline_queue', JSON.stringify(offlineQueue));
    }
    catch (error) {
        console.error('Failed to save offline queue:', error);
    }
}
function addToOfflineQueue(operation) {
    offlineQueue.push(Object.assign(Object.assign({}, operation), { timestamp: Date.now(), id: `op_${Date.now()}_${Math.random()}` }));
    saveOfflineQueue();
}
// Load queue on initialization
loadOfflineQueue();
// Network status monitoring
window.addEventListener('online', () => {
    isOnline = true;
    syncOfflineQueue();
});
window.addEventListener('offline', () => {
    isOnline = false;
});
function syncOfflineQueue() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!isOnline || offlineQueue.length === 0)
            return;
        const queue = [...offlineQueue];
        offlineQueue = [];
        saveOfflineQueue();
        for (const operation of queue) {
            try {
                yield executeOperation(operation);
            }
            catch (error) {
                console.error('Failed to sync offline operation:', error);
                // Only add back to queue if it's not a permanent error
                if (!((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('permission-denied'))) {
                    offlineQueue.push(operation);
                }
            }
        }
        if (offlineQueue.length > 0) {
            saveOfflineQueue();
        }
    });
}
function executeOperation(operation) {
    return __awaiter(this, void 0, void 0, function* () {
        const { type, collection: collectionName, data, docId } = operation;
        switch (type) {
            case 'create':
                if (docId) {
                    yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, collectionName, docId), data);
                }
                else {
                    yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, collectionName), data);
                }
                break;
            case 'update':
                yield (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, collectionName, docId), data);
                break;
            case 'delete':
                yield (0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, collectionName, docId));
                break;
        }
    });
}
// ============================================
// PRACTICE PLAN OPERATIONS
// ============================================
function savePracticePlan(teamId, planData) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        const data = Object.assign(Object.assign({}, planData), { teamId, createdBy: currentUser.uid, createdAt: new Date(), updatedAt: new Date(), version: 1, lastModifiedBy: currentUser.uid, lastModifiedAt: (0, firestore_1.serverTimestamp)() });
        try {
            const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'practicePlans'), data);
            return docRef.id;
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'create',
                    collection: 'practicePlans',
                    data
                });
                return `offline_${Date.now()}`;
            }
            throw error;
        }
    });
}
exports.savePracticePlan = savePracticePlan;
function getPracticePlans(teamId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'practicePlans'), (0, firestore_1.where)('teamId', '==', teamId), (0, firestore_1.orderBy)('createdAt', 'desc'));
            const snapshot = yield (0, firestore_1.getDocs)(q);
            return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        }
        catch (error) {
            console.error('Error fetching practice plans:', error);
            return [];
        }
    });
}
exports.getPracticePlans = getPracticePlans;
function updatePracticePlan(teamId, planId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        yield updateWithOptimisticLocking({
            collectionName: 'practicePlans',
            documentId: planId,
            updates,
            currentUser
        });
    });
}
exports.updatePracticePlan = updatePracticePlan;
function deletePracticePlan(teamId, planId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            yield (0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, 'practicePlans', planId));
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'delete',
                    collection: 'practicePlans',
                    docId: planId
                });
                return;
            }
            throw error;
        }
    });
}
exports.deletePracticePlan = deletePracticePlan;
// ============================================
// PLAY OPERATIONS
// ============================================
function savePlay(teamId, playData, level) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        const data = Object.assign(Object.assign(Object.assign(Object.assign({}, playData), { teamId, createdBy: currentUser.uid, createdAt: new Date(), updatedAt: new Date() }), (level && { level })), { version: 1, lastModifiedBy: currentUser.uid, lastModifiedAt: (0, firestore_1.serverTimestamp)() });
        try {
            const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'plays'), data);
            return docRef.id;
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'create',
                    collection: 'plays',
                    data
                });
                return `offline_${Date.now()}`;
            }
            throw error;
        }
    });
}
exports.savePlay = savePlay;
function getPlays(teamId, level) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            const constraints = [
                (0, firestore_1.where)('teamId', '==', teamId),
                (0, firestore_1.orderBy)('createdAt', 'desc')
            ];
            if (level) {
                constraints.unshift((0, firestore_1.where)('level', '==', level));
            }
            const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'plays'), ...constraints);
            const snapshot = yield (0, firestore_1.getDocs)(q);
            return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        }
        catch (error) {
            console.error('Error fetching plays:', error);
            return [];
        }
    });
}
exports.getPlays = getPlays;
function updatePlay(teamId, playId, updates, level) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        yield updateWithOptimisticLocking({
            collectionName: 'plays',
            documentId: playId,
            updates,
            currentUser,
            additionalFields: level ? { level } : undefined
        });
    });
}
exports.updatePlay = updatePlay;
function deletePlay(teamId, playId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            yield (0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, 'plays', playId));
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'delete',
                    collection: 'plays',
                    docId: playId
                });
                return;
            }
            throw error;
        }
    });
}
exports.deletePlay = deletePlay;
// ============================================
// PLAYER OPERATIONS
// ============================================
function savePlayer(teamId, playerData) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        const data = Object.assign(Object.assign({}, playerData), { teamId, createdBy: currentUser.uid, createdAt: new Date(), updatedAt: new Date(), version: 1, lastModifiedBy: currentUser.uid, lastModifiedAt: (0, firestore_1.serverTimestamp)() });
        try {
            const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'players'), data);
            return docRef.id;
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'create',
                    collection: 'players',
                    data
                });
                return `offline_${Date.now()}`;
            }
            throw error;
        }
    });
}
exports.savePlayer = savePlayer;
function getPlayers(teamId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'players'), (0, firestore_1.where)('teamId', '==', teamId), (0, firestore_1.orderBy)('lastName', 'asc'));
            const snapshot = yield (0, firestore_1.getDocs)(q);
            return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        }
        catch (error) {
            console.error('Error fetching players:', error);
            return [];
        }
    });
}
exports.getPlayers = getPlayers;
function updatePlayer(teamId, playerId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        yield updateWithOptimisticLocking({
            collectionName: 'players',
            documentId: playerId,
            updates,
            currentUser
        });
    });
}
exports.updatePlayer = updatePlayer;
function deletePlayer(teamId, playerId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            yield (0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, 'players', playerId));
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'delete',
                    collection: 'players',
                    docId: playerId
                });
                return;
            }
            throw error;
        }
    });
}
exports.deletePlayer = deletePlayer;
// ============================================
// TEAM OPERATIONS
// ============================================
function saveTeam(teamData) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        const data = Object.assign(Object.assign({}, teamData), { createdBy: currentUser.uid, createdAt: new Date(), updatedAt: new Date(), version: 1, lastModifiedBy: currentUser.uid, lastModifiedAt: (0, firestore_1.serverTimestamp)() });
        try {
            const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'teams'), data);
            return docRef.id;
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'create',
                    collection: 'teams',
                    data
                });
                return `offline_${Date.now()}`;
            }
            throw error;
        }
    });
}
exports.saveTeam = saveTeam;
function getTeams() {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        try {
            const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'teams'), (0, firestore_1.where)('coachIds', 'array-contains', currentUser.uid), (0, firestore_1.orderBy)('createdAt', 'desc'));
            const snapshot = yield (0, firestore_1.getDocs)(q);
            return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        }
        catch (error) {
            console.error('Error fetching teams:', error);
            return [];
        }
    });
}
exports.getTeams = getTeams;
function updateTeam(teamId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        yield updateWithOptimisticLocking({
            collectionName: 'teams',
            documentId: teamId,
            updates,
            currentUser
        });
    });
}
exports.updateTeam = updateTeam;
function deleteTeam(teamId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            yield (0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, 'teams', teamId));
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'delete',
                    collection: 'teams',
                    docId: teamId
                });
                return;
            }
            throw error;
        }
    });
}
exports.deleteTeam = deleteTeam;
// ============================================
// USER PROFILE OPERATIONS
// ============================================
function saveUserProfile(userData) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        const data = Object.assign(Object.assign({}, userData), { createdBy: currentUser.uid, createdAt: new Date(), updatedAt: new Date(), version: 1, lastModifiedBy: currentUser.uid, lastModifiedAt: (0, firestore_1.serverTimestamp)() });
        try {
            const docRef = yield (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'users'), data);
            return docRef.id;
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'create',
                    collection: 'users',
                    data
                });
                return `offline_${Date.now()}`;
            }
            throw error;
        }
    });
}
exports.saveUserProfile = saveUserProfile;
function getUserProfile(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            const docRef = (0, firestore_1.doc)(db, 'users', userId);
            const snapshot = yield (0, firestore_1.getDoc)(docRef);
            return snapshot.exists() ? Object.assign({ id: snapshot.id }, snapshot.data()) : null;
        }
        catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    });
}
exports.getUserProfile = getUserProfile;
function updateUserProfile(userId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentUser = getCurrentUser();
        yield updateWithOptimisticLocking({
            collectionName: 'users',
            documentId: userId,
            updates,
            currentUser
        });
    });
}
exports.updateUserProfile = updateUserProfile;
function deleteUserProfile(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        getCurrentUser(); // Ensure authenticated
        try {
            yield (0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, 'users', userId));
        }
        catch (error) {
            if (!isOnline) {
                addToOfflineQueue({
                    type: 'delete',
                    collection: 'users',
                    docId: userId
                });
                return;
            }
            throw error;
        }
    });
}
exports.deleteUserProfile = deleteUserProfile;
// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================
function subscribeToPracticePlans(teamId, callback) {
    const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'practicePlans'), (0, firestore_1.where)('teamId', '==', teamId), (0, firestore_1.orderBy)('createdAt', 'desc'));
    return (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const plans = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        callback(plans);
    });
}
exports.subscribeToPracticePlans = subscribeToPracticePlans;
function subscribeToPlays(teamId, callback, level) {
    const constraints = [
        (0, firestore_1.where)('teamId', '==', teamId),
        (0, firestore_1.orderBy)('createdAt', 'desc')
    ];
    if (level) {
        constraints.unshift((0, firestore_1.where)('level', '==', level));
    }
    const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'plays'), ...constraints);
    return (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const plays = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        callback(plays);
    });
}
exports.subscribeToPlays = subscribeToPlays;
function subscribeToPlayers(teamId, callback) {
    const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'players'), (0, firestore_1.where)('teamId', '==', teamId), (0, firestore_1.orderBy)('lastName', 'asc'));
    return (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const players = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        callback(players);
    });
}
exports.subscribeToPlayers = subscribeToPlayers;
function subscribeToTeams(callback) {
    const currentUser = getCurrentUser();
    const q = (0, firestore_1.query)((0, firestore_1.collection)(db, 'teams'), (0, firestore_1.where)('coachIds', 'array-contains', currentUser.uid), (0, firestore_1.orderBy)('createdAt', 'desc'));
    return (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const teams = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        callback(teams);
    });
}
exports.subscribeToTeams = subscribeToTeams;
// ============================================
// UTILITY FUNCTIONS
// ============================================
function isOffline() {
    return !isOnline;
}
exports.isOffline = isOffline;
function getOfflineQueueSize() {
    return offlineQueue.length;
}
exports.getOfflineQueueSize = getOfflineQueueSize;
function getMaxQueueSize() {
    return 100; // Maximum number of offline operations to queue
}
exports.getMaxQueueSize = getMaxQueueSize;
function migrateFromLocalStorage(teamId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Implementation for migrating data from localStorage to Firestore
            // This would be used when upgrading from a local-only version
            return true;
        }
        catch (error) {
            console.error('Migration failed:', error);
            return false;
        }
    });
}
exports.migrateFromLocalStorage = migrateFromLocalStorage;
