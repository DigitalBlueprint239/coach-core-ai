import { dataService, Team, Player, PracticePlan, Game } from '../firebase/data-service';

// Enhanced AI Service with Safety and Age-Appropriate Content
export interface AISafetyConfig {
  maxResponseLength: number;
  allowedTopics: string[];
  blockedTopics: string[];
  ageAppropriate: boolean;
  contentFilter: 'strict' | 'moderate' | 'lenient';
}

export interface AICoachingRequest {
  query: string;
  context: {
    teamId: string;
    ageGroup: 'u8' | 'u10' | 'u12' | 'u14' | 'jv' | 'varsity';
    sport: 'football' | 'flag_football';
    userRole: 'head-coach' | 'assistant-coach' | 'administrator' | 'parent-volunteer';
    experience: 'beginner' | 'intermediate' | 'advanced';
  };
  requestType: 'practice-plan' | 'game-strategy' | 'player-development' | 'team-management' | 'general-coaching';
  specificFocus?: string[];
  constraints?: {
    timeAvailable?: number;
    equipmentAvailable?: string[];
    weatherConditions?: string;
    playerCount?: number;
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface AICoachingResponse {
  success: boolean;
  response: string;
  confidence: number;
  safetyScore: number;
  ageAppropriate: boolean;
  suggestions: string[];
  followUpQuestions: string[];
  relatedTopics: string[];
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeRequired: number;
    resources: string[];
    steps: string[];
  };
  safetyNotes: string[];
  disclaimer: string;
}

export interface AIPracticePlanRequest {
  teamId: string;
  ageGroup: 'u8' | 'u10' | 'u12' | 'u14' | 'jv' | 'varsity';
  sport: 'football' | 'flag_football';
  duration: number;
  objectives: string[];
  focusAreas: string[];
  equipment: string[];
  weatherConditions?: string;
  playerCount: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  previousPractices?: string[];
  upcomingGames?: string[];
}

export interface AIPracticePlanResponse {
  success: boolean;
  plan: {
    title: string;
    duration: number;
    objectives: string[];
    warmup: Array<{
      drill: string;
      duration: number;
      description: string;
      safetyNotes: string;
    }>;
    mainDrills: Array<{
      drill: string;
      duration: number;
      description: string;
      coachingPoints: string[];
      safetyNotes: string;
      variations: string[];
    }>;
    cooldown: Array<{
      drill: string;
      duration: number;
      description: string;
    }>;
    equipment: string[];
    safetyChecklist: string[];
    modifications: {
      forSmallerGroups: string[];
      forLargerGroups: string[];
      forDifferentSkillLevels: string[];
    };
  };
  confidence: number;
  safetyScore: number;
  ageAppropriate: boolean;
  suggestions: string[];
}

class EnhancedAIService {
  private safetyConfigs: Record<string, AISafetyConfig> = {
    'u8': {
      maxResponseLength: 300,
      allowedTopics: ['basic skills', 'fun games', 'teamwork', 'sportsmanship'],
      blockedTopics: ['contact drills', 'complex strategies', 'competition', 'winning'],
      ageAppropriate: true,
      contentFilter: 'strict',
    },
    'u10': {
      maxResponseLength: 400,
      allowedTopics: ['basic skills', 'simple strategies', 'teamwork', 'sportsmanship', 'basic rules'],
      blockedTopics: ['advanced contact', 'complex plays', 'pressure situations'],
      ageAppropriate: true,
      contentFilter: 'strict',
    },
    'u12': {
      maxResponseLength: 500,
      allowedTopics: ['skill development', 'basic strategies', 'teamwork', 'sportsmanship', 'rules', 'simple plays'],
      blockedTopics: ['dangerous drills', 'complex strategies'],
      ageAppropriate: true,
      contentFilter: 'moderate',
    },
    'u14': {
      maxResponseLength: 600,
      allowedTopics: ['skill development', 'strategies', 'teamwork', 'sportsmanship', 'plays', 'conditioning'],
      blockedTopics: ['dangerous drills', 'excessive conditioning'],
      ageAppropriate: true,
      contentFilter: 'moderate',
    },
    'jv': {
      maxResponseLength: 700,
      allowedTopics: ['advanced skills', 'strategies', 'teamwork', 'competition', 'plays', 'conditioning'],
      blockedTopics: ['dangerous drills'],
      ageAppropriate: true,
      contentFilter: 'lenient',
    },
    'varsity': {
      maxResponseLength: 800,
      allowedTopics: ['advanced skills', 'strategies', 'teamwork', 'competition', 'plays', 'conditioning', 'mental preparation'],
      blockedTopics: ['dangerous drills'],
      ageAppropriate: true,
      contentFilter: 'lenient',
    },
  };

