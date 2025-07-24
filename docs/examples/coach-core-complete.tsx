import React, { useState, useEffect, useCallback, useRef, memo, createContext, useContext } from 'react';
import { 
  Star, MessageSquare, TrendingUp, Users, Calendar, Award, Activity, 
  BarChart3, Target, Clock, ThumbsUp, Filter, Download, Share2,
  Bell, Mail, Settings, Check, X, AlertTriangle, Info, Smartphone,
  Sparkles, Shield, Route, Play, Square, ChevronLeft, ChevronRight,
  User, Edit3, Trash2, Save, PlusCircle, Grid, List, Search,
  Upload, FileText, Camera, Video, MessageCircle, Send,
  Zap, Brain, Eye, EyeOff, Lock, Unlock, Globe, Heart,
  Trophy, Badge, Gift, DollarSign, Monitor, Headphones,
  HelpCircle, Bug, Lightbulb, RotateCcw, Copy, ExternalLink,
  ChevronDown, ChevronUp, Menu, MoreVertical, Flag, Home
} from 'lucide-react';

// ============================================
// CONTEXT & STATE MANAGEMENT
// ============================================

const AppContext = createContext<any>(null);

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState({
    id: 'demo-user',
    email: 'coach@demo.com',
    role: 'head_coach',
    teamId: 'demo-team',
    persona: 'experienced_coach',
    preferences: {
      notifications: {
        email: true,
        sms: false,
        push: true,
        inApp: true
      },
      ai: {
        autoSuggest: false,
        onDemandOnly: true,
        confidenceThreshold: 0.7
      },
      privacy: {
        sharePlays: false,
        allowAnalytics: true
      }
    }
  });

  const [team, setTeam] = useState({
    id: 'demo-team',
    name: 'Demo Wildcats',
    sport: 'football',
    ageGroup: 'high_school',
    season: '2025',
    players: 22,
    coaches: 3,
    subscription: 'pro'
  });

  const [notifications, setNotifications] = useState([]);
  const [offline, setOffline] = useState(false);

  return (
    <AppContext.Provider value={{
      user, setUser,
      team, setTeam,
      notifications, setNotifications,
      offline, setOffline
    }}>
      {children}
    </AppContext.Provider>
  );
};

// ============================================
// PERSONA-BASED ONBOARDING SYSTEM
// ============================================

