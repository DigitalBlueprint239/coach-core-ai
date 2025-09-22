import {
  doc,
  Firestore,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

export async function enrichWaitlistMetadataTestHelper(
  db: Firestore,
  id: string,
  meta?: { ipAddress?: string; userAgent?: string; source?: string; batchProcessed?: boolean }
) {
  const ref = doc(db, 'waitlistMetadata', id);
  await setDoc(ref, {
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
    source: meta?.source ?? null,
    batchProcessed: meta?.batchProcessed ?? null,
    capturedAt: serverTimestamp(),
  });
}

