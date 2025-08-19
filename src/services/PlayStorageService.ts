import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase/firebase-config';

export interface PlayData {
  id: string;
  name: string;
  description: string;
  formation: string;
  fieldType: '11v11' | '7v7' | '5v5';
  players: Array<{
    id: string;
    position: string;
    number: number;
    team: 'offense' | 'defense';
    x: number;
    y: number;
    isKey?: boolean;
  }>;
  routes: Array<{
    id: string;
    playerId: string;
    points: Array<{ x: number; y: number; timestamp: number }>;
    type: 'run' | 'pass' | 'block' | 'custom';
    color: string;
    strokeWidth: number;
    dash: number[];
    tension: number;
    arrow: boolean;
  }>;
  notes: string;
  category: string;
  tags: string[];
  coachId: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  isPublic: boolean;
  thumbnail?: string;
}

export class PlayStorageService {
  private db: any;
  private localDB: IDBDatabase | null = null;

  constructor() {
    this.db = db;
    this.initLocalDB();
  }

  // Initialize IndexedDB for offline storage
  private async initLocalDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CoachCorePlays', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.localDB = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('plays')) {
          const playStore = db.createObjectStore('plays', {
            keyPath: 'id',
            autoIncrement: false
          });

          playStore.createIndex('category', 'category', { unique: false });
          playStore.createIndex('formation', 'formation', { unique: false });
          playStore.createIndex('teamId', 'teamId', { unique: false });
          playStore.createIndex('coachId', 'coachId', { unique: false });
          playStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // Save play to both local and cloud storage
  async savePlay(playData: PlayData): Promise<PlayData> {
    try {
      // Prepare play data for storage
      const play = {
        ...playData,
        timestamp: Date.now(),
        version: '1.0',
        updatedAt: new Date()
      };

      // Save locally first
      await this.saveLocal(play);

      // Try to save to cloud if online
      if (navigator.onLine) {
        try {
          await this.saveToCloud(play);
        } catch (cloudError) {
          console.warn('Failed to save to cloud, keeping local copy:', cloudError);
          // Queue for later sync
          await this.queueForSync(play);
        }
      } else {
        // Queue for later sync when online
        await this.queueForSync(play);
      }

      return play;
    } catch (error) {
      console.error('Error saving play:', error);
      throw error;
    }
  }