const PersonaPicker = ({ onPersonaSelect }) => {
  const personas = [
    {
      id: 'first_time_coach',
      title: 'First-Time Coach',
      description: 'New to coaching, need guidance on basics',
      icon: HelpCircle,
      color: 'blue',
      features: ['Step-by-step tutorials', 'Basic templates', 'Safety guidelines']
    },
    {
      id: 'experienced_coach',
      title: 'Experienced Coach',
      description: 'Seasoned coach looking for advanced tools',
      icon: Award,
      color: 'green',
      features: ['Advanced analytics', 'Custom plays', 'AI suggestions']
    },
    {
      id: 'parent_volunteer',
      title: 'Parent Volunteer',
      description: 'Helping out with simple coaching tasks',
      icon: Heart,
      color: 'purple',
      features: ['Simple drills', 'Attendance tracking', 'Safety focus']
    },
    {
      id: 'athletic_director',
      title: 'Athletic Director',
      description: 'Managing multiple teams and coaches',
      icon: Monitor,
      color: 'orange',
      features: ['Multi-team dashboard', 'Coach oversight', 'Compliance tracking']
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Coach Core AI</h1>
        <p className="text-lg text-gray-600">Let's personalize your experience. What describes you best?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map(persona => {
          const Icon = persona.icon;
          const colorClasses = {
            blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-900',
            green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-900',
            purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-900',
            orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-900'
          };

          return (
            <button
              key={persona.id}
              onClick={() => onPersonaSelect(persona.id)}
              className={`p-6 rounded-lg border-2 transition-all text-left ${colorClasses[persona.color]}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon size={24} />
                <h3 className="text-xl font-semibold">{persona.title}</h3>
              </div>
              <p className="text-sm mb-4 opacity-80">{persona.description}</p>
              <ul className="space-y-2">
                {persona.features.map((feature, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <Check size={14} />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// VISUAL TEMPLATE GALLERY
// ============================================

const TemplateGallery = ({ sport = 'football', onSelectTemplate, onStartFromScratch }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [category, setCategory] = useState('all');

  const templates = [
    {
      id: 'shotgun_spread',
      name: 'Shotgun Spread',
      category: 'offense',
      preview: '🏈 QB in shotgun, 4 WR spread formation',
      description: 'Versatile passing formation with multiple route options',
      complexity: 'intermediate',
      successRate: 72,
      usage: 'High school and above',
      players: 11,
      thumbnail: '/api/placeholder/200/150'
    },
    {
      id: 'i_formation',
      name: 'I-Formation',
      category: 'offense',
      preview: '🏈 Traditional I-Form with FB and RB',
      description: 'Classic power running formation',
      complexity: 'beginner',
      successRate: 68,
      usage: 'All levels',
      players: 11,
      thumbnail: '/api/placeholder/200/150'
    },
    {
      id: '4_3_defense',
      name: '4-3 Defense',
      category: 'defense',
      preview: '🛡️ 4 linemen, 3 linebackers formation',
      description: 'Balanced defensive formation',
      complexity: 'intermediate',
      successRate: 65,
      usage: 'High school and above',
      players: 11,
      thumbnail: '/api/placeholder/200/150'
    },
    {
      id: '3_4_defense',
      name: '3-4 Defense',
      category: 'defense',
      preview: '🛡️ 3 linemen, 4 linebackers formation',
      description: 'Flexible pass rush defense',
      complexity: 'advanced',
      successRate: 70,
      usage: 'Advanced teams only',
      players: 11,
      thumbnail: '/api/placeholder/200/150'
    }
  ];

  const filteredTemplates = category === 'all' 
    ? templates 
    : templates.filter(t => t.category === category);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Starting Point</h2>
          <p className="text-gray-600">Start with a proven template or build from scratch</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={onStartFromScratch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <PlusCircle size={16} />
            Start from Scratch
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {['all', 'offense', 'defense', 'special'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-lg capitalize transition-colors ${
              category === cat 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              onSelect={() => onSelectTemplate(template)} 
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map(template => (
            <TemplateListItem 
              key={template.id} 
              template={template} 
              onSelect={() => onSelectTemplate(template)} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TemplateCard = ({ template, onSelect }) => {
  const complexityColors = {
    beginner: 'text-green-600 bg-green-50',
    intermediate: 'text-yellow-600 bg-yellow-50',
    advanced: 'text-red-600 bg-red-50'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        <div className="text-4xl">{template.preview}</div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${complexityColors[template.complexity]}`}>
            {template.complexity}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>{template.players} players</span>
          <span>{template.successRate}% success rate</span>
        </div>
        
        <button
          onClick={onSelect}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Use This Template
        </button>
      </div>
    </div>
  );
};

const TemplateListItem = ({ template, onSelect }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
        {template.preview}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{template.name}</h3>
        <p className="text-sm text-gray-600">{template.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
          <span>{template.players} players</span>
          <span>{template.successRate}% success rate</span>
          <span className="capitalize">{template.complexity}</span>
        </div>
      </div>
    </div>
    
    <button
      onClick={onSelect}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Select
    </button>
  </div>
);

// ============================================
// AI SUGGESTION SYSTEM WITH SAFETY GUARDRAILS
// ============================================

const AISuggestionPanel = ({ teamContext, gameContext, onApplySuggestion }) => {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [safetyWarnings, setSafetyWarnings] = useState([]);

  const SAFETY_RULES = {
    youth: {
      maxContactDrills: 2,
      prohibitedPlays: ['full_contact_tackling', 'oklahoma_drill'],
      maxPracticeIntensity: 0.7,
      requiredBreaks: 10 // minutes per hour
    },
    high_school: {
      maxContactDrills: 4,
      prohibitedPlays: ['spear_tackle'],
      maxPracticeIntensity: 0.9,
      requiredBreaks: 5
    }
  };

  const generateSuggestion = async () => {
    setLoading(true);
    setSafetyWarnings([]);
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockSuggestion = {
        id: `ai_${Date.now()}`,
        type: 'play_suggestion',
        title: 'Quick Slant Right',
        description: 'Based on opponent tendencies, this play has 78% success probability',
        reasoning: [
          'Opponent shows weak right side coverage in film study',
          'Your WR #81 has 85% completion rate on slant routes',
          'Quick release counters their average 3.2s pass rush'
        ],
        confidence: 0.82,
        formation: 'shotgun',
        players: [
          { id: 1, position: 'QB', x: 300, y: 200, number: 12 },
          { id: 2, position: 'WR', x: 450, y: 150, number: 81 },
          { id: 3, position: 'RB', x: 250, y: 230, number: 23 }
        ],
        routes: [
          {
            playerId: 2,
            points: [{ x: 450, y: 150 }, { x: 480, y: 130 }, { x: 510, y: 110 }],
            type: 'slant',
            color: '#3b82f6'
          }
        ],
        alternatives: [
          { name: 'Screen Pass Left', confidence: 0.74 },
          { name: 'Draw Play', confidence: 0.68 }
        ],
        metadata: {
          situational: 'Works best on 1st and 2nd down',
          personnel: 'Requires skilled slot receiver',
          risk: 'Low risk, high reward'
        }
      };
      
      // Check safety rules
      const warnings = validateSafety(mockSuggestion, SAFETY_RULES[teamContext.ageGroup]);
      setSafetyWarnings(warnings);
      setSuggestion(mockSuggestion);
      
    } catch (error) {
      console.error('AI suggestion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateSafety = (suggestion, rules) => {
    const warnings = [];
    
    if (rules.prohibitedPlays.some(play => suggestion.title.toLowerCase().includes(play))) {
      warnings.push({
        type: 'prohibited',
        severity: 'high',
        message: `This play type is not recommended for ${teamContext.ageGroup} level`
      });
    }
    
    return warnings;
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    // Track feedback for AI learning
    console.log('AI Feedback:', { suggestionId: suggestion.id, feedback: type });
  };

  const handleApply = () => {
    if (safetyWarnings.some(w => w.severity === 'high')) {
      alert('Cannot apply play due to safety concerns');
      return;
    }
    onApplySuggestion(suggestion);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="text-purple-600" />
          AI Play Assistant
        </h3>
        <div className="flex items-center gap-2">
          {suggestion && (
            <span className="text-sm text-gray-500">
              Confidence: {(suggestion.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {!suggestion ? (
        <div className="text-center py-8">
          <button
            onClick={generateSuggestion}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Suggest a Play
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            AI will analyze your team's strengths and game situation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Safety Warnings */}
          {safetyWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Safety Advisory</p>
                  <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                    {safetyWarnings.map((warning, i) => (
                      <li key={i}>• {warning.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Main Suggestion */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-purple-900">{suggestion.title}</h4>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    size={14}
                    className={`${
                      i <= suggestion.confidence * 5 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <p className="text-sm text-purple-700 mb-3">{suggestion.description}</p>
            
            {/* Play Visualization */}
            <div className="bg-white rounded-lg p-3 mb-3">
              <div className="aspect-video bg-green-100 rounded flex items-center justify-center">
                <p className="text-sm text-green-700">Play diagram would render here</p>
              </div>
            </div>

            {/* Reasoning */}
            <div className="mb-3">
              <p className="text-xs font-medium text-purple-700 mb-1">Why this play?</p>
              <ul className="space-y-1">
                {suggestion.reasoning.map((reason, i) => (
                  <li key={i} className="text-xs text-purple-600 flex items-start gap-1">
                    <span className="text-purple-400 mt-0.5">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Metadata */}
            <div className="bg-white/60 rounded p-2 mb-3 text-xs">
              <div className="grid grid-cols-1 gap-1">
                <div><strong>Best for:</strong> {suggestion.metadata.situational}</div>
                <div><strong>Personnel:</strong> {suggestion.metadata.personnel}</div>
                <div><strong>Risk Level:</strong> {suggestion.metadata.risk}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleApply}
                disabled={safetyWarnings.some(w => w.severity === 'high')}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply This Play
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Try Another
              </button>
            </div>

            {/* Feedback */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-purple-200">
              <span className="text-xs text-purple-600">Was this helpful?</span>
              <button
                onClick={() => handleFeedback('helpful')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'
                }`}
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => handleFeedback('not_helpful')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'
                }`}
              >
                <ThumbsUp size={14} className="rotate-180" />
              </button>
            </div>
          </div>

          {/* Alternatives */}
          {suggestion.alternatives.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Other options:</p>
              <div className="space-y-2">
                {suggestion.alternatives.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{alt.name}</span>
                    <span className="text-xs text-gray-500">{(alt.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// PLAYER FEEDBACK SYSTEM
// ============================================

const PlayerFeedbackSystem = ({ drillId, playId, allowComments = true, moderated = true }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['😊', '😐', '😕', '💪', '🔥', '👍', '👎', '😴', '🤔'];

  const handleSubmit = () => {
    if (rating === 0) return;

    const feedback = {
      drillId,
      playId,
      rating,
      comment: comment.trim(),
      timestamp: new Date(),
      status: moderated ? 'pending' : 'approved'
    };

    console.log('Feedback submitted:', feedback);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setComment('');
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <Check className="text-green-600 mx-auto mb-2" size={24} />
        <p className="text-sm text-green-700">Thanks for your feedback!</p>
        {moderated && (
          <p className="text-xs text-green-600 mt-1">Your comment is being reviewed by coaches</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">How was this drill?</h4>
      
      {/* Star Rating */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(value => (
          <button
            key={value}
            onClick={() => setRating(value)}
            className="transition-all hover:scale-110"
          >
            <Star
              size={28}
              className={`${
                value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
      </div>

      {/* Emoji Quick Feedback */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-2">Quick reaction:</p>
        <div className="flex gap-2 flex-wrap">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => setComment(comment + emoji)}
              className="text-lg hover:scale-110 transition-transform p-1 hover:bg-gray-100 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Comment Box */}
      {allowComments && (
        <div className="mb-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any comments? (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            maxLength={200}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">{comment.length}/200 characters</p>
            {moderated && (
              <p className="text-xs text-gray-500">Comments reviewed by coaches</p>
            )}
          </div>
        </div>
      )}

      {rating > 0 && (
        <button
          onClick={handleSubmit}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Submit Feedback
        </button>
      )}
    </div>
  );
};

// ============================================
// COMPREHENSIVE DASHBOARD SYSTEM
// ============================================

const DashboardSelector = ({ userRole, onRoleChange }) => {
  const dashboards = {
    head_coach: { icon: Award, label: 'Head Coach', color: 'blue' },
    assistant_coach: { icon: Users, label: 'Assistant Coach', color: 'green' },
    athletic_director: { icon: Monitor, label: 'Athletic Director', color: 'purple' },
    player: { icon: User, label: 'Player', color: 'orange' },
    parent: { icon: Heart, label: 'Parent', color: 'pink' }
  };

  return (
    <div className="mb-6">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(dashboards).map(([role, { icon: Icon, label, color }]) => {
          const isActive = userRole === role;
          const colorClasses = {
            blue: isActive ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-600',
            green: isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-600',
            purple: isActive ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-600',
            orange: isActive ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-600',
            pink: isActive ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-gray-100 text-gray-600'
          };

          return (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${colorClasses[color]}`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CoachDashboard = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');

  const metrics = {
    attendance: { value: 85, trend: 5, label: 'Attendance Rate' },
    playSuccess: { value: 72, trend: 12, label: 'Play Success Rate' },
    drillRating: { value: 4.2, trend: 0.3, label: 'Avg Drill Rating' },
    playerLoad: { value: 82, trend: -3, label: 'Player Load Index' }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(metrics).map(([key, metric]) => (
          <div key={key} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="text-blue-600" size={20} />
              </div>
              <span className={`text-xs font-medium ${
                metric.trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend > 0 ? '+' : ''}{metric.trend}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}{key === 'drillRating' ? '/5' : '%'}</p>
            <p className="text-sm text-gray-600">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left">
            <Brain className="mb-2" size={24} />
            <p className="font-medium">Get AI Suggestion</p>
            <p className="text-sm opacity-75">Let AI analyze and suggest plays</p>
          </button>
          <button className="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left">
            <PlusCircle className="mb-2" size={24} />
            <p className="font-medium">Create New Play</p>
            <p className="text-sm opacity-75">Design custom plays</p>
          </button>
          <button className="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left">
            <Check className="mb-2" size={24} />
            <p className="font-medium">Take Attendance</p>
            <p className="text-sm opacity-75">Track player attendance</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'Practice plan created', time: '2 hours ago', icon: Calendar },
            { action: '3 new plays added to library', time: '1 day ago', icon: PlusCircle },
            { action: 'Roster updated with 2 new players', time: '2 days ago', icon: Users },
            { action: 'Game results logged (Win 21-14)', time: '3 days ago', icon: Trophy }
          ].map((activity, i) => {
            const Icon = activity.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <Icon className="text-gray-600" size={16} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PlayerDashboard = () => {
  const playerStats = {
    attendance: 92,
    skillRating: 4.1,
    badges: 7,
    practicesThisWeek: 3
  };

  const recentBadges = [
    { name: 'Perfect Attendance', icon: '🎯', earned: '2 days ago' },
    { name: 'Team Player', icon: '🤝', earned: '1 week ago' },
    { name: 'Drill Master', icon: '⚡', earned: '2 weeks ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Player Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{playerStats.attendance}%</p>
          <p className="text-sm text-gray-600">Attendance</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{playerStats.skillRating}/5</p>
          <p className="text-sm text-gray-600">Skill Rating</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">{playerStats.badges}</p>
          <p className="text-sm text-gray-600">Badges Earned</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-600">{playerStats.practicesThisWeek}</p>
          <p className="text-sm text-gray-600">This Week</p>
        </div>
      </div>

      {/* Recent Badges */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
        <div className="space-y-3">
          {recentBadges.map((badge, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-2xl">{badge.icon}</span>
              <div>
                <p className="font-medium text-gray-900">{badge.name}</p>
                <p className="text-sm text-gray-600">Earned {badge.earned}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Progress</h3>
        <div className="space-y-4">
          {[
            { skill: 'Passing Accuracy', level: 78, target: 85 },
            { skill: 'Route Running', level: 65, target: 75 },
            { skill: 'Conditioning', level: 92, target: 90 }
          ].map((skill, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{skill.skill}</span>
                <span className="text-gray-500">{skill.level}% / {skill.target}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(skill.level / skill.target) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// NOTIFICATION SYSTEM
// ============================================

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'practice_reminder',
      title: 'Practice Tomorrow',
      message: 'Team practice at 3:30 PM on Field 2. Don\'t forget your gear!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      priority: 'normal',
      actions: [
        { label: 'Mark Attending', action: 'attend' },
        { label: 'Can\'t Make It', action: 'absent' }
      ]
    },
    {
      id: 2,
      type: 'achievement',
      title: 'New Badge Earned!',
      message: 'Congratulations! You earned the "Perfect Attendance" badge.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: false,
      priority: 'low'
    }
  ]);

  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    push: true,
    inApp: true,
    categories: {
      practiceReminders: true,
      achievements: true,
      scheduleChanges: true,
      emergencyAlerts: true
    }
  });

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleAction = (notificationId, action) => {
    console.log('Notification action:', { notificationId, action });
    markAsRead(notificationId);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Preferences */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Delivery Methods</h4>
            <div className="space-y-2">
              {Object.entries({
                email: { icon: Mail, label: 'Email' },
                sms: { icon: MessageSquare, label: 'SMS' },
                push: { icon: Smartphone, label: 'Push Notifications' },
                inApp: { icon: Bell, label: 'In-App' }
              }).map(([key, { icon: Icon, label }]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Icon size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
            <div className="space-y-2">
              {Object.entries({
                practiceReminders: 'Practice Reminders',
                achievements: 'Achievements & Badges',
                scheduleChanges: 'Schedule Changes',
                emergencyAlerts: 'Emergency Alerts'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.categories[key]}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      categories: { ...prev.categories, [key]: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  {notification.type === 'practice_reminder' && <Calendar className="text-blue-600" size={20} />}
                  {notification.type === 'achievement' && <Trophy className="text-yellow-600" size={20} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  
                  {notification.actions && (
                    <div className="flex gap-2 mt-3">
                      {notification.actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(notification.id, action.action)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

const CoachCoreAIComplete = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userRole, setUserRole] = useState('head_coach');

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'playbook', label: 'Smart Playbook', icon: Route },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Brain },
    { id: 'templates', label: 'Templates', icon: Grid },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare }
  ];

  const handlePersonaSelect = (persona) => {
    console.log('Selected persona:', persona);
    setShowOnboarding(false);
    // Customize experience based on persona
  };

  if (showOnboarding) {
    return <PersonaPicker onPersonaSelect={handlePersonaSelect} />;
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Brain className="text-purple-600" />
                  Coach Core AI
                </h1>
                <div className="hidden md:flex gap-4">
                  {navigation.map(nav => {
                    const Icon = nav.icon;
                    return (
                      <button
                        key={nav.id}
                        onClick={() => setCurrentView(nav.id)}
                        className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                          currentView === nav.id 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={16} className="inline mr-1" />
                        {nav.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Show onboarding"
                >
                  <HelpCircle size={18} />
                </button>
                <div className="relative">
                  <Bell size={20} className="text-gray-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    2
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-700 capitalize">{userRole.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <DashboardSelector userRole={userRole} onRoleChange={setUserRole} />
              {userRole.includes('coach') || userRole === 'athletic_director' ? (
                <CoachDashboard />
              ) : (
                <PlayerDashboard />
              )}
            </div>
          )}

          {currentView === 'templates' && (
            <TemplateGallery
              sport="football"
              onSelectTemplate={(template) => console.log('Selected template:', template)}
              onStartFromScratch={() => console.log('Starting from scratch')}
            />
          )}

          {currentView === 'ai-assistant' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AISuggestionPanel
                teamContext={{ ageGroup: 'high_school', id: 'demo-team' }}
                gameContext={{}}
                onApplySuggestion={(suggestion) => console.log('Applied suggestion:', suggestion)}
              />
              <div className="space-y-6">
                <PlayerFeedbackSystem
                  drillId="demo-drill"
                  playId="demo-play"
                  allowComments={true}
                  moderated={true}
                />
              </div>
            </div>
          )}

          {currentView === 'notifications' && <NotificationCenter />}

          {currentView === 'feedback' && (
            <div className="max-w-2xl mx-auto">
              <PlayerFeedbackSystem
                drillId="demo-drill"
                playId="demo-play"
                allowComments={true}
                moderated={true}
              />
            </div>
          )}

          {currentView === 'playbook' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Playbook</h2>
              <p className="text-gray-600">Interactive playbook component would be integrated here.</p>
              <div className="mt-6 aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Playbook canvas would render here</p>
              </div>
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics Dashboard</h2>
              <p className="text-gray-600">Comprehensive analytics and insights would be displayed here.</p>
            </div>
          )}
        </main>

        {/* Offline Indicator */}
        <div className="fixed bottom-4 left-4">
          <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Online</span>
          </div>
        </div>
      </div>
    </AppProvider>
  );
};

export default CoachCoreAIComplete;