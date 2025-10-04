import '@testing-library/jest-dom';

// Mock environment variables for tests (both VITE_* and REACT_APP_* for compatibility)
const testEnvVars = {
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef',
  VITE_OPENAI_API_KEY: 'test-openai-key',
  VITE_CLAUDE_API_KEY: 'test-claude-key',
  VITE_AI_PROXY_TOKEN: 'test-proxy-token',
  // Legacy REACT_APP_* variables for backward compatibility
  REACT_APP_FIREBASE_API_KEY: 'test-api-key',
  REACT_APP_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  REACT_APP_FIREBASE_PROJECT_ID: 'test-project',
  REACT_APP_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  REACT_APP_FIREBASE_APP_ID: '1:123456789:web:abcdef',
  REACT_APP_OPENAI_API_KEY: 'test-openai-key',
  REACT_APP_CLAUDE_API_KEY: 'test-claude-key',
  REACT_APP_AI_PROXY_TOKEN: 'test-proxy-token',
};

// Set all environment variables
Object.entries(testEnvVars).forEach(([key, value]) => {
  process.env[key] = value;
  import.meta.env[key] = value;
});

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));
