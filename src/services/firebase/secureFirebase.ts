/**
 * Secure Firebase Service
 * - Environment-based configuration
 * - Emulator support for development
 * - Security validation and error handling
 * - Type-safe service access
 */

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging, Messaging, getToken } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';
import { getPerformance, Performance } from 'firebase/performance';
import { getRemoteConfig, RemoteConfig } from 'firebase/remote-config';

import { getEnvironmentConfig, isDevelopment, isProduction } from '../../config/environment';

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  messaging: Messaging | null;
  analytics: Analytics | null;
  performance: Performance | null;
  remoteConfig: RemoteConfig | null;
}

class SecureFirebaseService {
  private services: FirebaseServices | null = null;
  private initialized = false;
  private initializationPromise: Promise<FirebaseServices> | null = null;

  /**
   * Initialize Firebase with secure configuration
   */
  async initialize(): Promise<FirebaseServices> {
    if (this.services) {
      return this.services;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<FirebaseServices> {
    try {
      console.log('🔧 Initializing Firebase with secure configuration...');

      // Get environment configuration
      const config = getEnvironmentConfig();
      const firebaseConfig = config.FIREBASE;

      // Validate Firebase configuration
      this.validateFirebaseConfig(firebaseConfig);

      // Initialize Firebase app
      const app = this.initializeApp(firebaseConfig);

      // Initialize services
      const services = await this.initializeServices(app, config);

      // Connect to emulators if in development
      if (config.DEVELOPMENT.useEmulator) {
        await this.connectToEmulators(services);
      }

      this.services = services;
      this.initialized = true;

      console.log('✅ Firebase initialized successfully');
      return services;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate Firebase configuration
   */
  private validateFirebaseConfig(config: any): void {
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
  private initializeApp(firebaseConfig: any): FirebaseApp {
    // Check if app is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log('📱 Using existing Firebase app');
      return existingApps[0];
    }

    // Initialize new app
    console.log('🚀 Creating new Firebase app');
    return initializeApp(firebaseConfig);
  }

  /**
   * Initialize Firebase services
   */
  private async initializeServices(app: FirebaseApp, config: any): Promise<FirebaseServices> {
    const services: FirebaseServices = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
      messaging: null,
      analytics: null,
      performance: null,
      remoteConfig: null,
    };

    // Initialize messaging (browser only)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        services.messaging = getMessaging(app);
        console.log('📱 Firebase messaging initialized');
      } catch (error) {
        console.warn('⚠️ Firebase messaging initialization failed:', error);
      }
    }

    // Initialize analytics (production only)
    if (isProduction() && config.MONITORING.enableAnalytics) {
      try {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          services.analytics = getAnalytics(app);
          console.log('📊 Firebase analytics initialized');
        }
      } catch (error) {
        console.warn('⚠️ Firebase analytics initialization failed:', error);
      }
    }

    // Initialize performance monitoring
    if (isProduction()) {
      try {
        services.performance = getPerformance(app);
        console.log('⚡ Firebase performance monitoring initialized');
      } catch (error) {
        console.warn('⚠️ Firebase performance monitoring initialization failed:', error);
      }
    }

    // Initialize remote config
    try {
      services.remoteConfig = getRemoteConfig(app);
      console.log('⚙️ Firebase remote config initialized');
    } catch (error) {
      console.warn('⚠️ Firebase remote config initialization failed:', error);
    }

    return services;
  }

  /**
   * Connect to Firebase emulators
   */
  private async connectToEmulators(services: FirebaseServices): Promise<void> {
    if (!isDevelopment()) {
      return;
    }

    console.log('🔧 Connecting to Firebase emulators...');

    try {
      // Connect to Auth emulator
      connectAuthEmulator(services.auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('✅ Connected to Auth emulator');

      // Connect to Firestore emulator
      connectFirestoreEmulator(services.db, 'localhost', 8080);
      console.log('✅ Connected to Firestore emulator');

      // Connect to Storage emulator
      connectStorageEmulator(services.storage, 'localhost', 9199);
      console.log('✅ Connected to Storage emulator');
    } catch (error) {
      console.error('❌ Failed to connect to emulators:', error);
      throw error;
    }
  }

  /**
   * Get Firebase services
   */
  async getServices(): Promise<FirebaseServices> {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.services!;
  }

  /**
   * Get specific service
   */
  async getAuth(): Promise<Auth> {
    const services = await this.getServices();
    return services.auth;
  }

  async getFirestore(): Promise<Firestore> {
    const services = await this.getServices();
    return services.db;
  }

  async getStorage(): Promise<FirebaseStorage> {
    const services = await this.getServices();
    return services.storage;
  }

  async getMessaging(): Promise<Messaging | null> {
    const services = await this.getServices();
    return services.messaging;
  }

  async getAnalytics(): Promise<Analytics | null> {
    const services = await this.getServices();
    return services.analytics;
  }

  async getPerformance(): Promise<Performance | null> {
    const services = await this.getServices();
    return services.performance;
  }

  async getRemoteConfig(): Promise<RemoteConfig | null> {
    const services = await this.getServices();
    return services.remoteConfig;
  }

  /**
   * Get messaging token
   */
  async getMessagingToken(): Promise<string | null> {
    try {
      const messaging = await this.getMessaging();
      if (!messaging) {
        return null;
      }

      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_VAPID_KEY,
      });

      return token;
    } catch (error) {
      console.error('Failed to get messaging token:', error);
      return null;
    }
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset Firebase service (for testing)
   */
  reset(): void {
    this.services = null;
    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Get configuration info (for debugging)
   */
  getConfigInfo(): any {
    if (!this.services) {
      return { initialized: false };
    }

    const config = getEnvironmentConfig();
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
export default secureFirebase;

// Export convenience functions
export const getSecureAuth = () => secureFirebase.getAuth();
export const getSecureFirestore = () => secureFirebase.getFirestore();
export const getSecureStorage = () => secureFirebase.getStorage();
export const getSecureMessaging = () => secureFirebase.getMessaging();
export const getSecureAnalytics = () => secureFirebase.getAnalytics();
export const getSecurePerformance = () => secureFirebase.getPerformance();
export const getSecureRemoteConfig = () => secureFirebase.getRemoteConfig();
export const getSecureMessagingToken = () => secureFirebase.getMessagingToken();

// Export types
export type { FirebaseServices }; 