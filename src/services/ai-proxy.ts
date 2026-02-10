// src/services/ai-proxy.ts
// Server-side proxy for OpenAI API calls to prevent API key exposure

import { env } from '../config/env';

export interface AIProxyConfig {
  endpoint: string;
  timeout?: number;
  retries?: number;
}

export interface AIProxyRequest {
  type: 'practice_plan' | 'play_suggestion' | 'performance_analysis' | 'drill_suggestions' | 'conversation' | 'safety_validation';
  data: any;
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
}

export interface AIProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    cost: number;
    latency: number;
  };
}

export class AIProxyService {
  private config: AIProxyConfig;

  constructor(config: AIProxyConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config
    };
  }

  async makeRequest(request: AIProxyRequest): Promise<AIProxyResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retries!; attempt++) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.VITE_AI_PROXY_TOKEN || ''}`
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeout!)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`AI Proxy error: ${response.status} ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        const latency = Date.now() - startTime;

        return {
          success: true,
          data: data.response,
          metadata: {
            model: data.metadata?.model || 'unknown',
            tokens: data.metadata?.tokens || 0,
            cost: data.metadata?.cost || 0,
            latency
          }
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`AI proxy attempt ${attempt} failed:`, error);

        if (attempt < this.config.retries!) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown AI proxy error'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const useAIProxy = (config: AIProxyConfig) => {
  const proxyService = new AIProxyService(config);

  return {
    makeRequest: proxyService.makeRequest.bind(proxyService),
    loading: false,
    error: null
  };
};
