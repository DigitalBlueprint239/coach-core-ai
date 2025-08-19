import { where, orderBy, doc, WriteBatch, writeBatch } from 'firebase/firestore';
import { BaseFirestoreService } from './base.service';
import { db } from '../firebase/firebase-config';
import { FootballLevel } from '../../types/football';
// import { Team, Player } from '@/types'; // Uncomment and adjust as needed

class PlayerService extends BaseFirestoreService<any> {}

export class TeamService extends BaseFirestoreService<any> {
  constructor() {
    super('teams');
  }

  async getTeamsByCoach(coachId: string, level?: FootballLevel): Promise<any[]> {
    const constraints = [
      where('coachId', '==', coachId),
      orderBy('createdAt', 'desc')
    ];
    
    // Add level filter if specified
    if (level) {
      constraints.push(where('level', '==', level));
    }
    
    return this.getAll(constraints);
  }

  async getTeamPlayers(teamId: string, level?: FootballLevel): Promise<any[]> {
    const playersService = new PlayerService('players');
    const constraints = [
      where('teamId', '==', teamId),
      orderBy('jerseyNumber', 'asc')
    ];
    
    // Add level filter if specified
    if (level) {
      constraints.push(where('level', '==', level));
    }
    
    return playersService.getAll(constraints);
  }

  async updateRoster(teamId: string, players: any[], level?: FootballLevel): Promise<void> {
    // Batch update logic with level awareness
    const batch: WriteBatch = writeBatch(db);
    players.forEach(player => {
      const playerRef = doc(db, 'players', player.id);
      const updateData = {
        ...player,
        ...(level && { level }) // Update level if provided
      };
      batch.update(playerRef, updateData);
    });
    await batch.commit();
  }

  async getTeamsByLevel(level: FootballLevel): Promise<any[]> {
    return this.getAll([
      where('level', '==', level),
      orderBy('createdAt', 'desc')
    ]);
  }

  async getTeamsBySportAndLevel(sport: string, level: FootballLevel): Promise<any[]> {
    return this.getAll([
      where('sport', '==', sport),
      where('level', '==', level),
      orderBy('createdAt', 'desc')
    ]);
  }
} 