// Central AI Brain singleton service for Coach Core AI
// Implements 8 core football coaching intelligence methods using the AI proxy

import { AIProxyService } from '../../services/ai-proxy';

// ============================================
// HELPER: Safe JSON parse from AI responses
// ============================================

function extractJSON(raw: any): any {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;

  // Try direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // Try extracting JSON from markdown code blocks
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch { /* fall through */ }
    }
    // Try finding first { ... } or [ ... ] block
    const braceMatch = raw.match(/(\{[\s\S]*\})/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[1]);
      } catch { /* fall through */ }
    }
    const bracketMatch = raw.match(/(\[[\s\S]*\])/);
    if (bracketMatch) {
      try {
        return JSON.parse(bracketMatch[1]);
      } catch { /* fall through */ }
    }
  }
  return null;
}

// ============================================
// AI BRAIN CLASS
// ============================================

export class CoachCoreAIBrain {
  private static instance: CoachCoreAIBrain;
  private proxy: AIProxyService;
  private outcomeLog: Array<{ type: string; outcome: string; timestamp: number }> = [];

  private constructor() {
    this.proxy = new AIProxyService({
      endpoint: process.env.REACT_APP_AI_PROXY_ENDPOINT || '/api/ai',
      timeout: 45000,
      retries: 3,
    });
  }

  static getInstance(): CoachCoreAIBrain {
    if (!CoachCoreAIBrain.instance) {
      CoachCoreAIBrain.instance = new CoachCoreAIBrain();
    }
    return CoachCoreAIBrain.instance;
  }

  // ============================================
  // PRIORITY 1 — Core User Loop
  // ============================================

