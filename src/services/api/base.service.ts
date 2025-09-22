import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

export abstract class BaseFirestoreService<T extends DocumentData> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected get collection() {
    return collection(db, this.collectionName);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.collection, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc => ({ id: doc.id, ...(doc.data() as any) }) as unknown as T
    );
  }

  async getById(id: string): Promise<T | null> {
    const docRef = doc(this.collection, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists()
      ? ({ id: snapshot.id, ...(snapshot.data() as any) } as unknown as T)
      : null;
  }

  async create(data: WithFieldValue<T>): Promise<string> {
    const docRef = doc(this.collection) as any;
    await setDoc(docRef, data);
    return docRef.id;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(this.collection, id) as any;
    await updateDoc(docRef, data as any);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.collection, id);
    await deleteDoc(docRef);
  }
}
