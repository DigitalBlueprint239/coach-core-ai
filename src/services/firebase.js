"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analytics = exports.db = exports.auth = exports.app = void 0;
const app_1 = require("firebase/app");
// The following imports may cause errors if the Firebase modules are not installed or available.
// To fix, ensure you have installed the required Firebase packages:
// npm install firebase
// If you only need certain services, you can comment out unused imports.
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const analytics_1 = require("firebase/analytics");
const firebaseConfig = {
    apiKey: "AIzaSyB2iWL0UkuLJYpr-II9IpwGWDOMnLcfq_c",
    authDomain: "coach-core-ai.firebaseapp.com",
    projectId: "coach-core-ai",
    storageBucket: "coach-core-ai.appspot.com",
    messagingSenderId: "384023691487",
    appId: "1:384023691487:web:931094d7a0da903d6e696a",
    measurementId: "G-02HW7QDJLY"
};
// Initialize Firebase
const app = (0, app_1.initializeApp)(firebaseConfig);
exports.app = app;
const auth = (0, auth_1.getAuth)(app);
exports.auth = auth;
const db = (0, firestore_1.getFirestore)(app);
exports.db = db;
const analytics = (0, analytics_1.getAnalytics)(app);
exports.analytics = analytics;
