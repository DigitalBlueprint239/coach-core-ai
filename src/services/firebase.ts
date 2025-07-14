import { initializeApp } from 'firebase/app';
// The following imports may cause errors if the Firebase modules are not installed or available.
// To fix, ensure you have installed the required Firebase packages:
// npm install firebase
// If you only need certain services, you can comment out unused imports.

import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from 'firebase/analytics';

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics }; 