"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebase = void 0;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const messaging_1 = require("firebase/messaging");
const analytics_1 = require("firebase/analytics");
class FirebaseService {
    constructor() {
        this.messaging = null;
        this.analytics = null;
        const config = {
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.REACT_APP_FIREBASE_APP_ID,
        };
        this.app = (0, app_1.initializeApp)(config);
        this.auth = (0, auth_1.getAuth)(this.app);
        this.db = (0, firestore_1.getFirestore)(this.app);
        this.storage = (0, storage_1.getStorage)(this.app);
        // Initialize messaging only if supported
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.messaging = (0, messaging_1.getMessaging)(this.app);
        }
        // Initialize analytics in production
        if (process.env.NODE_ENV === 'production') {
            this.analytics = (0, analytics_1.getAnalytics)(this.app);
        }
    }
}
exports.firebase = new FirebaseService();