  // Content safety filter
  private filterContent(content: string, ageGroup: string): { isSafe: boolean; filteredContent: string; safetyScore: number } {
    const config = this.safetyConfigs[ageGroup];
    if (!config) {
      return { isSafe: false, filteredContent: '', safetyScore: 0 };
    }

    let safetyScore = 100;
    let filteredContent = content;

    // Check for blocked topics
    for (const blockedTopic of config.blockedTopics) {
      if (content.toLowerCase().includes(blockedTopic.toLowerCase())) {
        safetyScore -= 30;
        filteredContent = filteredContent.replace(new RegExp(blockedTopic, 'gi'), '[REDACTED]');
      }
    }

    // Check content length
    if (content.length > config.maxResponseLength) {
      safetyScore -= 20;
      filteredContent = content.substring(0, config.maxResponseLength) + '...';
    }

    // Check for inappropriate language
    const inappropriateWords = ['dangerous', 'risky', 'aggressive', 'violent'];
    for (const word of inappropriateWords) {
      if (content.toLowerCase().includes(word.toLowerCase())) {
        safetyScore -= 15;
        filteredContent = filteredContent.replace(new RegExp(word, 'gi'), 'safe');
      }
    }

    return {
      isSafe: safetyScore >= 70,
      filteredContent,
      safetyScore: Math.max(0, safetyScore),
    };
  }

