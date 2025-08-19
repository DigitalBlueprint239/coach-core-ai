import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch, 
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase-config';

// Data Models
export interface Team {
  id: string;
  name: string;
  sport: 'football' | 'flag_football';
  ageGroup: 'u8' | 'u10' | 'u12' | 'u14' | 'jv' | 'varsity';
  season: string;
  organization: string;
  headCoachId: string;
  assistantCoachIds: string[];
  playerIds: string[];
  stats: {
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB' | 'K' | 'P';
  dateOfBirth: Date;
  grade: number;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalNotes: string;
  allergies: string;
  photoUrl?: string;
  isActive: boolean;
  stats: {
    gamesPlayed: number;
    totalYards: number;
    touchdowns: number;
    tackles: number;
    interceptions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PracticePlan {
  id: string;
  teamId: string;
  title: string;
  date: Date;
  duration: number; // minutes
  attendance: string[]; // player IDs
  drills: Array<{
    drillId: string;
    duration: number;
    notes: string;
    completed: boolean;
  }>;
  weatherConditions: string;
  coachNotes: string;
  objectives: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

export interface Game {
  id: string;
  teamId: string;
  opponent: string;
  date: Date;
  location: string;
  homeAway: 'home' | 'away';
  score: {
    us: number;
    them: number;
  };
  stats: {
    firstDowns: number;
    totalYards: number;
    passingYards: number;
    rushingYards: number;
    turnovers: number;
  };
  lineup: string[]; // player IDs
  playByPlay: Array<{
    quarter: number;
    time: string;
    down: number;
    distance: number;
    fieldPosition: number;
    play: string;
    result: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  teamId: string;
  practiceId?: string;
  gameId?: string;
  date: Date;
  records: Array<{
    playerId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes: string;
  }>;
  totalExpected: number;
  totalPresent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIInsight {
  id: string;
  teamId: string;
  type: 'performance' | 'strategy' | 'health' | 'tactical';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  isImplemented: boolean;
  priority: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

class DataService {
  private db = db;

  // Generic CRUD operations
  async create<T extends { id?: string }>(
    collectionName: string, 
    data: T, 
    customId?: string
  ): Promise<string> {
    try {
      const docRef = customId 
        ? doc(this.db, collectionName, customId)
        : doc(collection(this.db, collectionName));
      
      const docData = {
        ...data,
        id: docRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(docRef, docData);
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${collectionName}:`, error);
      throw new Error(`Failed to create ${collectionName}`);
    }
  }

  async get<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(this.db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting ${collectionName}:`, error);
      throw new Error(`Failed to get ${collectionName}`);
    }
  }

  async update<T>(
    collectionName: string, 
    id: string, 
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw new Error(`Failed to update ${collectionName}`);
    }
  }

  async delete(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      throw new Error(`Failed to delete ${collectionName}`);
    }
  }

  async query<T>(
    collectionName: string,
    constraints: Array<{ field: string; operator: any; value: any }> = [],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'asc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      let q = collection(this.db, collectionName);
      
      // Apply where constraints
      constraints.forEach(constraint => {
        q = query(q, where(constraint.field, constraint.operator, constraint.value));
      });
      
      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as T[];
    } catch (error) {
      console.error(`Error querying ${collectionName}:`, error);
      throw new Error(`Failed to query ${collectionName}`);
    }
  }

  // Batch operations for performance
  async batchOperation(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: any;
  }>): Promise<void> {
    try {
      const batch = writeBatch(this.db);
      
      operations.forEach(op => {
        if (op.type === 'create') {
          const docRef = op.id 
            ? doc(this.db, op.collection, op.id)
            : doc(collection(this.db, op.collection));
          batch.set(docRef, {
            ...op.data,
            id: docRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else if (op.type === 'update') {
          const docRef = doc(this.db, op.collection, op.id!);
          batch.update(docRef, {
            ...op.data,
            updatedAt: serverTimestamp()
          });
        } else if (op.type === 'delete') {
          const docRef = doc(this.db, op.collection, op.id!);
          batch.delete(docRef);
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Batch operation failed:', error);
      throw new Error('Batch operation failed');
    }
  }

  // Real-time subscriptions
  subscribeToCollection<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    constraints: Array<{ field: string; operator: any; value: any }> = [],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'asc'
  ): () => void {
    let q = collection(this.db, collectionName);
    
    // Apply where constraints
    constraints.forEach(constraint => {
      q = query(q, where(constraint.field, constraint.operator, constraint.value));
    });
    
    // Apply ordering
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as T[];
      
      callback(data);
    });
    
    return unsubscribe;
  }

  // Team-specific operations
  async getTeamWithPlayers(teamId: string): Promise<{ team: Team; players: Player[] } | null> {
    try {
      const [team, players] = await Promise.all([
        this.get<Team>('teams', teamId),
        this.query<Player>('players', [{ field: 'teamId', operator: '==', value: teamId }])
      ]);
      
      if (!team) return null;
      
      return { team, players };
    } catch (error) {
      console.error('Error getting team with players:', error);
      throw new Error('Failed to get team with players');
    }
  }

  async getTeamStats(teamId: string): Promise<{
    totalPlayers: number;
    activePlayers: number;
    averageAge: number;
    attendanceRate: number;
    performanceScore: number;
  }> {
    try {
      const [players, attendanceRecords] = await Promise.all([
        this.query<Player>('players', [{ field: 'teamId', operator: '==', value: teamId }]),
        this.query<AttendanceRecord>('attendance', [
          { field: 'teamId', operator: '==', value: teamId }
        ], 'date', 'desc', 10)
      ]);
      
      const totalPlayers = players.length;
      const activePlayers = players.filter(p => p.isActive).length;
      const averageAge = players.length > 0 
        ? Math.round(players.reduce((sum, p) => sum + p.grade, 0) / players.length)
        : 0;
      
      // Calculate attendance rate from recent records
      let totalExpected = 0;
      let totalPresent = 0;
      attendanceRecords.forEach(record => {
        totalExpected += record.totalExpected;
        totalPresent += record.totalPresent;
      });
      
      const attendanceRate = totalExpected > 0 
        ? Math.round((totalPresent / totalExpected) * 100)
        : 0;
      
      // Calculate performance score (placeholder - would be based on actual game stats)
      const performanceScore = 75; // Default score
      
      return {
        totalPlayers,
        activePlayers,
        averageAge,
        attendanceRate,
        performanceScore
      };
    } catch (error) {
      console.error('Error getting team stats:', error);
      throw new Error('Failed to get team stats');
    }
  }

  // Practice plan operations
  async getPracticePlansForTeam(teamId: string, limit: number = 10): Promise<PracticePlan[]> {
    try {
      return await this.query<PracticePlan>(
        'practicePlans',
        [{ field: 'teamId', operator: '==', value: teamId }],
        'date',
        'desc',
        limit
      );
    } catch (error) {
      console.error('Error getting practice plans:', error);
      throw new Error('Failed to get practice plans');
    }
  }

  // Game operations
  async getGamesForTeam(teamId: string, limit: number = 10): Promise<Game[]> {
    try {
      return await this.query<Game>(
        'games',
        [{ field: 'teamId', operator: '==', value: teamId }],
        'date',
        'desc',
        limit
      );
    } catch (error) {
      console.error('Error getting games:', error);
      throw new Error('Failed to get games');
    }
  }

  // Attendance operations
  async recordAttendance(
    teamId: string,
    date: Date,
    records: Array<{ playerId: string; status: 'present' | 'absent' | 'late' | 'excused'; notes?: string }>,
    practiceId?: string,
    gameId?: string
  ): Promise<string> {
    try {
      const totalExpected = records.length;
      const totalPresent = records.filter(r => r.status === 'present').length;
      
      const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
        teamId,
        practiceId,
        gameId,
        date,
        records,
        totalExpected,
        totalPresent,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return await this.create('attendance', attendanceRecord);
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw new Error('Failed to record attendance');
    }
  }

  // AI Insights operations
  async getAIInsightsForTeam(teamId: string, limit: number = 20): Promise<AIInsight[]> {
    try {
      return await this.query<AIInsight>(
        'aiInsights',
        [{ field: 'teamId', operator: '==', value: teamId }],
        'createdAt',
        'desc',
        limit
      );
    } catch (error) {
      console.error('Error getting AI insights:', error);
      throw new Error('Failed to get AI insights');
    }
  }

  // Search functionality
  async searchPlayers(
    teamId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<Player[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a simple implementation - in production, you'd use Algolia or similar
      const players = await this.query<Player>(
        'players',
        [{ field: 'teamId', operator: '==', value: teamId }]
      );
      
      const searchLower = searchTerm.toLowerCase();
      return players
        .filter(player => 
          player.firstName.toLowerCase().includes(searchLower) ||
          player.lastName.toLowerCase().includes(searchLower) ||
          player.jerseyNumber.includes(searchTerm) ||
          player.position.toLowerCase().includes(searchLower)
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching players:', error);
      throw new Error('Failed to search players');
    }
  }

  // Data export functionality
  async exportTeamData(teamId: string): Promise<{
    team: Team;
    players: Player[];
    practicePlans: PracticePlan[];
    games: Game[];
    attendanceRecords: AttendanceRecord[];
    aiInsights: AIInsight[];
  }> {
    try {
      const [
        team,
        players,
        practicePlans,
        games,
        attendanceRecords,
        aiInsights
      ] = await Promise.all([
        this.get<Team>('teams', teamId),
        this.query<Player>('players', [{ field: 'teamId', operator: '==', value: teamId }]),
        this.query<PracticePlan>('practicePlans', [{ field: 'teamId', operator: '==', value: teamId }]),
        this.query<Game>('games', [{ field: 'teamId', operator: '==', value: teamId }]),
        this.query<AttendanceRecord>('attendance', [{ field: 'teamId', operator: '==', value: teamId }]),
        this.query<AIInsight>('aiInsights', [{ field: 'teamId', operator: '==', value: teamId }])
      ]);
      
      if (!team) throw new Error('Team not found');
      
      return {
        team,
        players,
        practicePlans,
        games,
        attendanceRecords,
        aiInsights
      };
    } catch (error) {
      console.error('Error exporting team data:', error);
      throw new Error('Failed to export team data');
    }
  }
}

export const dataService = new DataService();
export default dataService;
