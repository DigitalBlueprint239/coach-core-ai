// @ts-nocheck
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
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { Game, Play, GameStatistics, TeamStats, PlayerGameStats, CreateGameData } from '../../types/game';
import { trackUserAction, trackError } from '../monitoring';

export class GameService {
  private db = db;
  private collection = 'games';

  async createGame(gameData: CreateGameData): Promise<string> {
    const game: Game = {
      ...gameData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Convert dates to Firestore Timestamps
    const gameForFirestore = {
      ...game,
      date: Timestamp.fromDate(game.date),
      createdAt: Timestamp.fromDate(game.createdAt),
      updatedAt: Timestamp.fromDate(game.updatedAt),
    };

    await setDoc(doc(this.db, this.collection, game.id), gameForFirestore);
    return game.id;
  }

  async getGame(gameId: string): Promise<Game | null> {
    const docRef = doc(this.db, this.collection, gameId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return this.convertFirestoreData(data);
  }

  async getTeamGames(teamId: string): Promise<Game[]> {
    const q = query(
      collection(this.db, this.collection),
      where('teamId', '==', teamId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data()));
  }

  async updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Convert date if it exists
    if (updates.date) {
      updateData.date = Timestamp.fromDate(updates.date);
    }

    await updateDoc(doc(this.db, this.collection, gameId), updateData);
  }

  async updateGameScore(gameId: string, score: { home: number; away: number }): Promise<void> {
    await this.updateGame(gameId, { score });
  }

  async addPlay(gameId: string, play: Play): Promise<void> {
    try {
      // Track play creation attempt
      trackUserAction('play_created', { 
        gameId, 
        playType: play.type,
        quarter: play.quarter 
      });

      const game = await this.getGame(gameId);
      if (!game) throw new Error('Game not found');

      const updatedGame = {
        ...game,
        quarters: game.quarters.map(quarter => 
          quarter.number === play.quarter 
            ? { ...quarter, plays: [...quarter.plays, play] }
            : quarter
        ),
        updatedAt: new Date(),
      };

      await this.updateGame(gameId, updatedGame);

      // Track successful play creation
      trackUserAction('play_created_success', { 
        gameId, 
        playType: play.type,
        quarter: play.quarter 
      });
    } catch (error: any) {
      // Track play creation error
      trackUserAction('play_created_error', { 
        gameId, 
        playType: play.type,
        error: error.message 
      });
      trackError(error as Error, { action: 'play_created', gameId });
      throw error;
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    await deleteDoc(doc(this.db, this.collection, gameId));
  }

  async getGameStatistics(gameId: string): Promise<GameStatistics> {
    const game = await this.getGame(gameId);
    if (!game) throw new Error('Game not found');

    return this.calculateGameStatistics(game);
  }

  private calculateGameStatistics(game: Game): GameStatistics {
    const teamStats: TeamStats = {
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnovers: 0,
      penalties: 0,
      timeOfPossession: 0,
    };

    const playerStats: PlayerGameStats[] = [];
    const allPlays: Play[] = [];
    const allTimeouts: Timeout[] = [];

    game.quarters.forEach(quarter => {
      allPlays.push(...quarter.plays);
      allTimeouts.push(...quarter.timeouts);

      quarter.plays.forEach(play => {
        // Calculate team statistics
        teamStats.totalYards += play.result.yards;
        if (play.playType === 'pass') {
          teamStats.passingYards += play.result.yards;
        } else if (play.playType === 'run') {
          teamStats.rushingYards += play.result.yards;
        }
        if (play.result.outcome === 'turnover') {
          teamStats.turnovers += 1;
        }

        // Calculate player statistics
        play.players.forEach(player => {
          const existingPlayer = playerStats.find(p => p.playerId === player.playerId);
          if (existingPlayer) {
            existingPlayer.yards += player.yards;
            existingPlayer.attempts += 1;
            if (player.success) existingPlayer.successes += 1;
            if (play.result.outcome === 'touchdown') existingPlayer.touchdowns += 1;
          } else {
            playerStats.push({
              playerId: player.playerId,
              yards: player.yards,
              attempts: 1,
              successes: player.success ? 1 : 0,
              touchdowns: play.result.outcome === 'touchdown' ? 1 : 0,
            });
          }
        });
      });
    });

    return {
      teamStats,
      playerStats,
      plays: allPlays,
      timeouts: allTimeouts,
    };
  }

  private convertFirestoreData(data: any): Game {
    return {
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Helper method to create initial game data
  createInitialGameData(teamId: string, formData: any): CreateGameData {
    const quarters = Array.from({ length: 4 }, (_, i) => ({
      number: i + 1,
      duration: 15, // 15 minutes per quarter
      homeScore: 0,
      awayScore: 0,
      plays: [],
      timeouts: [],
    }));

    const statistics: GameStatistics = {
      teamStats: {
        totalYards: 0,
        passingYards: 0,
        rushingYards: 0,
        turnovers: 0,
        penalties: 0,
        timeOfPossession: 0,
      },
      playerStats: [],
      plays: [],
      timeouts: [],
    };

    return {
      teamId,
      opponent: formData.opponent,
      date: new Date(formData.date),
      venue: formData.venue,
      status: 'scheduled',
      score: { home: 0, away: 0 },
      quarters,
      statistics,
      notes: formData.notes || '',
    };
  }
}

export const gameService = new GameService();
