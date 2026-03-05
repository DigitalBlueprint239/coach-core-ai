// Mock Firebase module for tests
export const auth = {
  onAuthStateChanged: (_callback: any) => () => {},
  currentUser: null,
};

export const db = {};

export const storage = {};

export const analytics = undefined;

export const app = {};
