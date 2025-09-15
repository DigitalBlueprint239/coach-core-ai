import { apiClient } from './client';
import { db } from '../firebase/firebase-config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface OptimizationRequest {
  teamId: string;
  players: any[];
  constraints: {
    formation: string;
    mustInclude?: string[];
    mustExclude?: string[];
  };
}

interface OptimizationResponse {
  lineup: any[];
  score: number;
  reasoning: string[];
  alternatives: any[][];
}

export class AIOptimizationService {
  private baseUrl = '/ai/optimize';

  async optimizeLineup(
    request: OptimizationRequest
  ): Promise<OptimizationResponse> {
    const { data } = await apiClient.post<OptimizationResponse>(
      this.baseUrl,
      request
    );
    // Cache the result in Firestore for offline access
    await this.cacheOptimization(request.teamId, data);
    return data;
  }

  private async cacheOptimization(
    teamId: string,
    result: OptimizationResponse
  ) {
    const cacheRef = doc(db, 'optimizationCache', teamId);
    await setDoc(cacheRef, {
      ...result,
      timestamp: serverTimestamp(),
    });
  }

  async getRecommendations(
    teamId: string,
    type: 'training' | 'tactical' | 'player'
  ) {
    const { data } = await apiClient.get(`/ai/recommendations/${teamId}`, {
      params: { type },
    });
    return data;
  }
}
