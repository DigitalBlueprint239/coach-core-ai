"use strict";
/**
 * Secure Firebase Service
 * - Environment-based configuration
 * - Emulator support for development
 * - Security validation and error handling
 * - Type-safe service access
 */
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
exports.getSecureMessagingToken = exports.getSecureRemoteConfig = exports.getSecurePerformance = exports.getSecureAnalytics = exports.getSecureMessaging = exports.getSecureStorage = exports.getSecureFirestore = exports.getSecureAuth = void 0;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const messaging_1 = require("firebase/messaging");
const analytics_1 = require("firebase/analytics");
const performance_1 = require("firebase/performance");
const remote_config_1 = require("firebase/remote-config");
const environment_1 = require("../../config/environment");
class SecureFirebaseService {
    constructor() {
        this.services = null;
        this.initialized = false;
        this.initializationPromise = null;
    }
    /**
     * Initialize Firebase with secure configuration
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.services) {
                return this.services;
            }
            if (this.initializationPromise) {
                return this.initializationPromise;
            }
            this.initializationPromise = this.performInitialization();
            return this.initializationPromise;
        });
    }
    performInitialization() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔧 Initializing Firebase with secure configuration...');
                // Get environment configuration
                const config = (0, environment_1.getEnvironmentConfig)();
                const firebaseConfig = config.FIREBASE;
                // Validate Firebase configuration
                this.validateFirebaseConfig(firebaseConfig);
                // Initialize Firebase app
                const app = this.initializeApp(firebaseConfig);
                // Initialize services
                const services = yield this.initializeServices(app, config);
                // Connect to emulators if in development
                if (config.DEVELOPMENT.useEmulator) {
                    yield this.connectToEmulators(services);
                }
                this.services = services;
                this.initialized = true;
                console.log('✅ Firebase initialized successfully');
                return services;
            }
            catch (error) {
                console.error('❌ Firebase initialization failed:', error);
                throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Validate Firebase configuration
     */
    validateFirebaseConfig(config) {
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`Missing required Firebase configuration field: ${field}`);
            }
        }
        // Validate API key format
        if (!config.apiKey.startsWith('AIza')) {
            console.warn('⚠️ Firebase API key format appears invalid');
        }
        // Validate project ID format
        if (!/^[a-z0-9-]+$/.test(config.projectId)) {
            throw new Error('Invalid Firebase project ID format');
        }
    }
    /**
     * Initialize Firebase app
     */
    initializeApp(firebaseConfig) {
        // Check if app is already initialized
        const existingApps = (0, app_1.getApps)();
        if (existingApps.length > 0) {
            console.log('📱 Using existing Firebase app');
            return existingApps[0];
        }
        // Initialize new app
        console.log('🚀 Creating new Firebase app');
        return (0, app_1.initializeApp)(firebaseConfig);
    }
    /**
     * Initialize Firebase services
     */
    initializeServices(app, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const services = {
                app,
                auth: (0, auth_1.getAuth)(app),
                db: (0, firestore_1.getFirestore)(app),
                storage: (0, storage_1.getStorage)(app),
                messaging: null,
                analytics: null,
                performance: null,
                remoteConfig: null,
            };
            // Initialize messaging (browser only)
            if (typeof window !== 'undefined' && 'Notification' in window) {
                try {
                    services.messaging = (0, messaging_1.getMessaging)(app);
                    console.log('📱 Firebase messaging initialized');
                }
                catch (error) {
                    console.warn('⚠️ Firebase messaging initialization failed:', error);
                }
            }
            // Initialize analytics (production only)
            if ((0, environment_1.isProduction)() && config.MONITORING.enableAnalytics) {
                try {
                    const analyticsSupported = yield (0, analytics_1.isSupported)();
                    if (analyticsSupported) {
                        services.analytics = (0, analytics_1.getAnalytics)(app);
                        console.log('📊 Firebase analytics initialized');
                    }
                }
                catch (error) {
                    console.warn('⚠️ Firebase analytics initialization failed:', error);
                }
            }
            // Initialize performance monitoring
            if ((0, environment_1.isProduction)()) {
                try {
                    services.performance = (0, performance_1.getPerformance)(app);
                    console.log('⚡ Firebase performance monitoring initialized');
                }
                catch (error) {
                    console.warn('⚠️ Firebase performance monitoring initialization failed:', error);
                }
            }
            // Initialize remote config
            try {
                services.remoteConfig = (0, remote_config_1.getRemoteConfig)(app);
                console.log('⚙️ Firebase remote config initialized');
            }
            catch (error) {
                console.warn('⚠️ Firebase remote config initialization failed:', error);
            }
            return services;
        });
    }
    /**
     * Connect to Firebase emulators
     */
    connectToEmulators(services) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, environment_1.isDevelopment)()) {
                return;
            }
            console.log('🔧 Connecting to Firebase emulators...');
            try {
                // Connect to Auth emulator
                (0, auth_1.connectAuthEmulator)(services.auth, 'http://localhost:9099', { disableWarnings: true });
                console.log('✅ Connected to Auth emulator');
                // Connect to Firestore emulator
                (0, firestore_1.connectFirestoreEmulator)(services.db, 'localhost', 8080);
                console.log('✅ Connected to Firestore emulator');
                // Connect to Storage emulator
                (0, storage_1.connectStorageEmulator)(services.storage, 'localhost', 9199);
                console.log('✅ Connected to Storage emulator');
            }
            catch (error) {
                console.error('❌ Failed to connect to emulators:', error);
                throw error;
            }
        });
    }
    /**
     * Get Firebase services
     */
    getServices() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                return this.initialize();
            }
            return this.services;
        });
    }
    /**
     * Get specific service
     */
    getAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServices();
            return services.auth;
        });
    }
    getFirestore() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServices();
            return services.db;
        });
    }
    getStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServices();
            return services.storage;
        });
    }
    getMessaging() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServices();
            return services.messaging;
        });
    }
    getAnalytics() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServices();
            return services.analytics;
        });
    }
    getPerformance() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServices();
            return services.performance;
        });
    }
    getRemoteConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServices();
            return services.remoteConfig;
        });
    }
    /**
     * Get messaging token
     */
    getMessagingToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const messaging = yield this.getMessaging();
                if (!messaging) {
                    return null;
                }
                const token = yield (0, messaging_1.getToken)(messaging, {
                    vapidKey: process.env.REACT_APP_VAPID_KEY,
                });
                return token;
            }
            catch (error) {
                console.error('Failed to get messaging token:', error);
                return null;
            }
        });
    }
    /**
     * Check if Firebase is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Reset Firebase service (for testing)
     */
    reset() {
        this.services = null;
        this.initialized = false;
        this.initializationPromise = null;
    }
    /**
     * Get configuration info (for debugging)
     */
    getConfigInfo() {
        if (!this.services) {
            return { initialized: false };
        }
        const config = (0, environment_1.getEnvironmentConfig)();
        return {
            initialized: true,
            environment: config.ENVIRONMENT,
            projectId: config.FIREBASE.projectId,
            useEmulator: config.DEVELOPMENT.useEmulator,
            services: {
                auth: !!this.services.auth,
                firestore: !!this.services.db,
                storage: !!this.services.storage,
                messaging: !!this.services.messaging,
                analytics: !!this.services.analytics,
                performance: !!this.services.performance,
                remoteConfig: !!this.services.remoteConfig,
            },
        };
    }
}
// Create singleton instance
const secureFirebase = new SecureFirebaseService();
// Export singleton instance
exports.default = secureFirebase;
// Export convenience functions
const getSecureAuth = () => secureFirebase.getAuth();
exports.getSecureAuth = getSecureAuth;
const getSecureFirestore = () => secureFirebase.getFirestore();
exports.getSecureFirestore = getSecureFirestore;
const getSecureStorage = () => secureFirebase.getStorage();
exports.getSecureStorage = getSecureStorage;
const getSecureMessaging = () => secureFirebase.getMessaging();
exports.getSecureMessaging = getSecureMessaging;
const getSecureAnalytics = () => secureFirebase.getAnalytics();
exports.getSecureAnalytics = getSecureAnalytics;
const getSecurePerformance = () => secureFirebase.getPerformance();
exports.getSecurePerformance = getSecurePerformance;
const getSecureRemoteConfig = () => secureFirebase.getRemoteConfig();
exports.getSecureRemoteConfig = getSecureRemoteConfig;
const getSecureMessagingToken = () => secureFirebase.getMessagingToken();
exports.getSecureMessagingToken = getSecureMessagingToken;