  // Generate coaching response
  async generateCoachingResponse(request: AICoachingRequest): Promise<AICoachingResponse> {
    try {
      // Get team context
      const team = await dataService.get<Team>('teams', request.context.teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Generate response based on request type
      let response = '';
      let confidence = 0.8;
      let suggestions: string[] = [];
      let followUpQuestions: string[] = [];
      let relatedTopics: string[] = [];

      switch (request.requestType) {
        case 'practice-plan':
          const practiceResponse = await this.generatePracticePlanResponse(request);
          response = practiceResponse.plan.title;
          confidence = practiceResponse.confidence;
          suggestions = practiceResponse.suggestions;
          break;

        case 'game-strategy':
          response = this.generateGameStrategy(request);
          confidence = 0.85;
          suggestions = ['Review game film', 'Practice specific plays', 'Focus on fundamentals'];
          followUpQuestions = ['What is your opponent\'s weakness?', 'How many players do you have available?'];
          break;

        case 'player-development':
          response = this.generatePlayerDevelopmentAdvice(request);
          confidence = 0.9;
          suggestions = ['Individual skill work', 'Regular feedback', 'Goal setting'];
          relatedTopics = ['Skill assessment', 'Progress tracking', 'Motivation techniques'];
          break;

        case 'team-management':
          response = this.generateTeamManagementAdvice(request);
          confidence = 0.8;
          suggestions = ['Clear communication', 'Consistent expectations', 'Positive reinforcement'];
          break;

        default:
          response = this.generateGeneralCoachingAdvice(request);
          confidence = 0.75;
          suggestions = ['Focus on fundamentals', 'Build team chemistry', 'Maintain positive attitude'];
      }

      // Apply safety filters
      const safetyCheck = this.filterContent(response, request.context.ageGroup);

      // Generate implementation steps
      const implementation = this.generateImplementationSteps(request, response);

      // Generate safety notes
      const safetyNotes = this.generateSafetyNotes(request.context.ageGroup, request.requestType);

      return {
        success: true,
        response: safetyCheck.filteredContent,
        confidence,
        safetyScore: safetyCheck.safetyScore,
        ageAppropriate: safetyCheck.isSafe,
        suggestions,
        followUpQuestions,
        relatedTopics,
        implementation,
        safetyNotes,
        disclaimer: this.generateDisclaimer(request.context.ageGroup),
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.generateFallbackResponse(request);
    }
  }

  // Generate practice plan response
  async generatePracticePlanResponse(request: AIPracticePlanRequest): Promise<AIPracticePlanResponse> {
    const ageGroup = request.ageGroup;
    const duration = request.duration;
    const objectives = request.objectives;

    // Generate age-appropriate practice plan
    const plan = {
      title: `${duration}-Minute Practice Plan for ${ageGroup.toUpperCase()} ${request.sport}`,
      duration,
      objectives,
      warmup: this.generateWarmupDrills(ageGroup, duration * 0.15),
      mainDrills: this.generateMainDrills(ageGroup, duration * 0.7, objectives),
      cooldown: this.generateCooldownDrills(ageGroup, duration * 0.15),
      equipment: request.equipment,
      safetyChecklist: this.generateSafetyChecklist(ageGroup),
      modifications: this.generateModifications(ageGroup, request.playerCount, request.skillLevel),
    };

    return {
      success: true,
      plan,
      confidence: 0.9,
      safetyScore: 95,
      ageAppropriate: true,
      suggestions: ['Adapt drills to skill level', 'Ensure proper supervision', 'Take frequent water breaks'],
    };
  }

  // Generate warmup drills
  private generateWarmupDrills(ageGroup: string, duration: number): Array<{ drill: string; duration: number; description: string; safetyNotes: string }> {
    const drills = [
      {
        drill: 'Dynamic Stretching',
        duration: Math.floor(duration * 0.4),
        description: 'High knees, butt kicks, leg swings, arm circles',
        safetyNotes: 'Start slow, gradually increase intensity',
      },
      {
        drill: 'Light Jogging',
        duration: Math.floor(duration * 0.3),
        description: 'Easy jogging around the field',
        safetyNotes: 'Maintain proper form, stay hydrated',
      },
      {
        drill: 'Agility Movements',
        duration: Math.floor(duration * 0.3),
        description: 'Side shuffles, backpedaling, carioca',
        safetyNotes: 'Focus on coordination, not speed',
      },
    ];

    return drills;
  }

  // Generate main drills
  private generateMainDrills(ageGroup: string, duration: number, objectives: string[]): Array<{ drill: string; duration: number; description: string; coachingPoints: string[]; safetyNotes: string; variations: string[] }> {
    const drills = [];

    // Add drills based on objectives
    if (objectives.includes('passing')) {
      drills.push({
        drill: 'Passing Fundamentals',
        duration: Math.floor(duration * 0.3),
        description: 'Practice proper passing technique',
        coachingPoints: ['Proper grip', 'Follow through', 'Step into throw'],
        safetyNotes: 'Ensure proper spacing, start with short distances',
        variations: ['Stationary passing', 'Moving passing', 'Different distances'],
      });
    }

    if (objectives.includes('catching')) {
      drills.push({
        drill: 'Receiving Skills',
        duration: Math.floor(duration * 0.3),
        description: 'Practice catching technique',
        coachingPoints: ['Hands out front', 'Catch with hands', 'Tuck ball'],
        safetyNotes: 'Start with soft throws, proper spacing',
        variations: ['High catches', 'Low catches', 'Side catches'],
      });
    }

    if (objectives.includes('tackling') && ageGroup !== 'u8' && ageGroup !== 'u10') {
      drills.push({
        drill: 'Safe Tackling Technique',
        duration: Math.floor(duration * 0.4),
        description: 'Practice proper tackling form',
        coachingPoints: ['Eyes up', 'Head back', 'Wrap up'],
        safetyNotes: 'NO live tackling, use dummies, emphasize form',
        variations: ['Form tackling', 'Dummy tackling', 'Angle tackling'],
      });
    }

    return drills;
  }

  // Generate cooldown drills
  private generateCooldownDrills(ageGroup: string, duration: number): Array<{ drill: string; duration: number; description: string }> {
    return [
      {
        drill: 'Static Stretching',
        duration: Math.floor(duration * 0.6),
        description: 'Hold stretches for 15-30 seconds',
      },
      {
        drill: 'Light Walking',
        duration: Math.floor(duration * 0.4),
        description: 'Easy walking to cool down',
      },
    ];
  }

  // Generate safety checklist
  private generateSafetyChecklist(ageGroup: string): string[] {
    const baseChecklist = [
      'Ensure all equipment is properly secured',
      'Maintain proper supervision',
      'Take frequent water breaks',
      'Stop if any player shows signs of fatigue',
    ];

    if (ageGroup === 'u8' || ageGroup === 'u10') {
      baseChecklist.push('No contact drills', 'Focus on fun and basic skills');
    } else if (ageGroup === 'u12' || ageGroup === 'u14') {
      baseChecklist.push('Progressive skill development', 'Proper technique emphasis');
    } else {
      baseChecklist.push('Advanced technique training', 'Game situation preparation');
    }

    return baseChecklist;
  }

  // Generate modifications
  private generateModifications(ageGroup: string, playerCount: number, skillLevel: string): { forSmallerGroups: string[]; forLargerGroups: string[]; forDifferentSkillLevels: string[] } {
    return {
      forSmallerGroups: [
        'Increase individual attention',
        'More repetition of basic skills',
        'Simplified drill variations',
      ],
      forLargerGroups: [
        'Split into multiple stations',
        'Use assistant coaches',
        'Rotate players through drills',
      ],
      forDifferentSkillLevels: [
        'Provide individual challenges',
        'Pair advanced players with beginners',
        'Offer multiple drill variations',
      ],
    };
  }

  // Generate game strategy
  private generateGameStrategy(request: AICoachingRequest): string {
    const { ageGroup, sport } = request.context;
    
    if (ageGroup === 'u8' || ageGroup === 'u10') {
      return 'Focus on basic skills and having fun. Encourage teamwork and sportsmanship. Keep strategies simple and emphasize fundamentals.';
    } else if (ageGroup === 'u12' || ageGroup === 'u14') {
      return 'Develop basic game plans while maintaining focus on skill development. Introduce simple plays and strategies appropriate for the age group.';
    } else {
      return 'Implement comprehensive game strategies based on opponent analysis. Focus on execution, adjustments, and mental preparation.';
    }
  }

  // Generate player development advice
  private generatePlayerDevelopmentAdvice(request: AICoachingRequest): string {
    const { ageGroup, experience } = request.context;
    
    if (ageGroup === 'u8' || ageGroup === 'u10') {
      return 'Focus on building fundamental skills through fun activities. Encourage participation and build confidence. Emphasize teamwork and sportsmanship.';
    } else if (ageGroup === 'u12' || ageGroup === 'u14') {
      return 'Balance skill development with game understanding. Provide individual feedback and set achievable goals. Encourage leadership and responsibility.';
    } else {
      return 'Advanced skill refinement and mental preparation. Focus on consistency, game IQ, and leadership development. Prepare for next level competition.';
    }
  }

  // Generate team management advice
  private generateTeamManagementAdvice(request: AICoachingRequest): string {
    const { userRole, experience } = request.context;
    
    if (userRole === 'head-coach') {
      return 'Set clear expectations and maintain consistent communication. Delegate responsibilities to assistant coaches. Focus on building team culture and chemistry.';
    } else if (userRole === 'assistant-coach') {
      return 'Support the head coach\'s vision while providing valuable input. Focus on your assigned responsibilities and maintain positive relationships with players.';
    } else {
      return 'Support the coaching staff and maintain positive parent relationships. Focus on administrative tasks and ensuring smooth operations.';
    }
  }

  // Generate general coaching advice
  private generateGeneralCoachingAdvice(request: AICoachingRequest): string {
    const { experience } = request.context;
    
    if (experience === 'beginner') {
      return 'Focus on fundamentals and building confidence. Keep practices fun and engaging. Don\'t be afraid to ask for help from more experienced coaches.';
    } else if (experience === 'intermediate') {
      return 'Continue developing your coaching philosophy. Focus on player development and team building. Seek opportunities to learn from other coaches.';
    } else {
      return 'Mentor other coaches and contribute to the coaching community. Focus on continuous improvement and innovation. Share your knowledge and experience.';
    }
  }

  // Generate implementation steps
  private generateImplementationSteps(request: AICoachingRequest, response: string): { difficulty: 'easy' | 'medium' | 'hard'; timeRequired: number; resources: string[]; steps: string[] } {
    const { requestType, context } = request;
    
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    let timeRequired = 30;
    let resources: string[] = [];
    let steps: string[] = [];

    switch (requestType) {
      case 'practice-plan':
        difficulty = 'medium';
        timeRequired = 60;
        resources = ['Practice field', 'Equipment', 'Practice plan', 'Assistant coaches'];
        steps = [
          'Review the practice plan',
          'Set up equipment and stations',
          'Brief players on objectives',
          'Execute warmup drills',
          'Run main practice drills',
          'Cool down and debrief',
        ];
        break;

      case 'game-strategy':
        difficulty = 'hard';
        timeRequired = 120;
        resources = ['Game film', 'Scouting report', 'Strategy board', 'Team meeting'];
        steps = [
          'Analyze opponent strengths and weaknesses',
          'Develop game plan',
          'Practice key plays',
          'Communicate strategy to team',
          'Execute and adjust during game',
        ];
        break;

      default:
        difficulty = 'easy';
        timeRequired = 15;
        resources = ['Coaching resources', 'Mentor coach', 'Online courses'];
        steps = [
          'Research the topic',
          'Seek advice from experienced coaches',
          'Implement gradually',
          'Evaluate results',
        ];
    }

    return { difficulty, timeRequired, resources, steps };
  }

  // Generate safety notes
  private generateSafetyNotes(ageGroup: string, requestType: string): string[] {
    const notes = [
      'Always prioritize player safety over performance',
      'Ensure proper supervision at all times',
      'Stop any activity that becomes unsafe',
      'Have emergency contact information readily available',
    ];

    if (ageGroup === 'u8' || ageGroup === 'u10') {
      notes.push('No contact drills for this age group', 'Focus on fun and basic skills');
    }

    if (requestType === 'practice-plan') {
      notes.push('Ensure proper warmup and cooldown', 'Take frequent water breaks');
    }

    return notes;
  }

  // Generate disclaimer
  private generateDisclaimer(ageGroup: string): string {
    return `This advice is intended for ${ageGroup.toUpperCase()} youth football coaching. Always follow your league's rules and safety guidelines. Consult with qualified professionals for specific medical or safety concerns.`;
  }

  // Generate fallback response
  private generateFallbackResponse(request: AICoachingRequest): AICoachingResponse {
    return {
      success: false,
      response: 'I apologize, but I\'m unable to provide specific advice at the moment. Please try again or consult with your coaching staff for immediate guidance.',
      confidence: 0.3,
      safetyScore: 100,
      ageAppropriate: true,
      suggestions: ['Try again in a moment', 'Consult with other coaches', 'Check your internet connection'],
      followUpQuestions: [],
      relatedTopics: [],
      implementation: {
        difficulty: 'easy',
        timeRequired: 5,
        resources: ['Internet connection', 'Alternative resources'],
        steps: ['Wait a moment and try again', 'Use alternative coaching resources'],
      },
      safetyNotes: ['This is a fallback response', 'No specific safety concerns'],
      disclaimer: 'This is a fallback response due to a technical issue.',
    };
  }
}

export const enhancedAIService = new EnhancedAIService();
export default enhancedAIService;
