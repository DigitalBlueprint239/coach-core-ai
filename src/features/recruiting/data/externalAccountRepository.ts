import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase/firebase-config';
import {
  ExternalAccount,
  externalAccountSchema,
} from '../domain';

const COLLECTION = 'externalAccounts';

const accountsCollection = collection(db, COLLECTION);

const convertTimestamp = (value: Timestamp | Date | undefined | null) => {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return value;
};

const fromFirestore = (snapshot: any): ExternalAccount => {
  const data = snapshot.data();
  const normalized = {
    id: snapshot.id,
    userId: data.userId,
    provider: data.provider,
    handleOrId: data.handleOrId,
    auth: data.auth
      ? {
          ...data.auth,
          expiresAt: convertTimestamp(data.auth.expiresAt),
        }
      : undefined,
    lastSyncAt: convertTimestamp(data.lastSyncAt),
    syncStatus: data.syncStatus ?? 'ok',
    error: data.error
      ? {
          ...data.error,
          occurredAt: convertTimestamp(data.error.occurredAt),
        }
      : undefined,
  };

  return externalAccountSchema.parse(normalized);
};

const toFirestore = (account: ExternalAccount) => {
  const payload: Record<string, unknown> = {
    userId: account.userId,
    provider: account.provider,
    handleOrId: account.handleOrId,
    syncStatus: account.syncStatus,
  };

  if (account.auth) {
    payload.auth = {
      ...account.auth,
      expiresAt: account.auth.expiresAt
        ? Timestamp.fromDate(account.auth.expiresAt)
        : undefined,
    };
  }

  if (account.lastSyncAt) {
    payload.lastSyncAt = Timestamp.fromDate(account.lastSyncAt);
  }

  if (account.error) {
    payload.error = {
      ...account.error,
      occurredAt: Timestamp.fromDate(account.error.occurredAt),
    };
  }

  return payload;
};

export const generateExternalAccountId = (userId: string, provider: string) =>
  `${userId}_${provider}`;

export const getExternalAccount = async (
  userId: string,
  provider: ExternalAccount['provider']
): Promise<ExternalAccount | null> => {
  const q = query(
    accountsCollection,
    where('userId', '==', userId),
    where('provider', '==', provider)
  );

  const snapshot = await getDocs(q);
  const docSnap = snapshot.docs[0];

  if (!docSnap) {
    return null;
  }

  return fromFirestore(docSnap);
};

export const saveExternalAccount = async (
  account: ExternalAccount
): Promise<void> => {
  const accountId = account.id || generateExternalAccountId(account.userId, account.provider);
  const ref = doc(db, COLLECTION, accountId);

  await setDoc(ref, toFirestore({ ...account, id: accountId }), { merge: true });
};

export const deleteExternalAccount = async (accountId: string): Promise<void> => {
  const ref = doc(db, COLLECTION, accountId);
  await deleteDoc(ref);
};
