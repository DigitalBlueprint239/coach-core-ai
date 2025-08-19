"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
const firestore_1 = require("firebase/firestore");
const base_service_1 = require("./base.service");
const config_1 = require("../firebase/config");
// import { Team, Player } from '@/types'; // Uncomment and adjust as needed
class PlayerService extends base_service_1.BaseFirestoreService {
}
class TeamService extends base_service_1.BaseFirestoreService {
    constructor() {
        super('teams');
    }
    getTeamsByCoach(coachId, level) {
        return __awaiter(this, void 0, void 0, function* () {
            const constraints = [
                (0, firestore_1.where)('coachId', '==', coachId),
                (0, firestore_1.orderBy)('createdAt', 'desc')
            ];
            // Add level filter if specified
            if (level) {
                constraints.push((0, firestore_1.where)('level', '==', level));
            }
            return this.getAll(constraints);
        });
    }
    getTeamPlayers(teamId, level) {
        return __awaiter(this, void 0, void 0, function* () {
            const playersService = new PlayerService('players');
            const constraints = [
                (0, firestore_1.where)('teamId', '==', teamId),
                (0, firestore_1.orderBy)('jerseyNumber', 'asc')
            ];
            // Add level filter if specified
            if (level) {
                constraints.push((0, firestore_1.where)('level', '==', level));
            }
            return playersService.getAll(constraints);
        });
    }
    updateRoster(teamId, players, level) {
        return __awaiter(this, void 0, void 0, function* () {
            // Batch update logic with level awareness
            const batch = (0, firestore_1.writeBatch)(config_1.firebase.db);
            players.forEach(player => {
                const playerRef = (0, firestore_1.doc)(config_1.firebase.db, 'players', player.id);
                const updateData = Object.assign(Object.assign({}, player), (level && { level }) // Update level if provided
                );
                batch.update(playerRef, updateData);
            });
            yield batch.commit();
        });
    }
    getTeamsByLevel(level) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getAll([
                (0, firestore_1.where)('level', '==', level),
                (0, firestore_1.orderBy)('createdAt', 'desc')
            ]);
        });
    }
    getTeamsBySportAndLevel(sport, level) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getAll([
                (0, firestore_1.where)('sport', '==', sport),
                (0, firestore_1.where)('level', '==', level),
                (0, firestore_1.orderBy)('createdAt', 'desc')
            ]);
        });
    }
}
exports.TeamService = TeamService;
