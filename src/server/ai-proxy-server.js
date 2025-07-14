// src/server/ai-proxy-server.js
// Server-side proxy for OpenAI API calls
// This should be deployed as a Cloud Function or Express middleware

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// ============================================
// CONFIGURATION
// ============================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_PROXY_TOKEN = process.env.AI_PROXY_TOKEN;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/ai', limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (token !== AI_PROXY_TOKEN) {
    return res.status(403).json({ error: 'Invalid access token' });
  }

  next();
};

// ============================================
// AI PROXY ENDPOINT
// ============================================

app.post('/api/ai', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { type, data, options } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }

    // Validate request type
    const validTypes = ['practice_plan', 'play_suggestion', 'performance_analysis', 'drill_suggestions', 'conversation', 'safety_validation'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    // Build prompt based on type
    const prompt = buildPrompt(type, data);
    
    // Make OpenAI API call
    const openaiResponse = await makeOpenAIRequest(prompt, options);
    
    // Parse and format response
    const response = parseResponse(type, openaiResponse);
    
    const latency = Date.now() - startTime;
    
    res.json({
      success: true,
      response,
      metadata: {
        model: options?.model || 'gpt-4',
        tokens: openaiResponse.usage?.total_tokens || 0,
        cost: calculateCost(openaiResponse.usage?.total_tokens || 0, options?.model || 'gpt-4'),
        latency
      }
    });

  } catch (error) {
    console.error('AI proxy error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// ============================================
// PROMPT BUILDERS
// ============================================

function buildPrompt(type, data) {
  switch (type) {
    case 'practice_plan':
      return buildPracticePlanPrompt(data);
    case 'play_suggestion':
      return buildPlaySuggestionPrompt(data);
    case 'performance_analysis':
      return buildPerformanceAnalysisPrompt(data);
    case 'drill_suggestions':
      return buildDrillSuggestionsPrompt(data);
    case 'conversation':
      return buildConversationPrompt(data);
    case 'safety_validation':
      return buildSafetyValidationPrompt(data);
    default:
      throw new Error(`Unknown request type: ${type}`);
  }
}

function buildPracticePlanPrompt(data) {
  const { teamContext, goals, duration, constraints } = data;
  
  return `You are an expert sports coach assistant. Generate a comprehensive practice plan for a ${teamContext.ageGroup} ${teamContext.sport} team.

Team Context:
- Sport: ${teamContext.sport}
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${teamContext.skillLevel || 'intermediate'}
- Team Size: ${teamContext.playerCount || 'unknown'} players
- Season Phase: ${teamContext.seasonPhase || 'regular'}

Practice Goals: ${goals.join(', ')}
Duration: ${duration} minutes
Constraints: ${constraints ? JSON.stringify(constraints) : 'None'}

Generate a structured practice plan with:
1. Warm-up activities (10-15% of time)
2. Skill development drills (40-50% of time)
3. Team practice scenarios (30-40% of time)
4. Cool-down and review (5-10% of time)

For each activity, include:
- Activity name and description
- Duration
- Equipment needed
- Coaching points
- Progression options

Format the response as a JSON object with the structure:
{
  "plan": {
    "periods": [
      {
        "name": "string",
        "duration": number,
        "activities": [
          {
            "name": "string",
            "description": "string",
            "duration": number,
            "equipment": ["string"],
            "coachingPoints": ["string"],
            "progression": "string"
          }
        ]
      }
    ]
  },
  "insights": {
    "focusAreas": ["string"],
    "recommendations": ["string"],
    "adaptations": ["string"]
  },
  "confidence": number,
  "reasoning": ["string"]
}`;
}

function buildPlaySuggestionPrompt(data) {
  const { gameContext, teamContext, playerContext } = data;
  
  return `You are an expert football coach. Suggest the best play for the current game situation.

Game Context:
- Down: ${gameContext.down}
- Distance: ${gameContext.distance} yards
- Field Position: ${gameContext.fieldPosition}
- Score Differential: ${gameContext.scoreDifferential}
- Time Remaining: ${gameContext.timeRemaining} seconds
- Weather: ${gameContext.weather || 'clear'}

Team Context:
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${teamContext.skillLevel || 'intermediate'}
- Available Players: ${playerContext ? playerContext.availablePlayers?.length || 'unknown' : 'unknown'}

Opponent Tendencies: ${gameContext.opponentTendency || 'balanced'}

Suggest the optimal play with:
1. Play name and formation
2. Player positions and routes
3. Success probability and reasoning
4. Alternative options
5. Safety considerations

Format the response as a JSON object with the structure:
{
  "suggestion": {
    "name": "string",
    "formation": "string",
    "description": "string",
    "players": [
      {
        "position": "string",
        "x": number,
        "y": number,
        "route": "string"
      }
    ],
    "routes": [
      {
        "playerId": number,
        "points": [{"x": number, "y": number}],
        "type": "string"
      }
    ]
  },
  "confidence": number,
  "reasoning": ["string"],
  "alternatives": [
    {
      "name": "string",
      "confidence": number,
      "reasoning": "string"
    }
  ],
  "safety": {
    "riskLevel": "low|medium|high",
    "considerations": ["string"]
  }
}`;
}

function buildPerformanceAnalysisPrompt(data) {
  const { teamContext, performanceData, timeRange } = data;
  
  return `You are an expert sports analyst. Analyze the team's performance data and provide insights.

Team Context:
- Sport: ${teamContext.sport}
- Age Group: ${teamContext.ageGroup}
- Time Range: ${timeRange}

Performance Data:
${JSON.stringify(performanceData, null, 2)}

Provide a comprehensive analysis including:
1. Key performance indicators
2. Strengths and weaknesses
3. Trends and patterns
4. Recommendations for improvement
5. Individual player insights (if data available)

Format the response as a JSON object with the structure:
{
  "analysis": {
    "summary": "string",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "trends": ["string"],
    "recommendations": ["string"]
  },
  "metrics": {
    "overallScore": number,
    "improvementAreas": ["string"],
    "excellenceAreas": ["string"]
  },
  "confidence": number,
  "reasoning": ["string"]
}`;
}

function buildDrillSuggestionsPrompt(data) {
  const { teamContext, focusAreas, duration, skillLevel } = data;
  
  return `You are an expert sports coach. Suggest drills for a ${teamContext.sport} team.

Team Context:
- Sport: ${teamContext.sport}
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${skillLevel}
- Focus Areas: ${focusAreas.join(', ')}
- Available Time: ${duration} minutes

Suggest 3-5 drills that:
1. Target the specified focus areas
2. Are appropriate for the age group and skill level
3. Can be completed within the time constraint
4. Require minimal equipment
5. Can be adapted for different group sizes

For each drill, include:
- Drill name and category
- Duration and setup time
- Equipment needed
- Step-by-step instructions
- Coaching points
- Variations and progressions

Format the response as a JSON object with the structure:
{
  "drills": [
    {
      "name": "string",
      "category": "string",
      "duration": number,
      "equipment": ["string"],
      "instructions": ["string"],
      "coachingPoints": ["string"],
      "variations": ["string"]
    }
  ],
  "confidence": number,
  "reasoning": ["string"]
}`;
}

function buildConversationPrompt(data) {
  const { message, conversationHistory, userContext, teamContext } = data;
  
  const history = conversationHistory
    ?.slice(-5) // Last 5 messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n') || '';

  return `You are an AI coaching assistant for Coach Core AI. You help coaches with practice planning, game strategy, and team management.

User Context:
- Role: ${userContext.roles?.join(', ') || 'coach'}
- Experience: ${userContext.persona || 'experienced_coach'}
- Team: ${teamContext ? `${teamContext.sport} ${teamContext.ageGroup}` : 'Not specified'}

Recent Conversation:
${history}

Current Message: ${message}

Provide a helpful, professional response that:
1. Addresses the user's question or concern
2. Offers practical coaching advice
3. Suggests relevant features or tools
4. Maintains a supportive, encouraging tone
5. Asks clarifying questions when needed

Keep your response concise but comprehensive. If appropriate, suggest specific actions or tools available in the app.`;
}

function buildSafetyValidationPrompt(data) {
  const { suggestion, teamContext, ageGroup } = data;
  
  const safetyRules = getSafetyRules(ageGroup);
  
  return `You are a safety expert for youth sports. Validate if this play suggestion is safe for the specified age group.

Play Suggestion:
${JSON.stringify(suggestion, null, 2)}

Safety Rules for Age Group:
${JSON.stringify(safetyRules, null, 2)}

Evaluate the safety of this play considering:
1. Physical risk to players
2. Age-appropriate complexity
3. Equipment requirements
4. Supervision needs
5. Injury prevention

Provide a safety assessment with:
- Overall safety rating (low/medium/high risk)
- Specific safety concerns
- Recommendations for modification
- Alternative safer options

Format the response as a JSON object with the structure:
{
  "isSafe": boolean,
  "riskLevel": "low|medium|high",
  "warnings": ["string"],
  "recommendations": ["string"],
  "modifications": ["string"],
  "alternatives": ["string"]
}`;
}

// ============================================
// OPENAI API CALL
// ============================================

async function makeOpenAIRequest(prompt, options = {}) {
  const messages = [
    {
      role: 'system',
      content: 'You are an expert sports coaching assistant. Provide helpful, accurate, and safe advice for coaches. Always respond with valid JSON when requested.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const requestBody = {
    model: options.model || 'gpt-4',
    messages,
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.7,
    stream: false
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
}

// ============================================
// RESPONSE PARSING
// ============================================

function parseResponse(type, openaiResponse) {
  const content = openaiResponse.choices[0]?.message?.content || '';
  
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    // If not JSON, return as plain text
    return {
      content,
      confidence: 0.8,
      reasoning: ['Response generated successfully']
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getSafetyRules(ageGroup) {
  const rules = {
    youth: {
      maxPlayers: 11,
      prohibitedPlays: ['blitz_all', 'quarterback_sneak', 'hook_and_ladder'],
      maxRouteDepth: 15,
      requiredRest: true,
      maxContact: 'minimal'
    },
    middle_school: {
      maxPlayers: 11,
      prohibitedPlays: ['blitz_all'],
      maxRouteDepth: 25,
      requiredRest: true,
      maxContact: 'moderate'
    },
    high_school: {
      maxPlayers: 11,
      prohibitedPlays: [],
      maxRouteDepth: 40,
      requiredRest: false,
      maxContact: 'full'
    },
    college: {
      maxPlayers: 11,
      prohibitedPlays: [],
      maxRouteDepth: 50,
      requiredRest: false,
      maxContact: 'full'
    }
  };

  return rules[ageGroup] || rules.high_school;
}

function calculateCost(tokens, model) {
  // Approximate cost calculation (prices may vary)
  const prices = {
    'gpt-4': 0.03, // per 1K tokens
    'gpt-4-turbo': 0.01, // per 1K tokens
    'gpt-3.5-turbo': 0.002 // per 1K tokens
  };
  
  const price = prices[model] || prices['gpt-4'];
  return (tokens / 1000) * price;
}

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/api/ai/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AI Proxy Server running on port ${PORT}`);
  });
}

module.exports = app; 