"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// This test assumes you are running the Functions + Firestore emulators:
//   cd functions && npm run build && npm run serve
// Then, in another terminal: cd functions && npm test
(0, vitest_1.describe)('onWaitlistCreate trigger (emulator)', () => {
    const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
    let db;
    (0, vitest_1.beforeAll)(() => {
        process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
        (0, app_1.initializeApp)({ projectId: 'demo-test' });
        db = (0, firestore_1.getFirestore)();
    });
    (0, vitest_1.afterAll)(async () => {
        await db.terminate();
    });
    (0, vitest_1.it)('writes waitlistMetadata/{id} when waitlist/{id} is created', async () => {
        const id = `test_${Date.now()}`;
        const waitlistRef = db.collection('waitlist').doc(id);
        await waitlistRef.set({
            email: 'test@example.com',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Poll for metadata doc up to ~5s
        const metaRef = db.collection('waitlistMetadata').doc(id);
        const start = Date.now();
        while (Date.now() - start < 5000) {
            const snap = await metaRef.get();
            if (snap.exists) {
                const data = snap.data() || {};
                (0, vitest_1.expect)(data.capturedAt).toBeDefined();
                return;
            }
            await new Promise(r => setTimeout(r, 200));
        }
        throw new Error('waitlistMetadata doc not found within timeout');
    });
});
