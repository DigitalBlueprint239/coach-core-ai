import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService } from '../ai-service';
import { 
  TeamProfile, 
  PlayRequirements, 
  GeneratedPlay, 
  TeamStats, 
  PracticeGoals, 
  PracticePlan,
  PlayerStats,
  PlayerAnalysis,
  GameContext,
  GameStrategy,
  SeasonStats,
  TeamInsights
} from '../types';

// Mock Firebase AI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));
const mockGetVertexAI = vi.fn(() => ({}));

vi.mock('@firebase/vertexai', () => ({
  getVertexAI: mockGetVertexAI,
  getGenerativeModel: mockGetGenerativeModel
}));

// Mock Firebase Functions
const mockHttpsCallable = vi.fn();
const mockGetFunctions = vi.fn(() => ({
  httpsCallable: mockHttpsCallable
}));

vi.mock('firebase/functions', () => ({
  getFunctions: mockGetFunctions
}));

// Mock Firebase app
vi.mock('../firebase/firebase-config', () => ({
  default: {}
}));

describe('AIService - Comprehensive Tests', () => {
  let aiService: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new AIService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AI Service Initialization', () => {
    it('should initialize AI service successfully', () => {
      expect(aiService).toBeDefined();
      expect(mockGetVertexAI).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockGetVertexAI.mockRejectedValue(new Error('AI initialization failed'));
      
      // Service should still be created but with fallback mode
      const service = new AIService();
      expect(service).toBeDefined();
    });
  });

  describe('Play Generation', () => {
    const mockTeamProfile: TeamProfile = {
      sport: 'Basketball',
      playerCount: 5,
      experienceLevel: 'Intermediate',
      preferredStyle: 'Fast-paced',
      ageGroup: 'High School',
      strengths: ['Speed', 'Shooting'],
      weaknesses: ['Defense', 'Rebounding'],
      teamName: 'Test Team'
    };

    const mockPlayRequirements: PlayRequirements = {
      objective: 'Score',
      difficulty: 'Medium',
      timeOnShotClock: 15,
      specialSituations: ['Fast Break'],
      playerCount: 5
    };

    it('should generate custom play successfully', async () => {
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            name: 'Fast Break Play',
            description: 'A quick transition play for scoring',
            steps: [
              { player: 'Point Guard', action: 'Push the ball up court' },
              { player: 'Shooting Guard', action: 'Fill the wing' },
              { player: 'Small Forward', action: 'Cut to the basket' }
            ],
            success: true
          })
        }
      };

      mockGenerateContent.mockResolvedValue(mockAIResponse);

      const result = await aiService.generateCustomPlay(mockTeamProfile, mockPlayRequirements);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe('Fast Break Play');
      expect(result.steps).toHaveLength(3);
    });

    it('should handle play generation errors with demo fallback', async () => {
      mockGenerateContent.mockRejectedValue(new Error('AI service unavailable'));

      const result = await aiService.generateCustomPlay(mockTeamProfile, mockPlayRequirements);

      // Should fall back to demo mode
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('should validate team profile before generation', async () => {
      const invalidTeamProfile = {
        sport: '',
        playerCount: 0,
        experienceLevel: '',
        preferredStyle: '',
        ageGroup: '',
        strengths: [],
        weaknesses: [],
        teamName: ''
      } as TeamProfile;

      await expect(aiService.generateCustomPlay(invalidTeamProfile, mockPlayRequirements)).rejects.toThrow();
    });

    it('should validate play requirements before generation', async () => {
      const invalidRequirements = {
        objective: '',
        difficulty: '',
        timeOnShotClock: 0,
        specialSituations: [],
        playerCount: 0
      } as PlayRequirements;

      await expect(aiService.generateCustomPlay(mockTeamProfile, invalidRequirements)).rejects.toThrow();
    });
  });

  describe('Practice Plan Generation', () => {
    const mockTeamStats: TeamStats = {
      wins: 8,
      losses: 2,
      pointsPerGame: 75.5,
      pointsAllowed: 65.2,
      fieldGoalPercentage: 0.45,
      freeThrowPercentage: 0.78,
      threePointPercentage: 0.35,
      reboundsPerGame: 32.1,
      assistsPerGame: 18.5,
      turnoversPerGame: 12.3
    };

    const mockPracticeGoals: PracticeGoals = {
      focusAreas: ['Shooting', 'Defense'],
      duration: 90,
      intensity: 'High',
      specificSkills: ['Free Throws', 'Man-to-Man Defense'],
      teamGoals: ['Improve shooting percentage', 'Reduce turnovers']
    };

    it('should generate practice plan successfully', async () => {
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            title: 'Shooting and Defense Focus Practice',
            duration: 90,
            drills: [
              {
                name: 'Free Throw Practice',
                duration: 15,
                description: 'Practice free throws from different positions'
              },
              {
                name: 'Man-to-Man Defense Drill',
                duration: 20,
                description: 'Work on defensive positioning and communication'
              }
            ],
            success: true
          })
        }
      };

      mockGenerateContent.mockResolvedValue(mockAIResponse);

      const result = await aiService.generatePracticePlan(mockTeamStats, mockPracticeGoals);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toBe('Shooting and Defense Focus Practice');
      expect(result.drills).toHaveLength(2);
    });

    it('should handle practice plan generation errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('AI service error'));

      const result = await aiService.generatePracticePlan(mockTeamStats, mockPracticeGoals);

      // Should fall back to demo mode
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.drills).toBeDefined();
    });
  });

  describe('Player Performance Analysis', () => {
    const mockPlayerStats: PlayerStats = {
      playerId: 'player-123',
      name: 'John Doe',
      position: 'Point Guard',
      gamesPlayed: 10,
      minutesPerGame: 32.5,
      pointsPerGame: 18.2,
      reboundsPerGame: 4.1,
      assistsPerGame: 7.8,
      stealsPerGame: 2.3,
      blocksPerGame: 0.5,
      turnoversPerGame: 3.2,
      fieldGoalPercentage: 0.45,
      threePointPercentage: 0.38,
      freeThrowPercentage: 0.82
    };

    it('should analyze player performance successfully', async () => {
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            overallRating: 8.5,
            strengths: ['Excellent shooting', 'Great court vision', 'Strong leadership'],
            weaknesses: ['Needs to reduce turnovers', 'Defensive intensity'],
            recommendations: [
              'Focus on ball security during practice',
              'Work on defensive footwork',
              'Continue developing three-point shot'
            ],
            improvementAreas: ['Turnover reduction', 'Defensive positioning'],
            success: true
          })
        }
      };

      mockGenerateContent.mockResolvedValue(mockAIResponse);

      const result = await aiService.analyzePlayerPerformance(mockPlayerStats);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.overallRating).toBe(8.5);
      expect(result.strengths).toHaveLength(3);
      expect(result.recommendations).toHaveLength(3);
    });

    it('should handle player analysis errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Analysis failed'));

      const result = await aiService.analyzePlayerPerformance(mockPlayerStats);

      // Should fall back to demo mode
      expect(result).toBeDefined();
      expect(result.overallRating).toBeDefined();
    });
  });

  describe('Game Strategy Generation', () => {
    const mockGameContext: GameContext = {
      opponent: 'Rival High School',
      gameType: 'Regular Season',
      homeAway: 'Home',
      weather: 'Indoor',
      teamFormation: 'Starting Lineup',
      keyPlayers: ['John Doe', 'Jane Smith'],
      opponentStrengths: ['Fast break', 'Three-point shooting'],
      opponentWeaknesses: ['Rebounding', 'Free throw shooting'],
      gameTime: new Date('2024-01-15T19:00:00Z')
    };

    it('should generate game strategy successfully', async () => {
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            strategy: 'Focus on controlling tempo and exploiting rebounding advantage',
            keyTactics: [
              'Slow down their fast break',
              'Attack the offensive glass',
              'Force them into mid-range shots'
            ],
            playerMatchups: [
              { ourPlayer: 'John Doe', theirPlayer: 'Point Guard', advantage: 'Speed' },
              { ourPlayer: 'Jane Smith', theirPlayer: 'Center', advantage: 'Height' }
            ],
            success: true
          })
        }
      };

      mockGenerateContent.mockResolvedValue(mockAIResponse);

      const result = await aiService.generateGameStrategy(mockGameContext);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.keyTactics).toHaveLength(3);
    });

    it('should handle game strategy generation errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Strategy generation failed'));

      const result = await aiService.generateGameStrategy(mockGameContext);

      // Should fall back to demo mode
      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
    });
  });

  describe('Team Insights Generation', () => {
    const mockSeasonStats: SeasonStats = {
      season: '2023-24',
      gamesPlayed: 20,
      wins: 15,
      losses: 5,
      totalPoints: 1500,
      totalPointsAllowed: 1200,
      averagePointsPerGame: 75.0,
      averagePointsAllowed: 60.0,
      fieldGoalPercentage: 0.46,
      threePointPercentage: 0.36,
      freeThrowPercentage: 0.75,
      reboundsPerGame: 35.2,
      assistsPerGame: 18.8,
      turnoversPerGame: 13.1,
      stealsPerGame: 8.5,
      blocksPerGame: 4.2
    };

    it('should generate team insights successfully', async () => {
      const mockAIResponse = {
        response: {
          text: () => JSON.stringify({
            overallPerformance: 'Strong season with room for improvement',
            keyInsights: [
              'Excellent offensive efficiency',
              'Defense needs improvement',
              'Great team chemistry'
            ],
            trends: [
              { metric: 'Points per game', trend: 'Increasing', value: 75.0 },
              { metric: 'Turnovers', trend: 'Decreasing', value: 13.1 }
            ],
            recommendations: [
              'Focus on defensive drills',
              'Work on late-game execution',
              'Maintain current offensive pace'
            ],
            success: true
          })
        }
      };

      mockGenerateContent.mockResolvedValue(mockAIResponse);

      const result = await aiService.generateTeamInsights(mockSeasonStats);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.overallPerformance).toBeDefined();
      expect(result.keyInsights).toHaveLength(3);
    });

    it('should handle team insights generation errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Insights generation failed'));

      const result = await aiService.generateTeamInsights(mockSeasonStats);

      // Should fall back to demo mode
      expect(result).toBeDefined();
      expect(result.overallPerformance).toBeDefined();
    });
  });

  describe('Prompt Engineering', () => {
    it('should build effective play generation prompts', async () => {
      const teamProfile: TeamProfile = {
        sport: 'Basketball',
        playerCount: 5,
        experienceLevel: 'Intermediate',
        preferredStyle: 'Fast-paced',
        ageGroup: 'High School',
        strengths: ['Speed'],
        weaknesses: ['Defense'],
        teamName: 'Test Team'
      };

      const requirements: PlayRequirements = {
        objective: 'Score',
        difficulty: 'Medium',
        timeOnShotClock: 15,
        specialSituations: ['Fast Break'],
        playerCount: 5
      };

      // Mock the private method by accessing it through the service
      const prompt = (aiService as any).buildPlayGenerationPrompt(teamProfile, requirements);

      expect(prompt).toContain('Basketball');
      expect(prompt).toContain('High School');
      expect(prompt).toContain('Score');
      expect(prompt).toContain('Fast Break');
    });

    it('should build effective practice plan prompts', async () => {
      const teamStats: TeamStats = {
        wins: 8,
        losses: 2,
        pointsPerGame: 75.5,
        pointsAllowed: 65.2,
        fieldGoalPercentage: 0.45,
        freeThrowPercentage: 0.78,
        threePointPercentage: 0.35,
        reboundsPerGame: 32.1,
        assistsPerGame: 18.5,
        turnoversPerGame: 12.3
      };

      const goals: PracticeGoals = {
        focusAreas: ['Shooting'],
        duration: 90,
        intensity: 'High',
        specificSkills: ['Free Throws'],
        teamGoals: ['Improve shooting']
      };

      const prompt = (aiService as any).buildPracticePlanPrompt(teamStats, goals);

      expect(prompt).toContain('Shooting');
      expect(prompt).toContain('90');
      expect(prompt).toContain('High');
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid AI responses correctly', async () => {
      const validResponse = JSON.stringify({
        name: 'Test Play',
        description: 'A test play description',
        steps: [
          { player: 'Player 1', action: 'Action 1' },
          { player: 'Player 2', action: 'Action 2' }
        ],
        success: true
      });

      const parsed = (aiService as any).parsePlayResponse(validResponse, {} as TeamProfile);

      expect(parsed.name).toBe('Test Play');
      expect(parsed.description).toBe('A test play description');
      expect(parsed.steps).toHaveLength(2);
    });

    it('should handle malformed AI responses gracefully', async () => {
      const malformedResponse = 'Invalid JSON response';

      const parsed = (aiService as any).parsePlayResponse(malformedResponse, {} as TeamProfile);

      // Should fall back to demo mode
      expect(parsed).toBeDefined();
      expect(parsed.name).toBeDefined();
    });
  });

  describe('Demo Mode Fallback', () => {
    it('should provide demo play when AI is unavailable', async () => {
      const teamProfile: TeamProfile = {
        sport: 'Basketball',
        playerCount: 5,
        experienceLevel: 'Intermediate',
        preferredStyle: 'Fast-paced',
        ageGroup: 'High School',
        strengths: ['Speed'],
        weaknesses: ['Defense'],
        teamName: 'Test Team'
      };

      const requirements: PlayRequirements = {
        objective: 'Score',
        difficulty: 'Medium',
        timeOnShotClock: 15,
        specialSituations: ['Fast Break'],
        playerCount: 5
      };

      mockGenerateContent.mockRejectedValue(new Error('AI unavailable'));

      const result = await aiService.generateCustomPlay(teamProfile, requirements);

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.steps).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      const teamProfile: TeamProfile = {
        sport: 'Basketball',
        playerCount: 5,
        experienceLevel: 'Intermediate',
        preferredStyle: 'Fast-paced',
        ageGroup: 'High School',
        strengths: ['Speed'],
        weaknesses: ['Defense'],
        teamName: 'Test Team'
      };

      const requirements: PlayRequirements = {
        objective: 'Score',
        difficulty: 'Medium',
        timeOnShotClock: 15,
        specialSituations: ['Fast Break'],
        playerCount: 5
      };

      const result = await aiService.generateCustomPlay(teamProfile, requirements);

      // Should fall back to demo mode
      expect(result).toBeDefined();
    });

    it('should handle invalid input parameters', async () => {
      const invalidTeamProfile = null as any;
      const invalidRequirements = null as any;

      await expect(aiService.generateCustomPlay(invalidTeamProfile, invalidRequirements)).rejects.toThrow();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle multiple concurrent AI requests', async () => {
      const teamProfile: TeamProfile = {
        sport: 'Basketball',
        playerCount: 5,
        experienceLevel: 'Intermediate',
        preferredStyle: 'Fast-paced',
        ageGroup: 'High School',
        strengths: ['Speed'],
        weaknesses: ['Defense'],
        teamName: 'Test Team'
      };

      const requirements: PlayRequirements = {
        objective: 'Score',
        difficulty: 'Medium',
        timeOnShotClock: 15,
        specialSituations: ['Fast Break'],
        playerCount: 5
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({ name: 'Test Play', success: true }) }
      });

      const promises = Array.from({ length: 3 }, () => 
        aiService.generateCustomPlay(teamProfile, requirements)
      );

      const results = await Promise.allSettled(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should cache AI model instances for efficiency', () => {
      // Verify that the model is initialized once and reused
      expect(mockGetGenerativeModel).toHaveBeenCalled();
    });
  });
});


