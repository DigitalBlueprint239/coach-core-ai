import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase/firebase-config';
import {
  ImportedAsset,
  importedAssetSchema,
} from '../domain';

const COLLECTION = 'importedAssets';

const assetsCollection = collection(db, COLLECTION);

const convertTimestamp = (value: Timestamp | Date | undefined | null) => {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return value;
};

const fromFirestore = (docSnapshot: any): ImportedAsset => {
  const data = docSnapshot.data();
  const normalized = {
    id: docSnapshot.id,
    userId: data.userId,
    provider: data.provider,
    assetType: data.assetType,
    sourceUrl: data.sourceUrl,
    meta: {
      ...data.meta,
      timestamp: convertTimestamp(data.meta?.timestamp),
    },
    aiTags: data.aiTags ?? [],
    fingerprint: data.fingerprint,
    createdAt: convertTimestamp(data.createdAt),
  };

  return importedAssetSchema.parse(normalized);
};

const toFirestore = (asset: ImportedAsset) => ({
  userId: asset.userId,
  provider: asset.provider,
  assetType: asset.assetType,
  sourceUrl: asset.sourceUrl,
  meta: {
    ...asset.meta,
    timestamp: asset.meta?.timestamp
      ? Timestamp.fromDate(asset.meta.timestamp)
      : undefined,
  },
  aiTags: asset.aiTags,
  fingerprint: asset.fingerprint,
  createdAt: asset.createdAt ? Timestamp.fromDate(asset.createdAt) : Timestamp.now(),
});

export const findAssetByFingerprint = async (
  userId: string,
  fingerprint: string
): Promise<ImportedAsset | null> => {
  const q = query(
    assetsCollection,
    where('userId', '==', userId),
    where('fingerprint', '==', fingerprint)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  return fromFirestore(snapshot.docs[0]);
};

export const saveImportedAsset = async (asset: ImportedAsset): Promise<string> => {
  const parsed = importedAssetSchema.parse(asset);
  const ref = doc(db, COLLECTION, parsed.id);
  await setDoc(ref, toFirestore(parsed), { merge: true });
  return parsed.id;
};
