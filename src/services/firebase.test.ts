import { getFirebaseServices } from '../firebase';

describe('Firebase lazy initialization', () => {
  it('getFirebaseServices() returns the same instance on repeated calls', async () => {
    const first = await getFirebaseServices();
    const second = await getFirebaseServices();
    // Same promise / same instance
    expect(first.app).toBe(second.app);
    expect(first.auth).toBe(second.auth);
    expect(first.db).toBe(second.db);
  });

  it('getFirebaseServices() returns an object with app, auth, db, storage', async () => {
    const services = await getFirebaseServices();
    expect(services).toHaveProperty('app');
    expect(services).toHaveProperty('auth');
    expect(services).toHaveProperty('db');
    expect(services).toHaveProperty('storage');
  });
});
