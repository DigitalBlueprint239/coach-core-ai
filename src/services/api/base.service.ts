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
import { firebase } from '@/services/firebase/config';

export abstract class BaseFirestoreService<T extends DocumentData> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected get collection() {
    return collection(firebase.db, this.collectionName);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.collection, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  async getById(id: string): Promise<T | null> {
    const docRef = doc(this.collection, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as T : null;
  }

  async create(data: WithFieldValue<T>): Promise<string> {
    const docRef = doc(this.collection);
    await setDoc(docRef, data);
    return docRef.id;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(this.collection, id);
    await updateDoc(docRef, data);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.collection, id);
    await deleteDoc(docRef);
  }
} 