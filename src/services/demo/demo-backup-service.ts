import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

export interface DemoBackupData {
  id?: string;
  sessionId: string;
  userData: {
    email: string;
    name: string;
    role: string;
  };
  appData: {
    plays: any[];
    practicePlans: any[];
    teamData: any;
    games: any[];
    settings: any;
  };
  createdAt: Date;
  expiresAt: Date;
  lastAccessed: Date;
}

export class DemoBackupService {
  private readonly collectionName = 'demo_backups';
  private readonly maxBackupsPerUser = 3; // Keep only 3 most recent backups
  private readonly backupExpiryDays = 7; // Auto-delete after 7 days

  /**
   * Backup demo data to Firestore
   */
  async backupDemoData(sessionId: string, userData: any, appData: any): Promise<string> {
    try {
      const backupData: Omit<DemoBackupData, 'id'> = {
        sessionId,
        userData: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
        },
        appData: {
          plays: appData.plays || [],
          practicePlans: appData.practicePlans || [],
          teamData: appData.teamData || {},
          games: appData.games || [],
          settings: appData.settings || {},
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.backupExpiryDays * 24 * 60 * 60 * 1000),
        lastAccessed: new Date(),
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...backupData,
        createdAt: serverTimestamp(),
        expiresAt: serverTimestamp(),
        lastAccessed: serverTimestamp(),
      });

      // Clean up old backups for this user
      await this.cleanupOldBackups(userData.email);

      console.log('✅ Demo data backed up successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to backup demo data:', error);
      throw new Error('Failed to backup demo data');
    }
  }

  /**
   * Restore demo data from Firestore
   */
  async restoreDemoData(sessionId: string): Promise<DemoBackupData | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('sessionId', '==', sessionId),
        orderBy('lastAccessed', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data() as DemoBackupData;
      
      // Update last accessed time
      await this.updateLastAccessed(doc.id);

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        lastAccessed: data.lastAccessed.toDate(),
      };
    } catch (error) {
      console.error('❌ Failed to restore demo data:', error);
      return null;
    }
  }

  /**
   * Get all backups for a user
   */
  async getUserBackups(email: string): Promise<DemoBackupData[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userData.email', '==', email),
        orderBy('lastAccessed', 'desc')
      );

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        expiresAt: doc.data().expiresAt.toDate(),
        lastAccessed: doc.data().lastAccessed.toDate(),
      })) as DemoBackupData[];
    } catch (error) {
      console.error('❌ Failed to get user backups:', error);
      return [];
    }
  }

  /**
   * Delete expired backups
   */
  async cleanupExpiredBackups(): Promise<number> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collectionName),
        where('expiresAt', '<', now)
      );

      const querySnapshot = await getDocs(q);
      let deletedCount = 0;

      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, this.collectionName, docSnapshot.id));
        deletedCount++;
      }

      console.log(`✅ Cleaned up ${deletedCount} expired demo backups`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup expired backups:', error);
      return 0;
    }
  }

  /**
   * Clean up old backups for a specific user
   */
  private async cleanupOldBackups(email: string): Promise<void> {
    try {
      const backups = await this.getUserBackups(email);
      
      if (backups.length > this.maxBackupsPerUser) {
        const backupsToDelete = backups.slice(this.maxBackupsPerUser);
        
        for (const backup of backupsToDelete) {
          if (backup.id) {
            await deleteDoc(doc(db, this.collectionName, backup.id));
          }
        }
        
        console.log(`✅ Cleaned up ${backupsToDelete.length} old backups for ${email}`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old backups:', error);
    }
  }

  /**
   * Update last accessed time for a backup
   */
  private async updateLastAccessed(backupId: string): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionName), {
        lastAccessed: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Failed to update last accessed time:', error);
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{ total: number; expired: number; active: number }> {
    try {
      const allBackups = await getDocs(collection(db, this.collectionName));
      const now = new Date();
      
      let expired = 0;
      let active = 0;

      allBackups.forEach(doc => {
        const data = doc.data();
        if (data.expiresAt.toDate() < now) {
          expired++;
        } else {
          active++;
        }
      });

      return {
        total: allBackups.size,
        expired,
        active,
      };
    } catch (error) {
      console.error('❌ Failed to get backup stats:', error);
      return { total: 0, expired: 0, active: 0 };
    }
  }
}

export const demoBackupService = new DemoBackupService();
export default demoBackupService;

