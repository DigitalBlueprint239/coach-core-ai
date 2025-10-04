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

  // Demo-related methods (simplified implementations)
  getCurrentDemoData(): any {
    // Return mock demo data for testing
    return {
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'coach',
      accessToken: 'demo-token-123',
    };
  }

  async upgradeToFullAccount(accessToken: string, password: string): Promise<{ user: any; profile: any }> {
    // Mock implementation for demo upgrade
    return {
      user: {
        uid: 'demo-user-123',
        email: 'demo@example.com',
      },
      profile: {
        id: 'demo-profile-123',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'coach',
      },
    };
  }

  // Additional methods that might be needed
  async getRemainingAttempts(email: string): Promise<number> {
    // Mock implementation - always return 3
    return 3;
  }

  async addToWaitlistWithAccess(data: {
    email: string;
    name: string;
    role: string;
    immediateAccess?: boolean;
  }): Promise<{ accessToken: string }> {
    // Add to waitlist and return access token
    await this.addToWaitlist(data.email, 'website', {
      name: data.name,
      role: data.role,
      immediateAccess: data.immediateAccess,
    });

    return {
      accessToken: `access-token-${Date.now()}`,
    };
  }
}

export const simpleWaitlistService = new SimpleWaitlistService();
