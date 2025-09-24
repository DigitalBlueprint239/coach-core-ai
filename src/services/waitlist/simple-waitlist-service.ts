import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

export class SimpleWaitlistService {
  private readonly collectionName = 'waitlist';

  async addToWaitlist(email: string, source: string = 'website'): Promise<string> {
    try {
      // Basic validation
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Check if already exists
      const isDuplicate = await this.isEmailOnWaitlist(cleanEmail);
      if (isDuplicate) {
        throw new Error('This email is already on our waitlist!');
      }

      // Add to Firestore
      const docRef = await addDoc(collection(db, this.collectionName), {
        email: cleanEmail,
        source,
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      return docRef.id;
    } catch (error: any) {
      throw error;
    }
  }

  private async isEmailOnWaitlist(email: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('email', '==', email)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch {
      return false; // If check fails, allow signup
    }
  }
}

export const simpleWaitlistService = new SimpleWaitlistService();
