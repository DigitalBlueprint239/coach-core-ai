// Real AI Service for Play Designer
// This service can be connected to OpenAI or other AI providers

export interface GameContext {
  down: number;
  distance: number;
  fieldPosition: number;
  timeRemaining: number;
  score: { home: number; away: number };
  timeouts: { home: number; away: number };
}

export interface PlaySuggestion {
  id: string;
  name: string;
  formation: string;
  description: string;
  confidence: number;
  reasoning: string;
  successRate: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  estimatedYards: number;
  timeToExecute: number;
}

export interface DefenseAnalysis {
  formation: string;
  weaknesses: string[];
  strengths: string[];
  recommendations: string[];
  blitzProbability: number;
  coverageType: string;
}

export interface RouteOptimization {
  playerId: string;
  originalRoute: any[];
  optimizedRoute: any[];
  improvement: number;
  reasoning: string;
}

class RealAIService {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.openai.com/v1';
  private isEnabled: boolean = false;

  constructor() {
    // Check for API key in environment variables
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      console.warn('OpenAI API key not found. AI features will use mock data.');
    }
  }

  private async makeAPICall(endpoint: string, data: any) {
    if (!this.isEnabled || !this.apiKey) {
      throw new Error('AI service not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI API call failed:', error);
      throw error;
    }
  }

  async suggestPlays(context: GameContext): Promise<PlaySuggestion[]> {
    if (!this.isEnabled) {
      // Return mock data when AI is not available
      return this.getMockSuggestions(context);
    }

    try {
      const prompt = this.buildSuggestionPrompt(context);
      const response = await this.makeAPICall('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert football coach with 20+ years of experience. Provide specific, actionable play suggestions based on game context.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return this.parseSuggestionsResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      return this.getMockSuggestions(context);
    }
  }

  async analyzeDefense(offensivePlay: any): Promise<DefenseAnalysis> {
    if (!this.isEnabled) {
      return this.getMockDefenseAnalysis();
    }

    try {
      const prompt = this.buildDefenseAnalysisPrompt(offensivePlay);
      const response = await this.makeAPICall('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a defensive coordinator analyzing offensive formations and plays. Provide detailed defensive analysis and recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 800
      });

      return this.parseDefenseAnalysisResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('Failed to analyze defense:', error);
      return this.getMockDefenseAnalysis();
    }
  }

  async optimizeRoutes(currentPlay: any): Promise<RouteOptimization[]> {
    if (!this.isEnabled) {
      return this.getMockRouteOptimizations();
    }

    try {
      const prompt = this.buildRouteOptimizationPrompt(currentPlay);
      const response = await this.makeAPICall('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a route running specialist. Analyze and optimize player routes for maximum effectiveness and timing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 600
      });

      return this.parseRouteOptimizationResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('Failed to optimize routes:', error);
      return this.getMockRouteOptimizations();
    }
  }

  async generatePlayName(play: any): Promise<string> {
    if (!this.isEnabled) {
      return this.getMockPlayName();
    }

    try {
      const prompt = `Generate a creative, memorable name for this football play. The play is a ${play.type} play using ${play.formation} formation. Make it exciting and easy to remember.`;
      
      const response = await this.makeAPICall('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative football coach who comes up with memorable play names.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 50
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate play name:', error);
      return this.getMockPlayName();
    }
  }

  // Helper methods for building prompts
  private buildSuggestionPrompt(context: GameContext): string {
    return `
Game Situation Analysis:
- Down: ${context.down}
- Distance: ${context.distance} yards
- Field Position: ${context.fieldPosition} yard line
- Time Remaining: ${context.timeRemaining} seconds
- Score: Home ${context.score.home} - Away ${context.score.away}
- Timeouts: Home ${context.timeouts.home}, Away ${context.timeouts.away}

Based on this situation, suggest 3-5 optimal plays with:
1. Play name and formation
2. Brief description
3. Confidence level (0-1)
4. Reasoning
5. Estimated yards
6. Time to execute
7. Difficulty level
8. Relevant tags

Format the response as JSON array.
    `;
  }

  private buildDefenseAnalysisPrompt(offensivePlay: any): string {
    return `
Analyze this offensive play for defensive weaknesses and opportunities:

Play Details:
- Formation: ${offensivePlay.formation}
- Type: ${offensivePlay.type}
- Players: ${offensivePlay.players.length}
- Routes: ${offensivePlay.routes.length}

Provide defensive analysis including:
1. Likely defensive formation
2. Key weaknesses to exploit
3. Defensive strengths
4. Specific recommendations
5. Blitz probability
6. Coverage type

Format the response as JSON.
    `;
  }

  private buildRouteOptimizationPrompt(currentPlay: any): string {
    return `
Analyze and optimize the routes in this play:

Play: ${currentPlay.name}
Routes: ${JSON.stringify(currentPlay.routes)}

Provide route optimizations including:
1. Player ID
2. Original route points
3. Optimized route points
4. Improvement percentage
5. Reasoning for changes

Format the response as JSON array.
    `;
  }

  // Mock data methods for when AI is not available
  private getMockSuggestions(context: GameContext): PlaySuggestion[] {
    return [
      {
        id: 'suggestion-1',
        name: 'Slant-Flat Combination',
        formation: 'Shotgun Spread',
        description: 'Quick slant route with flat route for high-percentage completion',
        confidence: 0.85,
        reasoning: 'High success rate on 2nd and medium, exploits zone coverage',
        successRate: 0.78,
        difficulty: 'beginner',
        tags: ['quick', 'high-percentage', 'zone-beater'],
        estimatedYards: 8,
        timeToExecute: 2.5
      },
      {
        id: 'suggestion-2',
        name: 'Four Verticals',
        formation: 'Shotgun Empty',
        description: 'Four receivers run vertical routes to stretch the defense',
        confidence: 0.72,
        reasoning: 'Good for 3rd and long, forces single coverage',
        successRate: 0.65,
        difficulty: 'intermediate',
        tags: ['vertical', 'stretch', 'deep-threat'],
        estimatedYards: 15,
        timeToExecute: 3.8
      }
    ];
  }

  private getMockDefenseAnalysis(): DefenseAnalysis {
    return {
      formation: '4-3 Cover 2',
      weaknesses: [
        'Vulnerable to deep middle routes',
        'Linebackers can be isolated in coverage',
        'Safety rotation creates opportunities'
      ],
      strengths: [
        'Strong run defense',
        'Good pass rush from edges',
        'Solid underneath coverage'
      ],
      recommendations: [
        'Attack the deep middle seam',
        'Use motion to create mismatches',
        'Target linebackers in coverage'
      ],
      blitzProbability: 0.35,
      coverageType: 'Cover 2 Zone'
    };
  }

  private getMockRouteOptimizations(): RouteOptimization[] {
    return [
      {
        playerId: 'player-1',
        originalRoute: [{ x: 50, y: 50 }, { x: 60, y: 60 }],
        optimizedRoute: [{ x: 50, y: 50 }, { x: 55, y: 55 }, { x: 60, y: 60 }],
        improvement: 0.15,
        reasoning: 'Added intermediate point for smoother route and better timing'
      }
    ];
  }

  private getMockPlayName(): string {
    const names = [
      'Thunder Bolt',
      'Lightning Strike',
      'Golden Arrow',
      'Silver Bullet',
      'Dragon Fire',
      'Phoenix Rise',
      'Eagle Eye',
      'Tiger Claw'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  // Response parsing methods
  private parseSuggestionsResponse(content: string): PlaySuggestion[] {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse suggestions response:', error);
      return this.getMockSuggestions({} as GameContext);
    }
  }

  private parseDefenseAnalysisResponse(content: string): DefenseAnalysis {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse defense analysis response:', error);
      return this.getMockDefenseAnalysis();
    }
  }

  private parseRouteOptimizationResponse(content: string): RouteOptimization[] {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse route optimization response:', error);
      return this.getMockRouteOptimizations();
    }
  }

  // Public methods for configuration
  public enableAI(apiKey: string): void {
    this.apiKey = apiKey;
    this.isEnabled = true;
  }

  public disableAI(): void {
    this.apiKey = null;
    this.isEnabled = false;
  }

  public isAIAvailable(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const aiService = new RealAIService();
export default aiService; 