  /**
   * Generate a structured football practice plan.
   * This is the most important method — it powers the Practice Planner UI.
   */
  async generatePracticePlan(params: {
    duration: number;
    goals: string[];
    teamId: string;
    rosterContext?: any;
    focusAreas?: string[];
    experienceLevel?: string;
    personnelPackages?: string[];
  }): Promise<{
    plan: { periods: Array<{ name: string; duration: number; intensity: string; drills: string[]; coachingPoints?: string[] }> };
    insights: string[];
    confidence: number;
    alternatives: any[];
  }> {
    const {
      duration,
      goals,
      rosterContext,
      experienceLevel = 'high_school',
      personnelPackages,
    } = params;

    const prompt = `[ROLE] You are an expert football coach with 20+ years of experience at the ${experienceLevel} level. You specialize in practice design and player development.

[CONTEXT]
Practice Duration: ${duration} minutes
Practice Goals: ${goals.join(', ')}
${rosterContext ? `Roster Context: ${JSON.stringify(rosterContext)}` : ''}
${personnelPackages ? `Personnel Packages Available: ${personnelPackages.join(', ')}` : 'Personnel Packages Available: 11, 12, 21'}
Experience Level: ${experienceLevel}

[TASK] Generate a complete, structured practice plan that maximizes the ${duration}-minute window. Each period must have a clear purpose, named drills, and coaching emphasis points. Use real football terminology — route trees (0-9), real concepts (Mesh, Smash, Four Verts, Y-Cross, Drive), correct personnel references (11, 12, 21, 22 personnel), and proper drop terminology (3-step, 5-step, 7-step).

[FORMAT] Return your response as JSON matching this exact schema:
{
  "periods": [
    {
      "name": "Period name (e.g., Dynamic Warm-Up, Team Install, 7-on-7, etc.)",
      "duration": <minutes as number>,
      "intensity": "low | medium | high",
      "drills": ["drill name and brief description"],
      "coachingPoints": ["key coaching emphasis for this period"]
    }
  ],
  "insights": ["strategic insights about this practice plan"],
  "confidence": <0.0-1.0>,
  "alternatives": ["alternative drill or focus suggestions"]
}

[CONSTRAINTS]
- Warm-up must be 10-15% of total time
- Skill development should be 40-50% of total time
- Team periods (11-on-11 or 7-on-7) should be 30-40% of total time
- Cool-down and review should be 5-10% of total time
- All drill names must be real coaching drills, not invented ones
- Every period must directly serve at least one of the stated goals`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'practice_plan',
        data: { prompt, context: params },
        options: { temperature: 0.7, maxTokens: 2000 },
      });

      if (!response.success) {
        console.error('[AIBrain.generatePracticePlan] Proxy error:', response.error);
        return this.fallbackPracticePlan(params);
      }

      const parsed = extractJSON(response.data);
      if (parsed && Array.isArray(parsed.periods) && parsed.periods.length > 0) {
        return {
          plan: {
            periods: parsed.periods.map((p: any) => ({
              name: String(p.name || 'Unnamed Period'),
              duration: Number(p.duration) || 10,
              intensity: String(p.intensity || 'medium'),
              drills: Array.isArray(p.drills) ? p.drills.map(String) : [],
              coachingPoints: Array.isArray(p.coachingPoints) ? p.coachingPoints.map(String) : [],
            })),
          },
          insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
          alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
        };
      }

      console.warn('[AIBrain.generatePracticePlan] Could not parse AI response, using fallback');
      return this.fallbackPracticePlan(params);
    } catch (error) {
      console.error('[AIBrain.generatePracticePlan] Exception:', error, 'Params:', params);
      return this.fallbackPracticePlan(params);
    }
  }

  /**
   * Given a formation and down-and-distance situation, suggest plays.
   * Returns football-specific recommendations with reasoning.
   */
  async getPlaySuggestions(context: {
    formation?: string;
    personnelPackage?: string;
    down?: number;
    distance?: number;
    fieldPosition?: string;
    scoreDifferential?: number;
    timeRemaining?: number;
    hashMark?: string;
    opponentTendency?: string;
  }): Promise<{
    suggestion: string;
    confidence: number;
    urgency: string;
    reasoning: string[];
    suggestions: Array<{
      name: string;
      concept: string;
      reasoning: string;
      confidence: number;
      formation?: string;
      personnelPackage?: string;
    }>;
  }> {
    const {
      formation = 'Shotgun',
      personnelPackage = '11',
      down = 1,
      distance = 10,
      fieldPosition = 'own 30',
      scoreDifferential = 0,
      timeRemaining,
      hashMark,
      opponentTendency = 'balanced',
    } = context;

    const prompt = `[ROLE] You are an expert football offensive coordinator with 15+ years of experience calling plays at the high school and college level. You think in terms of coverage reads, personnel matchups, and situational football.

[CONTEXT]
Formation: ${formation}
Personnel Package: ${personnelPackage} personnel
Down & Distance: ${down}${down === 1 ? 'st' : down === 2 ? 'nd' : down === 3 ? 'rd' : 'th'} and ${distance}
Field Position: ${fieldPosition}
Score Differential: ${scoreDifferential > 0 ? '+' + scoreDifferential : scoreDifferential} (positive = winning)
${timeRemaining != null ? `Time Remaining: ${timeRemaining} seconds` : ''}
${hashMark ? `Hash: ${hashMark}` : ''}
Opponent Tendency: ${opponentTendency}

[TASK] Suggest 3-4 play calls for this situation. For each play, explain the concept, why it works against the likely coverage, and your confidence level. Use real football concepts — name real route combinations (Mesh, Smash, Four Verts, Y-Cross, Drive, Dagger, Levels, China, Stick, Snag), reference real coverage shells (Cover 0, Cover 1, Cover 2, Cover 3, Tampa 2, Cover 4/Quarters, Cover 6), and use proper route tree numbering (0-9 routes).

[FORMAT] Return your response as JSON matching this exact schema:
{
  "topSuggestion": "Name of the best play for this situation",
  "urgency": "low | medium | high",
  "reasoning": ["why this is the right call"],
  "suggestions": [
    {
      "name": "Play name (e.g., Trips Right Z-Mesh)",
      "concept": "Concept description — what the play does schematically",
      "reasoning": "Why this works against likely coverage in this situation",
      "confidence": <0.0-1.0>,
      "formation": "Formation variant",
      "personnelPackage": "Personnel"
    }
  ]
}

[CONSTRAINTS]
- Every suggestion must reference a real offensive concept
- Confidence levels must reflect realistic football analysis
- Consider down and distance — don't suggest deep shots on 3rd and 2
- Consider field position — no vertical routes inside the 5-yard line
- Account for score differential in aggressiveness`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'play_suggestion',
        data: { prompt, context },
        options: { temperature: 0.6, maxTokens: 1500 },
      });

      if (!response.success) {
        console.error('[AIBrain.getPlaySuggestions] Proxy error:', response.error);
        return this.fallbackPlaySuggestions(context);
      }

      const parsed = extractJSON(response.data);
      if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        const suggestions = parsed.suggestions.map((s: any) => ({
          name: String(s.name || 'Unnamed Play'),
          concept: String(s.concept || ''),
          reasoning: String(s.reasoning || ''),
          confidence: typeof s.confidence === 'number' ? s.confidence : 0.7,
          formation: s.formation ? String(s.formation) : undefined,
          personnelPackage: s.personnelPackage ? String(s.personnelPackage) : undefined,
        }));

        return {
          suggestion: String(parsed.topSuggestion || suggestions[0]?.name || ''),
          confidence: suggestions[0]?.confidence || 0.7,
          urgency: String(parsed.urgency || 'medium'),
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.map(String) : [suggestions[0]?.reasoning || ''],
          suggestions,
        };
      }

      console.warn('[AIBrain.getPlaySuggestions] Could not parse AI response, using fallback');
      return this.fallbackPlaySuggestions(context);
    } catch (error) {
      console.error('[AIBrain.getPlaySuggestions] Exception:', error, 'Context:', context);
      return this.fallbackPlaySuggestions(context);
    }
  }

  // ============================================
  // PRIORITY 2 — Intelligence Layer
  // ============================================

  /**
   * Analyze a formation: identify personnel, strengths/weaknesses,
   * likely defensive adjustments, and recommended concepts.
   */
  async analyzeFormation(formation: any): Promise<{
    formation: string;
    personnelPackage: string;
    strengths: string[];
    weaknesses: string[];
    defensiveAdjustments: string[];
    recommendedConcepts: Array<{ name: string; description: string; targetCoverage: string }>;
    confidence: number;
  }> {
    const formationName = typeof formation === 'string' ? formation : formation?.name || formation?.formation || 'Unknown';
    const personnelHint = typeof formation === 'object' ? formation?.personnel || formation?.personnelPackage : undefined;

    const prompt = `[ROLE] You are an expert football offensive coordinator and film analyst with deep knowledge of formation theory, defensive alignments, and schematic advantages.

[CONTEXT]
Formation: ${formationName}
${personnelHint ? `Personnel: ${personnelHint}` : ''}
${typeof formation === 'object' && formation?.players ? `Players: ${JSON.stringify(formation.players)}` : ''}

[TASK] Provide a comprehensive analysis of this formation:
1. Identify the personnel package (11, 12, 21, 22, etc.)
2. List 3-4 strengths of this formation
3. List 2-3 weaknesses or vulnerabilities
4. Identify 2-3 likely defensive adjustments opponents will make
5. Recommend 2-3 offensive concepts that attack common coverages against this formation

Use real football terminology — route concepts, coverage shells, gap assignments, and alignment rules.

[FORMAT] Return your response as JSON matching this exact schema:
{
  "formation": "Formation name",
  "personnelPackage": "Personnel identification (e.g., 11, 12, 21)",
  "strengths": ["strength descriptions"],
  "weaknesses": ["weakness descriptions"],
  "defensiveAdjustments": ["expected defensive responses"],
  "recommendedConcepts": [
    {
      "name": "Concept name (e.g., Mesh, Smash, Y-Cross)",
      "description": "How the concept works from this formation",
      "targetCoverage": "Which coverage this concept attacks (e.g., Cover 3, Cover 2)"
    }
  ],
  "confidence": <0.0-1.0>
}

[CONSTRAINTS]
- All concepts must be real, established football concepts
- Defensive adjustments must reference real defensive fronts and coverages
- Strengths and weaknesses must be schematically grounded`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'performance_analysis',
        data: { prompt, context: { formation } },
        options: { temperature: 0.5, maxTokens: 1500 },
      });

      if (!response.success) {
        console.error('[AIBrain.analyzeFormation] Proxy error:', response.error);
        return this.fallbackFormationAnalysis(formationName);
      }

      const parsed = extractJSON(response.data);
      if (parsed && parsed.formation) {
        return {
          formation: String(parsed.formation),
          personnelPackage: String(parsed.personnelPackage || '11'),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
          defensiveAdjustments: Array.isArray(parsed.defensiveAdjustments) ? parsed.defensiveAdjustments.map(String) : [],
          recommendedConcepts: Array.isArray(parsed.recommendedConcepts)
            ? parsed.recommendedConcepts.map((c: any) => ({
                name: String(c.name || ''),
                description: String(c.description || ''),
                targetCoverage: String(c.targetCoverage || ''),
              }))
            : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
        };
      }

      console.warn('[AIBrain.analyzeFormation] Could not parse AI response, using fallback');
      return this.fallbackFormationAnalysis(formationName);
    } catch (error) {
      console.error('[AIBrain.analyzeFormation] Exception:', error, 'Formation:', formation);
      return this.fallbackFormationAnalysis(formationName);
    }
  }

  /**
   * Given an offensive formation and game situation, identify likely coverage
   * and recommend route combinations that stress it.
   */
  async getCoverageRecommendation(situation: {
    offensiveFormation?: string;
    personnel?: string;
    down?: number;
    distance?: number;
    fieldPosition?: string;
    tendencies?: string;
  }): Promise<{
    likelyCoverage: string;
    coverageDescription: string;
    routeCombinations: Array<{
      name: string;
      routes: string[];
      stressPoint: string;
      confidence: number;
    }>;
    overallConfidence: number;
    reasoning: string[];
  }> {
    const {
      offensiveFormation = 'Shotgun Trips',
      personnel = '11',
      down = 1,
      distance = 10,
      fieldPosition,
      tendencies,
    } = situation;

    const prompt = `[ROLE] You are a veteran defensive coordinator turned offensive analyst. You excel at reading defensive coverage shells pre-snap and identifying the route combinations that stress each coverage.

[CONTEXT]
Offensive Formation: ${offensiveFormation}
Personnel: ${personnel} personnel
Down & Distance: ${down} and ${distance}
${fieldPosition ? `Field Position: ${fieldPosition}` : ''}
${tendencies ? `Opponent Tendencies: ${tendencies}` : ''}

[TASK] Identify the most likely defensive coverage against this formation and situation, then recommend 2-3 route combinations that attack it. For each route combination, specify the individual routes by position, where the coverage stress point is, and confidence level.

Use correct terminology:
- Coverage shells: Cover 0, Cover 1, Cover 2, Cover 3, Tampa 2, Cover 4/Quarters, Cover 6
- Route tree: 0 (Hitch), 1 (Flat), 2 (Slant), 3 (Comeback), 4 (Curl), 5 (Out), 6 (Dig/In), 7 (Corner/Flag), 8 (Post), 9 (Go/Fly)
- Drop types: 3-step, 5-step, 7-step

[FORMAT] Return your response as JSON matching this exact schema:
{
  "likelyCoverage": "Coverage name (e.g., Cover 3)",
  "coverageDescription": "Brief description of this coverage and why it's likely here",
  "routeCombinations": [
    {
      "name": "Combination name (e.g., Smash, Levels, Four Verts)",
      "routes": ["X - 9 (Go)", "H - 7 (Corner)", "Y - 6 (Dig)", "Z - 1 (Flat)"],
      "stressPoint": "Where this combination creates the conflict for the defense",
      "confidence": <0.0-1.0>
    }
  ],
  "overallConfidence": <0.0-1.0>,
  "reasoning": ["analytical reasoning for the coverage read and recommendations"]
}

[CONSTRAINTS]
- Route combinations must be real, established concepts
- Stress points must be schematically valid against the identified coverage
- Account for down and distance in aggressiveness of recommendations`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'play_suggestion',
        data: { prompt, context: situation },
        options: { temperature: 0.5, maxTokens: 1500 },
      });

      if (!response.success) {
        console.error('[AIBrain.getCoverageRecommendation] Proxy error:', response.error);
        return this.fallbackCoverageRecommendation(situation);
      }

      const parsed = extractJSON(response.data);
      if (parsed && parsed.likelyCoverage) {
        return {
          likelyCoverage: String(parsed.likelyCoverage),
          coverageDescription: String(parsed.coverageDescription || ''),
          routeCombinations: Array.isArray(parsed.routeCombinations)
            ? parsed.routeCombinations.map((r: any) => ({
                name: String(r.name || ''),
                routes: Array.isArray(r.routes) ? r.routes.map(String) : [],
                stressPoint: String(r.stressPoint || ''),
                confidence: typeof r.confidence === 'number' ? r.confidence : 0.7,
              }))
            : [],
          overallConfidence: typeof parsed.overallConfidence === 'number' ? parsed.overallConfidence : 0.7,
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.map(String) : [],
        };
      }

      console.warn('[AIBrain.getCoverageRecommendation] Could not parse AI response, using fallback');
      return this.fallbackCoverageRecommendation(situation);
    } catch (error) {
      console.error('[AIBrain.getCoverageRecommendation] Exception:', error, 'Situation:', situation);
      return this.fallbackCoverageRecommendation(situation);
    }
  }

  /**
   * Generate specific drill suggestions for a practice focus area and player level.
   * Returns 3-5 drills with setup instructions, rep counts, and coaching points.
   */
  async generateDrillSuggestions(focus: string, playerLevel: string): Promise<{
    drills: Array<{
      name: string;
      category: string;
      duration: number;
      setup: string;
      repCount: string;
      coachingPoints: string[];
      variations: string[];
    }>;
    confidence: number;
    reasoning: string[];
  }> {
    const prompt = `[ROLE] You are an expert football position coach with 15+ years of experience running drills at the ${playerLevel} level. You know how to maximize reps, teach fundamentals, and keep drills game-speed realistic.

[CONTEXT]
Practice Focus: ${focus}
Player Experience Level: ${playerLevel}

[TASK] Suggest 4 specific football drills for "${focus}" appropriate for ${playerLevel} players. For each drill, provide:
- The real drill name (not made up)
- Category (individual, group, team)
- Duration in minutes
- Setup instructions (how to organize players, equipment, field markings)
- Rep count or structure
- 2-3 coaching emphasis points
- 1-2 variations for progression or regression

Use real football coaching drill names — Pat and Go, Gauntlet, Oklahoma, 1-on-1s, 7-on-7, Inside Run, Angle Tackle, W Drill, Cone Drills, Bag Drills, Route Trees, etc.

[FORMAT] Return your response as JSON matching this exact schema:
{
  "drills": [
    {
      "name": "Real drill name",
      "category": "individual | group | team",
      "duration": <minutes as number>,
      "setup": "Setup instructions",
      "repCount": "Rep structure (e.g., 3 sets of 5 reps each side)",
      "coachingPoints": ["coaching emphasis"],
      "variations": ["drill variations"]
    }
  ],
  "confidence": <0.0-1.0>,
  "reasoning": ["why these drills fit the focus and level"]
}

[CONSTRAINTS]
- All drill names must be real coaching drills used at the specified level
- Duration must be realistic for the drill type
- Coaching points must be technically accurate
- Variations must appropriately scale difficulty for the player level`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'drill_suggestions',
        data: { prompt, context: { focus, playerLevel } },
        options: { temperature: 0.7, maxTokens: 1500 },
      });

      if (!response.success) {
        console.error('[AIBrain.generateDrillSuggestions] Proxy error:', response.error);
        return this.fallbackDrillSuggestions(focus, playerLevel);
      }

      const parsed = extractJSON(response.data);
      if (parsed && Array.isArray(parsed.drills) && parsed.drills.length > 0) {
        return {
          drills: parsed.drills.map((d: any) => ({
            name: String(d.name || 'Unnamed Drill'),
            category: String(d.category || 'group'),
            duration: Number(d.duration) || 10,
            setup: String(d.setup || ''),
            repCount: String(d.repCount || ''),
            coachingPoints: Array.isArray(d.coachingPoints) ? d.coachingPoints.map(String) : [],
            variations: Array.isArray(d.variations) ? d.variations.map(String) : [],
          })),
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.map(String) : [],
        };
      }

      console.warn('[AIBrain.generateDrillSuggestions] Could not parse AI response, using fallback');
      return this.fallbackDrillSuggestions(focus, playerLevel);
    } catch (error) {
      console.error('[AIBrain.generateDrillSuggestions] Exception:', error, 'Focus:', focus, 'Level:', playerLevel);
      return this.fallbackDrillSuggestions(focus, playerLevel);
    }
  }

  /**
   * Given player data, return development priorities and drill focus areas.
   */
  async assessPlayerDevelopment(playerData: {
    position?: string;
    experienceLevel?: string;
    notes?: string;
    stats?: any;
    name?: string;
  }): Promise<{
    developmentPriorities: string[];
    suggestedDrills: Array<{ name: string; focus: string; frequency: string }>;
    strengthAreas: string[];
    improvementAreas: string[];
    confidence: number;
    reasoning: string[];
  }> {
    const {
      position = 'athlete',
      experienceLevel = 'intermediate',
      notes = '',
      stats,
      name,
    } = playerData;

    const prompt = `[ROLE] You are a football player development specialist who creates individualized improvement plans. You understand position-specific skill progressions and how to prioritize development areas.

[CONTEXT]
${name ? `Player: ${name}` : ''}
Position: ${position}
Experience Level: ${experienceLevel}
${notes ? `Coach Notes: ${notes}` : ''}
${stats ? `Stats/Metrics: ${JSON.stringify(stats)}` : ''}

[TASK] Assess this player's development needs and create a focused improvement plan:
1. Identify 3-4 development priorities ordered by impact
2. Suggest 3-4 specific drills with focus area and recommended frequency
3. Identify 2-3 strength areas to maintain
4. Identify 2-3 areas needing the most improvement

Be position-specific. A quarterback's development plan looks completely different from a linebacker's.

[FORMAT] Return your response as JSON matching this exact schema:
{
  "developmentPriorities": ["Priority descriptions ordered by importance"],
  "suggestedDrills": [
    {
      "name": "Real drill name",
      "focus": "What this drill develops",
      "frequency": "How often (e.g., daily, 3x/week, every practice)"
    }
  ],
  "strengthAreas": ["areas where player is already strong"],
  "improvementAreas": ["areas needing the most work"],
  "confidence": <0.0-1.0>,
  "reasoning": ["reasoning for the assessment"]
}

[CONSTRAINTS]
- Drill names must be real, not invented
- Priorities must be position-appropriate
- Frequency recommendations must be realistic for the experience level`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'performance_analysis',
        data: { prompt, context: playerData },
        options: { temperature: 0.6, maxTokens: 1200 },
      });

      if (!response.success) {
        console.error('[AIBrain.assessPlayerDevelopment] Proxy error:', response.error);
        return this.fallbackPlayerDevelopment(playerData);
      }

      const parsed = extractJSON(response.data);
      if (parsed && Array.isArray(parsed.developmentPriorities)) {
        return {
          developmentPriorities: parsed.developmentPriorities.map(String),
          suggestedDrills: Array.isArray(parsed.suggestedDrills)
            ? parsed.suggestedDrills.map((d: any) => ({
                name: String(d.name || ''),
                focus: String(d.focus || ''),
                frequency: String(d.frequency || ''),
              }))
            : [],
          strengthAreas: Array.isArray(parsed.strengthAreas) ? parsed.strengthAreas.map(String) : [],
          improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas.map(String) : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.map(String) : [],
        };
      }

      console.warn('[AIBrain.assessPlayerDevelopment] Could not parse AI response, using fallback');
      return this.fallbackPlayerDevelopment(playerData);
    } catch (error) {
      console.error('[AIBrain.assessPlayerDevelopment] Exception:', error, 'Player:', playerData);
      return this.fallbackPlayerDevelopment(playerData);
    }
  }

  // ============================================
  // PRIORITY 3 — Complete Intelligence Layer
  // ============================================

  /**
   * Generate a high-level game plan: 3-5 offensive concepts, personnel emphasis,
   * and situational recommendations.
   */
  async generateGamePlan(
    opponentTendencies: any,
    teamStrengths: any
  ): Promise<{
    offensiveConcepts: Array<{ name: string; description: string; whenToUse: string }>;
    personnelEmphasis: Array<{ package: string; percentage: number; rationale: string }>;
    situationalRecommendations: Array<{ situation: string; recommendation: string }>;
    confidence: number;
    reasoning: string[];
  }> {
    const opponentStr = typeof opponentTendencies === 'string'
      ? opponentTendencies
      : JSON.stringify(opponentTendencies || {});

    const strengthsStr = typeof teamStrengths === 'string'
      ? teamStrengths
      : JSON.stringify(teamStrengths || {});

    const prompt = `[ROLE] You are a head football coach preparing a game plan for this week's opponent. You balance schematic advantages with your team's identity and personnel strengths.

[CONTEXT]
Opponent Tendencies: ${opponentStr}
Our Team Strengths: ${strengthsStr}

[TASK] Generate a comprehensive game plan with:
1. 3-5 offensive concepts to feature this week — each with when and why to call it
2. Personnel package distribution — how much 11, 12, 21, etc. and why
3. 4-5 situational recommendations (red zone, 3rd and long, 2-minute, goal line, backed up)

Ground every recommendation in football logic. Reference real concepts (RPO, Play Action, Screen Game, Quick Game, Dropback Pass, Zone Run, Gap Run) and real coverage/defensive tendencies.

[FORMAT] Return your response as JSON matching this exact schema:
{
  "offensiveConcepts": [
    {
      "name": "Concept name (e.g., Inside Zone RPO, Bootleg Pass, Quick Game)",
      "description": "What it is and why it works against this opponent",
      "whenToUse": "Situations where this concept is most effective"
    }
  ],
  "personnelEmphasis": [
    {
      "package": "Personnel (e.g., 11, 12, 21)",
      "percentage": <estimated percentage of snaps>,
      "rationale": "Why this package gets this many snaps"
    }
  ],
  "situationalRecommendations": [
    {
      "situation": "Situation name (e.g., Red Zone, 3rd and Long)",
      "recommendation": "What to do in this situation and why"
    }
  ],
  "confidence": <0.0-1.0>,
  "reasoning": ["high-level strategic reasoning"]
}

[CONSTRAINTS]
- All concepts must be real football concepts
- Personnel percentages must sum to approximately 100
- Situational recs must be specific, not generic
- Everything must be grounded in the opponent tendencies provided`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'play_suggestion',
        data: { prompt, context: { opponentTendencies, teamStrengths } },
        options: { temperature: 0.6, maxTokens: 2000 },
      });

      if (!response.success) {
        console.error('[AIBrain.generateGamePlan] Proxy error:', response.error);
        return this.fallbackGamePlan();
      }

      const parsed = extractJSON(response.data);
      if (parsed && Array.isArray(parsed.offensiveConcepts) && parsed.offensiveConcepts.length > 0) {
        return {
          offensiveConcepts: parsed.offensiveConcepts.map((c: any) => ({
            name: String(c.name || ''),
            description: String(c.description || ''),
            whenToUse: String(c.whenToUse || ''),
          })),
          personnelEmphasis: Array.isArray(parsed.personnelEmphasis)
            ? parsed.personnelEmphasis.map((p: any) => ({
                package: String(p.package || ''),
                percentage: Number(p.percentage) || 0,
                rationale: String(p.rationale || ''),
              }))
            : [],
          situationalRecommendations: Array.isArray(parsed.situationalRecommendations)
            ? parsed.situationalRecommendations.map((s: any) => ({
                situation: String(s.situation || ''),
                recommendation: String(s.recommendation || ''),
              }))
            : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.map(String) : [],
        };
      }

      console.warn('[AIBrain.generateGamePlan] Could not parse AI response, using fallback');
      return this.fallbackGamePlan();
    } catch (error) {
      console.error('[AIBrain.generateGamePlan] Exception:', error);
      return this.fallbackGamePlan();
    }
  }

  /**
   * Generate a brief coaching insight or motivational focus point.
   * Surfaces in the dashboard as an AI insight card.
   */
  async getMotivationalInsight(teamContext: {
    teamName?: string;
    record?: string;
    recentResults?: string[];
    seasonPhase?: string;
    upcomingOpponent?: string;
    practiceNotes?: string;
  }): Promise<{
    insight: string;
    focusPoint: string;
    context: string;
    confidence: number;
  }> {
    const {
      teamName = 'the team',
      record,
      recentResults,
      seasonPhase = 'regular season',
      upcomingOpponent,
      practiceNotes,
    } = teamContext;

    const prompt = `[ROLE] You are a veteran football coach known for connecting with players and finding the right message at the right time. You draw from coaching legends like Vince Lombardi, Tony Dungy, and Nick Saban.

[CONTEXT]
Team: ${teamName}
${record ? `Record: ${record}` : ''}
${recentResults ? `Recent Results: ${recentResults.join(', ')}` : ''}
Season Phase: ${seasonPhase}
${upcomingOpponent ? `Upcoming Opponent: ${upcomingOpponent}` : ''}
${practiceNotes ? `Practice Notes: ${practiceNotes}` : ''}

[TASK] Generate a brief coaching insight with:
1. A motivational insight (2-3 sentences) that a coach can share with the team or reflect on
2. A specific focus point for this week's practice or preparation
3. Context for why this message matters right now

The tone should be authentic, not generic motivational poster material. Ground it in the team's actual situation.

[FORMAT] Return your response as JSON matching this exact schema:
{
  "insight": "The motivational insight (2-3 sentences)",
  "focusPoint": "Specific practice or preparation focus for this week",
  "context": "Why this message matters given the team's situation",
  "confidence": <0.0-1.0>
}

[CONSTRAINTS]
- Must feel authentic, not generic
- Must be appropriate for the season phase
- Focus point must be actionable, not abstract`;

    try {
      const response = await this.proxy.makeRequest({
        type: 'conversation',
        data: { prompt, context: teamContext },
        options: { temperature: 0.8, maxTokens: 600 },
      });

      if (!response.success) {
        console.error('[AIBrain.getMotivationalInsight] Proxy error:', response.error);
        return this.fallbackMotivationalInsight(teamContext);
      }

      const parsed = extractJSON(response.data);
      if (parsed && parsed.insight) {
        return {
          insight: String(parsed.insight),
          focusPoint: String(parsed.focusPoint || ''),
          context: String(parsed.context || ''),
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        };
      }

      // If the response is a plain string, wrap it
      if (typeof response.data === 'string' && response.data.length > 10) {
        return {
          insight: response.data.slice(0, 300),
          focusPoint: 'Focus on fundamentals and effort in every rep.',
          context: 'AI-generated coaching insight based on team context.',
          confidence: 0.6,
        };
      }

      console.warn('[AIBrain.getMotivationalInsight] Could not parse AI response, using fallback');
      return this.fallbackMotivationalInsight(teamContext);
    } catch (error) {
      console.error('[AIBrain.getMotivationalInsight] Exception:', error);
      return this.fallbackMotivationalInsight(teamContext);
    }
  }

  // ============================================
  // FEEDBACK LOOP
  // ============================================

  /**
   * Record outcome feedback for AI suggestions.
   * Logs locally for now; can be extended to send to analytics.
   */
  recordOutcome(type: string, outcome: 'success' | 'failure' | 'neutral') {
    const entry = { type, outcome, timestamp: Date.now() };
    this.outcomeLog.push(entry);
    // Keep only the last 100 entries to prevent memory growth
    if (this.outcomeLog.length > 100) {
      this.outcomeLog = this.outcomeLog.slice(-100);
    }
    console.info('[AIBrain.recordOutcome]', entry);
  }

  // ============================================
  // FALLBACK RESPONSES
  // ============================================

  private fallbackPracticePlan(params: { duration: number; goals: string[] }): {
    plan: { periods: Array<{ name: string; duration: number; intensity: string; drills: string[]; coachingPoints?: string[] }> };
    insights: string[];
    confidence: number;
    alternatives: any[];
  } {
    const d = params.duration;
    const warmupTime = Math.round(d * 0.12);
    const skillTime = Math.round(d * 0.45);
    const teamTime = Math.round(d * 0.35);
    const cooldownTime = d - warmupTime - skillTime - teamTime;

    return {
      plan: {
        periods: [
          {
            name: 'Dynamic Warm-Up',
            duration: warmupTime,
            intensity: 'low',
            drills: ['High Knees & Butt Kicks', 'Karaoke / Carioca', 'Backpedal-to-Sprint', 'Position-Specific Stretch'],
            coachingPoints: ['Full range of motion', 'Gradually increase tempo'],
          },
          {
            name: 'Individual / Position Drills',
            duration: Math.round(skillTime * 0.5),
            intensity: 'medium',
            drills: ['Stance & Start (OL/DL)', 'Route Tree Reps (WR/TE)', 'Drop-Back Footwork (QB)', 'Angle Tackle Circuit (LB/DB)'],
            coachingPoints: ['Technique first, speed second', 'Coach on the move'],
          },
          {
            name: '7-on-7 / Pass Skeleton',
            duration: Math.round(skillTime * 0.5),
            intensity: 'high',
            drills: ['Install: Mesh Concept vs Cover 3', 'Smash Concept vs Cover 2', 'Red Zone Quick Game'],
            coachingPoints: ['Read progression discipline', 'Defensive eyes on QB'],
          },
          {
            name: 'Team Period (11-on-11)',
            duration: teamTime,
            intensity: 'high',
            drills: ['Inside Zone / Outside Zone Run Game', 'Play Action off Zone Run', 'Situational: 3rd Down Conversions'],
            coachingPoints: ['Tempo between reps', 'Emphasize pre-snap alignment'],
          },
          {
            name: 'Cool-Down & Review',
            duration: cooldownTime,
            intensity: 'low',
            drills: ['Static Stretching', 'Conditioning Sprints (4x40 yards)', 'Huddle: Key Takeaways'],
            coachingPoints: ['Reinforce one teaching point per position group'],
          },
        ],
      },
      insights: [
        'Fallback plan generated — AI proxy was unavailable.',
        `Plan covers ${params.goals.join(', ')} across ${d} minutes.`,
        'Review and customize periods to match your specific team needs.',
      ],
      confidence: 0.5,
      alternatives: [],
    };
  }

  private fallbackPlaySuggestions(context: any): {
    suggestion: string;
    confidence: number;
    urgency: string;
    reasoning: string[];
    suggestions: Array<{ name: string; concept: string; reasoning: string; confidence: number }>;
  } {
    const down = context?.down || 1;
    const distance = context?.distance || 10;
    const isPassingDown = (down === 3 && distance > 5) || (down === 2 && distance > 8);

    return {
      suggestion: isPassingDown ? 'Trips Right Y-Cross' : 'Inside Zone Right',
      confidence: 0.5,
      urgency: down >= 3 ? 'high' : 'medium',
      reasoning: ['Fallback suggestion — AI proxy was unavailable. Review situation manually.'],
      suggestions: [
        {
          name: isPassingDown ? 'Trips Right Y-Cross' : 'Inside Zone Right',
          concept: isPassingDown
            ? 'Y-Cross floods the intermediate zone with a crossing route over the middle, attacking Cover 3 windows.'
            : 'Inside Zone attacks the A and B gaps with zone blocking, reading the backside defensive end.',
          reasoning: 'Fallback suggestion based on down and distance.',
          confidence: 0.5,
        },
        {
          name: 'Quick Game: Slant-Flat',
          concept: 'Slant-Flat combination gives a quick-rhythm throw with a high-low read on the flat defender.',
          reasoning: 'Safe, high-percentage concept suitable for most situations.',
          confidence: 0.45,
        },
      ],
    };
  }

  private fallbackFormationAnalysis(formationName: string): {
    formation: string;
    personnelPackage: string;
    strengths: string[];
    weaknesses: string[];
    defensiveAdjustments: string[];
    recommendedConcepts: Array<{ name: string; description: string; targetCoverage: string }>;
    confidence: number;
  } {
    return {
      formation: formationName,
      personnelPackage: '11',
      strengths: [
        'Fallback analysis — AI proxy was unavailable.',
        'Spread formations create horizontal stress on the defense.',
        'Multiple eligible receivers force defensive personnel matchups.',
      ],
      weaknesses: ['Review manually for formation-specific weaknesses.'],
      defensiveAdjustments: ['Expect nickel/dime personnel against spread looks.'],
      recommendedConcepts: [
        { name: 'Mesh', description: 'Crossing routes stress man coverage.', targetCoverage: 'Cover 1 / Man' },
        { name: 'Smash', description: 'Corner-Hitch combo attacks Cover 2 corners.', targetCoverage: 'Cover 2' },
      ],
      confidence: 0.4,
    };
  }

  private fallbackCoverageRecommendation(situation: any): {
    likelyCoverage: string;
    coverageDescription: string;
    routeCombinations: Array<{ name: string; routes: string[]; stressPoint: string; confidence: number }>;
    overallConfidence: number;
    reasoning: string[];
  } {
    return {
      likelyCoverage: 'Cover 3',
      coverageDescription: 'Fallback analysis — AI proxy was unavailable. Cover 3 is the most common coverage shell.',
      routeCombinations: [
        {
          name: 'Four Verts',
          routes: ['X - 9 (Go)', 'H - 8 (Seam)', 'Y - 8 (Seam)', 'Z - 9 (Go)'],
          stressPoint: 'Stresses the 3 deep defenders with 4 vertical threats.',
          confidence: 0.4,
        },
        {
          name: 'Smash',
          routes: ['X - 0 (Hitch)', 'Z - 7 (Corner)'],
          stressPoint: 'High-low read on the corner defender.',
          confidence: 0.4,
        },
      ],
      overallConfidence: 0.4,
      reasoning: ['Fallback: Cover 3 is statistically the most common coverage in football.'],
    };
  }

  private fallbackDrillSuggestions(focus: string, playerLevel: string): {
    drills: Array<{ name: string; category: string; duration: number; setup: string; repCount: string; coachingPoints: string[]; variations: string[] }>;
    confidence: number;
    reasoning: string[];
  } {
    return {
      drills: [
        {
          name: 'Pat and Go',
          category: 'individual',
          duration: 8,
          setup: 'Two lines facing each other, 5 yards apart. Ball carrier and defender.',
          repCount: '3 reps per player per side',
          coachingPoints: ['Pad level stays low', 'Drive through contact', 'Finish every rep'],
          variations: ['Add a second defender', 'Start from different stances'],
        },
        {
          name: 'Route Tree Reps',
          category: 'group',
          duration: 10,
          setup: 'Receivers line up on the line of scrimmage. QB throws to each route.',
          repCount: '2 reps per route (0-9)',
          coachingPoints: ['Crisp breaks', 'Eyes to the QB at the top of the route', 'Catch through the hands'],
          variations: ['Add a DB for press coverage', 'Vary snap count timing'],
        },
        {
          name: 'Inside Run Fit Drill',
          category: 'group',
          duration: 10,
          setup: 'Offensive and defensive linemen in a 3-on-3 or 4-on-4 box formation.',
          repCount: '5 reps per group, alternate offense/defense',
          coachingPoints: ['Gap integrity', 'Eyes on blocking scheme keys', 'Tackle through the ball carrier'],
          variations: ['Add a pulling guard', 'Vary the run scheme (inside zone, power, counter)'],
        },
      ],
      confidence: 0.4,
      reasoning: [`Fallback drills for "${focus}" at the ${playerLevel} level. AI proxy was unavailable.`],
    };
  }

  private fallbackPlayerDevelopment(playerData: any): {
    developmentPriorities: string[];
    suggestedDrills: Array<{ name: string; focus: string; frequency: string }>;
    strengthAreas: string[];
    improvementAreas: string[];
    confidence: number;
    reasoning: string[];
  } {
    const position = playerData?.position || 'athlete';
    return {
      developmentPriorities: [
        `Improve ${position}-specific fundamentals`,
        'Increase football IQ through film study',
        'Build position-specific strength and conditioning',
      ],
      suggestedDrills: [
        { name: 'Position-Specific Footwork', focus: 'Agility and movement', frequency: 'Every practice' },
        { name: 'Film Review Sessions', focus: 'Football IQ', frequency: '2x per week' },
        { name: 'Strength Training', focus: 'Physical development', frequency: '3x per week' },
      ],
      strengthAreas: ['Coachability', 'Effort level'],
      improvementAreas: ['Technical refinement', 'Game-speed decision making'],
      confidence: 0.4,
      reasoning: ['Fallback assessment — AI proxy was unavailable. Review player film for detailed analysis.'],
    };
  }

  private fallbackGamePlan(): {
    offensiveConcepts: Array<{ name: string; description: string; whenToUse: string }>;
    personnelEmphasis: Array<{ package: string; percentage: number; rationale: string }>;
    situationalRecommendations: Array<{ situation: string; recommendation: string }>;
    confidence: number;
    reasoning: string[];
  } {
    return {
      offensiveConcepts: [
        { name: 'Inside Zone', description: 'Foundation run play that sets up play-action.', whenToUse: 'Early downs, establish the run game.' },
        { name: 'Quick Game (Slant-Flat)', description: 'High-percentage throws to get the ball out fast.', whenToUse: 'Facing pressure or aggressive man coverage.' },
        { name: 'Play Action Bootleg', description: 'Roll the QB out after a run fake to attack the edge.', whenToUse: 'After establishing the run, 2nd and medium.' },
      ],
      personnelEmphasis: [
        { package: '11', percentage: 55, rationale: 'Spread the field and create matchups.' },
        { package: '12', percentage: 30, rationale: 'Extra blocker for run game and play-action.' },
        { package: '21', percentage: 15, rationale: 'Short yardage and goal line situations.' },
      ],
      situationalRecommendations: [
        { situation: 'Red Zone', recommendation: 'Compressed formations, quick rhythm passing, and goal-line power.' },
        { situation: '3rd and Long', recommendation: 'Spread the field, use Mesh or Levels concepts to attack the intermediate zones.' },
        { situation: '2-Minute Drill', recommendation: 'Quick outs and sideline routes to stop the clock. Hurry-up tempo.' },
      ],
      confidence: 0.4,
      reasoning: ['Fallback game plan — AI proxy was unavailable. Customize based on film study.'],
    };
  }

  private fallbackMotivationalInsight(teamContext: any): {
    insight: string;
    focusPoint: string;
    context: string;
    confidence: number;
  } {
    return {
      insight: 'Championship teams are built in practice, not on game day. The habits you build this week in every drill, every rep, every meeting — that is what shows up under the lights on Friday night.',
      focusPoint: 'Focus this week on finishing every rep at full speed. No loafing, no wasted reps.',
      context: teamContext?.seasonPhase === 'playoffs'
        ? 'Playoff preparation demands peak focus and attention to detail.'
        : 'Building consistent habits during the regular season creates the foundation for success.',
      confidence: 0.5,
    };
  }
}

// Export a singleton instance for convenience
export const AIBrain = CoachCoreAIBrain.getInstance();
