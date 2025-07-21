// src/services/ai-proxy.ts
// Server-side proxy for OpenAI API calls to prevent API key exposure

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
            'Authorization': `Bearer ${import.meta.env.VITE_AI_PROXY_TOKEN || ''}`
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
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'All AI proxy attempts failed'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// REACT HOOKS
// ============================================

import { useState, useCallback } from 'react';

export const useAIProxy = (config: AIProxyConfig) => {
  const [service] = useState(() => new AIProxyService(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeRequest = useCallback(async (request: AIProxyRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.makeRequest(request);
      if (!result.success) {
        throw new Error(result.error || 'AI request failed');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to make AI request';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  return {
    service,
    loading,
    error,
    makeRequest
  };
}; 