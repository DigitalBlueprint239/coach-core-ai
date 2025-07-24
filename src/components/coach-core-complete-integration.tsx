// Coach Core AI - Complete Integration
// This file contains all new features in one place for easy integration
// You can copy this entire file and gradually split it into modules

import React, { useState } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Heading,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Progress,
  Spinner,
  useToast
} from '@chakra-ui/react';

// ============================================
// SECTION 1: FIREBASE SERVICE (Mock Version)
// ============================================
// Replace this with actual Firebase config when ready
const mockFirebase = {
  auth: {
    currentUser: { uid: 'demo-user', email: 'demo@coachcore.ai', teamId: 'demo-team' }
  },
  
  teamService: {
    async createTeam(teamData) {
      console.log('Creating team:', teamData);
      return 'new-team-id';
    },
    async getTeam(teamId) {
      return {
        id: teamId,
        name: 'Demo Team',
        players: 20,
        coaches: 3
      };
    }
  },
  
  playService: {
    async savePlay(teamId, playData) {
      console.log('Saving play:', playData);
      return 'new-play-id';
    },
    async getPlays(teamId) {
      return [
        { id: '1', name: 'Shotgun Pass Right', type: 'pass', successRate: 0.75 },
        { id: '2', name: 'I-Form Run', type: 'run', successRate: 0.68 }
      ];
    }
  },
  
  analyticsService: {
    async trackPlayUsage(teamId, playId, result) {
      console.log('Tracking play usage:', { teamId, playId, result });
    },
    async getTeamAnalytics(teamId, dateRange) {
      return {
        attendance: 0.85,
        playSuccess: 0.72,
        avgDrillRating: 4.2
      };
    }
  }
};

