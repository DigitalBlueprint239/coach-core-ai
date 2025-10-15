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
exports.AIOptimizationService = void 0;
const client_1 = require("./client");
const config_1 = require("../firebase/config");
const firestore_1 = require("firebase/firestore");
class AIOptimizationService {
    constructor() {
        this.baseUrl = '/ai/optimize';
    }
    optimizeLineup(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield client_1.apiClient.post(this.baseUrl, request);
            // Cache the result in Firestore for offline access
            yield this.cacheOptimization(request.teamId, data);
            return data;
        });
    }
    cacheOptimization(teamId, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheRef = (0, firestore_1.doc)(config_1.firebase.db, 'optimizationCache', teamId);
            yield (0, firestore_1.setDoc)(cacheRef, Object.assign(Object.assign({}, result), { timestamp: (0, firestore_1.serverTimestamp)() }));
        });
    }
    getRecommendations(teamId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield client_1.apiClient.get(`/ai/recommendations/${teamId}`, {
                params: { type }
            });
            return data;
        });
    }
}
exports.AIOptimizationService = AIOptimizationService;
