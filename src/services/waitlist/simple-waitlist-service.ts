import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { isEmailOnWaitlist } from './waitlist-duplicate-checker';

export class SimpleWaitlistService {
  private readonly collectionName = 'waitlist';

  async addToWaitlist(
    email: string,
    source: string = 'website',
    metadata: Record<string, unknown> = {}
  ): Promise<string> {
    // Basic validation
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    // Check if already exists
    const isDuplicate = await isEmailOnWaitlist(cleanEmail);
    if (isDuplicate) {
      throw new Error('This email is already on our waitlist!');
    }

    // Add to Firestore
    const docRef = await addDoc(collection(db, this.collectionName), {
      email: cleanEmail,
      source,
      createdAt: serverTimestamp(),
      status: 'pending',
      ...metadata,
    });

    return docRef.id;
  }

}

export const simpleWaitlistService = new SimpleWaitlistService();