// ============================================
// SECTION 2: AI PLAY SUGGESTION SYSTEM
// ============================================
const AIPlaySuggestion = ({ teamData, currentSituation, playerRoster, onApplyPlay, ageGroup = 'youth' }) => {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [safetyWarnings, setSafetyWarnings] = useState([]);

  const SAFETY_RULES = {
    youth: {
      maxPlayers: 11,
      prohibitedPlays: ['blitz_all', 'quarterback_sneak'],
      maxRouteDepth: 20,
      requiredRest: true
    },
    highSchool: {
      maxPlayers: 11,
      prohibitedPlays: [],
      maxRouteDepth: 40,
      requiredRest: false
    }
  };

  const generateSuggestion = async () => {
    setLoading(true);
    setSafetyWarnings([]);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockSuggestion = {
        id: 'ai_' + Date.now(),
        name: 'AI Suggested: Quick Slant Right',
        type: 'pass',
        formation: 'shotgun',
        confidence: 0.85,
        reasoning: [
          'Opponent shows weak coverage on right side',
          'Your WR #81 has 75% success rate on slant routes',
          'Quick release counters their pass rush tendency'
        ],
        players: [
          { id: 1, position: 'QB', x: 300, y: 200, number: 12 },
          { id: 2, position: 'WR', x: 450, y: 150, number: 81 },
          { id: 3, position: 'WR', x: 150, y: 150, number: 80 }
        ],
        routes: [
          { 
            playerId: 2, 
            points: [{x: 450, y: 150}, {x: 480, y: 120}, {x: 500, y: 100}],
            type: 'slant'
          }
        ],
        alternativeOptions: [
          { name: 'Screen Pass Left', confidence: 0.72 },
          { name: 'Draw Play', confidence: 0.68 }
        ]
      };
      
      const warnings = validatePlaySafety(mockSuggestion, SAFETY_RULES[ageGroup]);
      setSafetyWarnings(warnings);
      setSuggestion(mockSuggestion);
    } catch (error) {
      console.error('AI suggestion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validatePlaySafety = (play, rules) => {
    const warnings = [];
    
    if (rules.prohibitedPlays.includes(play.type)) {
      warnings.push({
        type: 'prohibited',
        message: `${play.type} plays are not allowed for ${ageGroup} level`
      });
    }
    
    play.routes?.forEach(route => {
      const maxY = Math.max(...route.points.map(p => Math.abs(p.y - route.points[0].y)));
      if (maxY > rules.maxRouteDepth) {
        warnings.push({
          type: 'depth',
          message: `Route depth exceeds ${rules.maxRouteDepth} yard limit for ${ageGroup}`
        });
      }
    });
    
    return warnings;
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    console.log('AI feedback:', { suggestionId: suggestion.id, feedback: type });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Sparkles className="text-purple-600" size={20} />
          AI Play Assistant
        </h3>
        {suggestion && (
          <div className="text-sm text-gray-500">
            Confidence: {(suggestion.confidence * 100).toFixed(0)}%
          </div>
        )}
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
          <p className="text-xs text-gray-500 mt-2">
            AI will analyze your team's strengths and suggest optimal plays
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {safetyWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-600 flex-shrink-0" size={16} />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Safety Considerations</p>
                  <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                    {safetyWarnings.map((warning, i) => (
                      <li key={i}>• {warning.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">{suggestion.name}</h4>
            
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-purple-700">Why this play?</p>
              <ul className="text-xs text-purple-600 space-y-1">
                {suggestion.reasoning.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-purple-400 mt-0.5">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded p-2 mb-3">
              <div className="aspect-video bg-green-100 rounded flex items-center justify-center">
                <p className="text-xs text-green-600">Play preview would render here</p>
              </div>
            </div>

            {suggestion.alternativeOptions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-purple-700 mb-1">Other options:</p>
                <div className="space-y-1">
                  {suggestion.alternativeOptions.map((alt, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-purple-600">{alt.name}</span>
                      <span className="text-purple-400">{(alt.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => onApplyPlay(suggestion)}
                className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                disabled={safetyWarnings.some(w => w.type === 'prohibited')}
              >
                Apply This Play
              </button>
              <button
                onClick={generateSuggestion}
                className="px-3 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition-colors"
              >
                Try Another
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-purple-200">
              <span className="text-xs text-purple-600">Was this helpful?</span>
              <button
                onClick={() => handleFeedback('helpful')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'
                }`}
              >
                <ThumbsUp size={16} />
              </button>
              <button
                onClick={() => handleFeedback('not_helpful')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'
                }`}
              >
                <ThumbsUp size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// SECTION 3: PLAYER FEEDBACK COMPONENT
// ============================================
const PlayerFeedback = ({ playId, drillId, playerId, onSubmit, allowComments = true, isModerated = true }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    
    const feedback = {
      playId,
      drillId,
      playerId,
      rating,
      comment: comment.trim(),
      timestamp: new Date(),
      status: isModerated ? 'pending' : 'approved'
    };
    
    onSubmit(feedback);
    setSubmitted(true);
    
    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setComment('');
      setShowCommentBox(false);
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
        <ThumbsUp className="text-green-600 mx-auto mb-1" size={20} />
        <p className="text-sm text-green-700">Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">How was this drill?</h4>
      
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => {
              setRating(value);
              if (allowComments && value >= 4) {
                setShowCommentBox(true);
              }
            }}
            onMouseEnter={() => setHoveredRating(value)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-all"
          >
            <Star
              size={24}
              className={`${
                value <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
      </div>

      {allowComments && (rating > 0 || showCommentBox) && (
        <div className="mb-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any comments? (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/200 characters
            {isModerated && ' • Comments are reviewed by coaches'}
          </p>
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
// SECTION 4: COACH ANALYTICS DASHBOARD
// ============================================
const CoachDashboard = ({ teamId, dateRange = { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() } }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState({
    attendance: { rate: 0.85, trend: 0.05 },
    playEffectiveness: { rate: 0.72, trend: 0.12 },
    drillRatings: { average: 4.2, trend: 0.3 },
    playerLoad: { average: 82, trend: -0.03 }
  });

  const attendanceData = [
    { date: 'Mon', present: 18, absent: 2 },
    { date: 'Tue', present: 19, absent: 1 },
    { date: 'Wed', present: 17, absent: 3 },
    { date: 'Thu', present: 20, absent: 0 },
    { date: 'Fri', present: 16, absent: 4 },
  ];

  const playEffectivenessData = [
    { name: 'Shotgun Pass', success: 78, usage: 45 },
    { name: 'I-Form Run', success: 72, usage: 38 },
    { name: 'Screen Pass', success: 68, usage: 28 },
    { name: 'Play Action', success: 65, usage: 22 },
    { name: 'Draw Play', success: 58, usage: 15 },
  ];

  const playerLoadData = [
    { player: 'QB #12', load: 85, optimal: 80 },
    { player: 'RB #21', load: 92, optimal: 85 },
    { player: 'WR #81', load: 78, optimal: 80 },
    { player: 'WR #80', load: 75, optimal: 80 },
    { player: 'TE #88', load: 70, optimal: 75 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Coach Analytics Dashboard</h2>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Filter size={18} />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        {['overview', 'attendance', 'plays', 'players'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="text-blue-600" size={20} />
                  <span className="text-xs text-green-600 font-medium">+{(analytics.attendance.trend * 100).toFixed(0)}%</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{(analytics.attendance.rate * 100).toFixed(0)}%</p>
                <p className="text-sm text-blue-700">Attendance Rate</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="text-green-600" size={20} />
                  <span className="text-xs text-green-600 font-medium">+{(analytics.playEffectiveness.trend * 100).toFixed(0)}%</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{(analytics.playEffectiveness.rate * 100).toFixed(0)}%</p>
                <p className="text-sm text-green-700">Play Success Rate</p>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Star className="text-yellow-600" size={20} />
                  <span className="text-xs text-gray-600 font-medium">+{analytics.drillRatings.trend.toFixed(1)}</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{analytics.drillRatings.average.toFixed(1)}</p>
                <p className="text-sm text-yellow-700">Avg Drill Rating</p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="text-purple-600" size={20} />
                  <span className="text-xs text-red-600 font-medium">{(analytics.playerLoad.trend * 100).toFixed(0)}%</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{analytics.playerLoad.average}%</p>
                <p className="text-sm text-purple-700">Player Load Index</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Weekly Attendance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="present" fill="#10b981" name="Present" />
                    <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Play Effectiveness</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={playEffectivenessData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Bar dataKey="success" fill="#3b82f6" name="Success %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === 'players' && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Player Load Management</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={playerLoadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="player" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="load" fill="#3b82f6" name="Current Load" />
                  <Bar dataKey="optimal" fill="#10b981" name="Optimal Load" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> RB #21 is above optimal load. Consider rest or reduced practice intensity.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SECTION 5: NOTIFICATION CENTER
// ============================================
const NotificationCenter = ({ userId, userRole }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    channels: { email: true, sms: true, push: true, inApp: true },
    categories: {
      practiceReminders: true,
      scheduleChanges: true,
      playerProgress: true,
      teamAnnouncements: true,
      emergencyAlerts: true
    }
  });

  useEffect(() => {
    setNotifications([
      {
        id: 1,
        type: 'practiceReminder',
        title: 'Practice Tomorrow',
        message: 'Football practice tomorrow at 3:30 PM on Field 2',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false,
        priority: 'normal',
        icon: Calendar,
        iconColor: 'text-blue-600'
      },
      {
        id: 2,
        type: 'scheduleChange',
        title: 'Schedule Change',
        message: 'Saturday\'s game moved to 2:00 PM due to weather',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        read: false,
        priority: 'high',
        icon: AlertTriangle,
        iconColor: 'text-yellow-600'
      }
    ]);
  }, []);

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  if (showPreferences) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setShowPreferences(false)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          ← Back to Notifications
        </button>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
          
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Channels</h4>
            <div className="space-y-3">
              {Object.entries({
                email: { icon: Mail, label: 'Email', desc: 'Receive notifications via email' },
                sms: { icon: MessageSquare, label: 'SMS', desc: 'Get text alerts for urgent updates' },
                push: { icon: Smartphone, label: 'Push', desc: 'Mobile app notifications' },
                inApp: { icon: Bell, label: 'In-App', desc: 'See alerts when you\'re in the app' }
              }).map(([key, { icon: Icon, label, desc }]) => (
                <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <Icon className="text-gray-600" size={18} />
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.channels[key]}
                    onChange={() => setPreferences(prev => ({
                      ...prev,
                      channels: { ...prev.channels, [key]: !prev.channels[key] }
                    }))}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setShowPreferences(false)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell size={20} />
              Notifications
            </h2>
            <button
              onClick={() => setShowPreferences(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Settings size={18} />
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                filter === 'all' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                filter === 'unread' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'
              }`}
            >
              Unread ({notifications.filter(n => !n.read).length})
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredNotifications.map(notification => {
            const Icon = notification.icon;
            return (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50 bg-opacity-30' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className={`mt-1 ${notification.iconColor}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>
                      {notification.priority === 'high' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          Important
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SECTION 6: MAIN APP INTEGRATION
// ============================================
const CoachCoreAIComplete = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userRole, setUserRole] = useState('coach');
  const [notifications, setNotifications] = useState([]);

  // Mock user data
  const mockUser = {
    uid: 'demo-user',
    email: 'coach@demo.com',
    teamId: 'demo-team',
    role: userRole
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900">Coach Core AI</h1>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`text-sm font-medium ${
                    currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('ai-assistant')}
                  className={`text-sm font-medium ${
                    currentView === 'ai-assistant' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  AI Assistant
                </button>
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`text-sm font-medium ${
                    currentView === 'analytics' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setCurrentView('notifications')}
                  className={`text-sm font-medium ${
                    currentView === 'notifications' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Notifications
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select 
                value={userRole} 
                onChange={(e) => setUserRole(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="coach">Coach</option>
                <option value="player">Player</option>
                <option value="parent">Parent</option>
              </select>
              <div className="relative">
                <Bell size={20} className="text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setCurrentView('ai-assistant')}
                  className="w-full text-left p-3 bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                >
                  🤖 Get AI Play Suggestion
                </button>
                <button className="w-full text-left p-3 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                  📋 Create New Play
                </button>
                <button className="w-full text-left p-3 bg-green-50 text-green-700 rounded hover:bg-green-100">
                  ✅ Take Attendance
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Team Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Attendance Rate</span>
                  <span className="font-medium">85%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Play Success</span>
                  <span className="font-medium">72%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Players</span>
                  <span className="font-medium">22</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Recent Activity</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>✓ Practice plan created</div>
                <div>✓ 3 new plays added</div>
                <div>✓ Roster updated</div>
                <div>✓ Game results logged</div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'ai-assistant' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AIPlaySuggestion
                teamData={{ id: mockUser.teamId }}
                currentSituation={{}}
                playerRoster={[]}
                onApplyPlay={(play) => console.log('Apply play:', play)}
                ageGroup="youth"
              />
            </div>
            <div>
              <PlayerFeedback
                playId="demo-play"
                drillId="demo-drill" // ADDED to fix missing prop error
                playerId={mockUser.uid}
                onSubmit={(feedback) => console.log('Feedback submitted:', feedback)}
              />
            </div>
          </div>
        )}

        {currentView === 'analytics' && (
          <CoachDashboard teamId={mockUser.teamId} />
        )}

        {currentView === 'notifications' && (
          <NotificationCenter userId={mockUser.uid} userRole={userRole} />
        )}
      </main>
    </div>
  );
};

export default CoachCoreAIComplete;