import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface Play {
  id: string;
  name: string;
  type: 'offense' | 'defense' | 'special';
  formation: string;
  personnel: string;
  down: number;
  distance: number;
  fieldPosition: number;
  players: any[];
  routes: any[];
  notes: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  userId?: string;
  teamId?: string;
}

export const playsService = {
  async savePlay(play: Play): Promise<Play> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const playData = {
      ...play,
      userId: user.uid,
      teamId: user.uid, // Using userId as teamId for now
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'plays', play.id), playData);
    return playData as Play;
  },

  async updatePlay(playId: string, updates: Partial<Play>): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(doc(db, 'plays', playId), updateData);
  },

  async getPlays(teamId?: string): Promise<Play[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const q = query(
      collection(db, 'plays'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Play[];
  },

  async getPlay(playId: string): Promise<Play | null> {
    const docRef = doc(db, 'plays', playId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Play;
    }
    return null;
  },

  async deletePlay(playId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // Verify ownership before deletion
    const play = await this.getPlay(playId);
    if (!play || play.userId !== user.uid) {
      throw new Error('Unauthorized to delete this play');
    }
    
    await deleteDoc(doc(db, 'plays', playId));
  },

  async getPlaysByType(type: 'offense' | 'defense' | 'special'): Promise<Play[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const q = query(
      collection(db, 'plays'),
      where('userId', '==', user.uid),
      where('type', '==', type),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Play[];
  },

  async getPlaysByFormation(formation: string): Promise<Play[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const q = query(
      collection(db, 'plays'),
      where('userId', '==', user.uid),
      where('formation', '==', formation),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Play[];
  },

  async searchPlays(searchTerm: string): Promise<Play[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // Get all plays and filter client-side for now
    // In production, you might want to use Algolia or similar for better search
    const allPlays = await this.getPlays();
    
    return allPlays.filter(play => 
      play.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      play.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      play.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  },

  async duplicatePlay(playId: string): Promise<Play> {
    const originalPlay = await this.getPlay(playId);
    if (!originalPlay) throw new Error('Play not found');
    
    const newPlay: Play = {
      ...originalPlay,
      id: `play-${Date.now()}`,
      name: `${originalPlay.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.savePlay(newPlay);
  },

  async sharePlay(playId: string, isPublic: boolean): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const play = await this.getPlay(playId);
    if (!play || play.userId !== user.uid) {
      throw new Error('Unauthorized to modify this play');
    }
    
    await this.updatePlay(playId, { isPublic });
  }
};

export default playsService; 