  // Save to local IndexedDB
  private async saveLocal(play: PlayData): Promise<void> {
    if (!this.localDB) {
      await this.initLocalDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.localDB!.transaction(['plays'], 'readwrite');
      const store = transaction.objectStore('plays');
      const request = store.put(play);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save to Firebase Cloud
  private async saveToCloud(play: PlayData): Promise<void> {
    const playRef = doc(db, 'plays', play.id);
    await setDoc(playRef, {
      ...play,
      createdAt: play.createdAt.toISOString(),
      updatedAt: play.updatedAt.toISOString()
    });
  }

  // Queue play for later sync when offline
  private async queueForSync(play: PlayData): Promise<void> {
    const syncQueue = JSON.parse(localStorage.getItem('playSyncQueue') || '[]');
    syncQueue.push({
      ...play,
      syncType: 'save',
      timestamp: Date.now()
    });
    localStorage.setItem('playSyncQueue', JSON.stringify(syncQueue));
  }

  // Load play from storage
  async loadPlay(playId: string): Promise<PlayData | null> {
    try {
      // Try local first for speed
      const localPlay = await this.loadLocal(playId);
      if (localPlay) {
        return localPlay;
      }

      // Fall back to cloud
      if (navigator.onLine) {
        const cloudPlay = await this.loadFromCloud(playId);
        if (cloudPlay) {
          // Cache locally
          await this.saveLocal(cloudPlay);
          return cloudPlay;
        }
      }

      return null;
    } catch (error) {
      console.error('Error loading play:', error);
      return null;
    }
  }

  // Load from local storage
  private async loadLocal(playId: string): Promise<PlayData | null> {
    if (!this.localDB) {
      await this.initLocalDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.localDB!.transaction(['plays'], 'readonly');
      const store = transaction.objectStore('plays');
      const request = store.get(playId);

      request.onsuccess = () => {
        const play = request.result;
        if (play) {
          // Convert ISO strings back to Date objects
          play.createdAt = new Date(play.createdAt);
          play.updatedAt = new Date(play.updatedAt);
        }
        resolve(play || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Load from cloud
  private async loadFromCloud(playId: string): Promise<PlayData | null> {
    const playDoc = await getDoc(doc(db, 'plays', playId));
    if (playDoc.exists()) {
      const data = playDoc.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      } as PlayData;
    }
    return null;
  }

  // Get all plays for a coach/team
  async getPlays(filters: {
    coachId?: string;
    teamId?: string;
    category?: string;
    formation?: string;
    limit?: number;
  }): Promise<PlayData[]> {
    try {
      const plays: PlayData[] = [];

      // Try local first
      const localPlays = await this.getLocalPlays(filters);
      plays.push(...localPlays);

      // If online, try to get more from cloud
      if (navigator.onLine) {
        try {
          const cloudPlays = await this.getCloudPlays(filters);
          // Merge and deduplicate
          const existingIds = new Set(plays.map(p => p.id));
          cloudPlays.forEach(play => {
            if (!existingIds.has(play.id)) {
              plays.push(play);
              existingIds.add(play.id);
            }
          });
        } catch (cloudError) {
          console.warn('Failed to load from cloud:', cloudError);
        }
      }

      // Sort by updated date
      return plays.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error getting plays:', error);
      return [];
    }
  }

  // Get plays from local storage
  private async getLocalPlays(filters: any): Promise<PlayData[]> {
    if (!this.localDB) {
      await this.initLocalDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.localDB!.transaction(['plays'], 'readonly');
      const store = transaction.objectStore('plays');
      const request = store.getAll();

      request.onsuccess = () => {
        let plays = request.result || [];
        
        // Apply filters
        if (filters.coachId) {
          plays = plays.filter(p => p.coachId === filters.coachId);
        }
        if (filters.teamId) {
          plays = plays.filter(p => p.teamId === filters.teamId);
        }
        if (filters.category) {
          plays = plays.filter(p => p.category === filters.category);
        }
        if (filters.formation) {
          plays = plays.filter(p => p.formation === filters.formation);
        }

        // Convert dates
        plays.forEach(play => {
          play.createdAt = new Date(play.createdAt);
          play.updatedAt = new Date(play.updatedAt);
        });

        resolve(plays);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get plays from cloud
  private async getCloudPlays(filters: any): Promise<PlayData[]> {
    let q = collection(db, 'plays');

    if (filters.coachId) {
      q = query(q, where('coachId', '==', filters.coachId));
    }
    if (filters.teamId) {
      q = query(q, where('teamId', '==', filters.teamId));
    }
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.formation) {
      q = query(q, where('formation', '==', filters.formation));
    }

    const querySnapshot = await getDocs(q);
    const plays: PlayData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      plays.push({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      } as PlayData);
    });

    return plays;
  }

  // Delete play
  async deletePlay(playId: string): Promise<void> {
    try {
      // Delete from local storage
      await this.deleteLocal(playId);

      // Try to delete from cloud
      if (navigator.onLine) {
        try {
          await deleteDoc(doc(db, 'plays', playId));
        } catch (cloudError) {
          console.warn('Failed to delete from cloud:', cloudError);
          // Queue for later sync
          await this.queueForSync({ id: playId } as any);
        }
      } else {
        // Queue for later sync
        await this.queueForSync({ id: playId } as any);
      }
    } catch (error) {
      console.error('Error deleting play:', error);
      throw error;
    }
  }

  // Delete from local storage
  private async deleteLocal(playId: string): Promise<void> {
    if (!this.localDB) {
      await this.initLocalDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.localDB!.transaction(['plays'], 'readwrite');
      const store = transaction.objectStore('plays');
      const request = store.delete(playId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync offline changes when back online
  async syncOfflineChanges(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const syncQueue = JSON.parse(localStorage.getItem('playSyncQueue') || '[]');
      
      for (const item of syncQueue) {
        try {
          if (item.syncType === 'save') {
            await this.saveToCloud(item);
          } else if (item.syncType === 'delete') {
            await deleteDoc(doc(db, 'plays', item.id));
          }
        } catch (error) {
          console.error('Failed to sync item:', item, error);
        }
      }

      // Clear sync queue
      localStorage.removeItem('playSyncQueue');
    } catch (error) {
      console.error('Error syncing offline changes:', error);
    }
  }

  // Compress play data for efficient storage
  compressPlayData(data: any): any {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      formation: data.formation,
      fieldType: data.fieldType,
      players: data.players.map((p: any) => ({
        id: p.id,
        pos: p.position,
        num: p.number,
        t: p.team,
        x: Math.round(p.x),
        y: Math.round(p.y),
        k: p.isKey ? 1 : 0
      })),
      routes: data.routes.map((r: any) => ({
        pid: r.playerId,
        pts: r.points.map((p: any) => [Math.round(p.x), Math.round(p.y)]),
        t: r.type,
        c: r.color,
        sw: r.strokeWidth,
        d: r.dash,
        tn: r.tension,
        a: r.arrow ? 1 : 0
      })),
      notes: data.notes,
      category: data.category,
      tags: data.tags,
      coachId: data.coachId,
      teamId: data.teamId,
      createdAt: data.createdAt.getTime(),
      updatedAt: data.updatedAt.getTime(),
      version: data.version,
      isPublic: data.isPublic ? 1 : 0
    };
  }

  // Decompress play data
  decompressPlayData(compressed: any): any {
    return {
      id: compressed.id,
      name: compressed.name,
      description: compressed.description,
      formation: compressed.formation,
      fieldType: compressed.fieldType,
      players: compressed.players.map((p: any) => ({
        id: p.id,
        position: p.pos,
        number: p.num,
        team: p.t,
        x: p.x,
        y: p.y,
        isKey: p.k === 1
      })),
      routes: compressed.routes.map((r: any) => ({
        id: r.id || `route-${Date.now()}`,
        playerId: r.pid,
        points: r.pts.map((p: any) => ({ x: p[0], y: p[1], timestamp: Date.now() })),
        type: r.t,
        color: r.c,
        strokeWidth: r.sw,
        dash: r.d,
        tension: r.tn,
        arrow: r.a === 1
      })),
      notes: compressed.notes,
      category: compressed.category,
      tags: compressed.tags,
      coachId: compressed.coachId,
      teamId: compressed.teamId,
      createdAt: new Date(compressed.createdAt),
      updatedAt: new Date(compressed.updatedAt),
      version: compressed.version,
      isPublic: compressed.isPublic === 1
    };
  }
}

export default PlayStorageService;


