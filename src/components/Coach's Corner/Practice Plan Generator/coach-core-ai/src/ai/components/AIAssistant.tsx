/**
 * AI Assistant Component
 * 
 * Main chat interface for AI-powered coaching assistance.
 * Handles real-time suggestions, practice plan generation, and coaching guidance.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AISuggestion, TeamProfile, PracticeGoal } from '../interfaces';

interface AIAssistantProps {
  teamProfile: TeamProfile;
  onSuggestionApply: (suggestion: AISuggestion) => void;
  onPlanGenerate: (goal: PracticeGoal) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
  isLoading?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  teamProfile,
  onSuggestionApply,
  onPlanGenerate,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: `Hello! I'm your AI coaching assistant. I can help you create practice plans, analyze team performance, and provide personalized coaching advice. What would you like to work on today?`,
      timestamp: new Date(),
      suggestions: [
        {
          id: 'create-plan',
          type: 'drill_selection' as any,
          title: 'Create Practice Plan',
          description: 'Generate a new practice plan based on your team\'s needs',
          confidence: 0.9,
          reasoning: 'Based on your team profile and recent performance',
          implementation: ['Set practice goals', 'Select drills', 'Optimize schedule'],
          estimatedImpact: 'significant' as any,
          prerequisites: []
        },
        {
          id: 'analyze-performance',
          type: 'team_strategy' as any,
          title: 'Analyze Team Performance',
          description: 'Get insights into your team\'s strengths and areas for improvement',
          confidence: 0.85,
          reasoning: 'Using recent game and practice data',
          implementation: ['Review metrics', 'Identify patterns', 'Suggest improvements'],
          estimatedImpact: 'moderate' as any,
          prerequisites: []
        }
      ]
    }]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue, teamProfile);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string, teamProfile: TeamProfile): ChatMessage => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('practice plan') || lowerInput.includes('create plan')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: `I'd be happy to help you create a practice plan! Based on your ${teamProfile.sport} team's profile, I can suggest drills and optimize your practice schedule. What specific areas would you like to focus on?`,
        timestamp: new Date(),
        suggestions: [
          {
            id: 'focus-skills',
            type: 'skill_development' as any,
            title: 'Focus on Skill Development',
            description: 'Create a plan focused on improving specific skills',
            confidence: 0.88,
            reasoning: 'Team analysis shows skill gaps that can be addressed',
            implementation: ['Identify key skills', 'Select targeted drills', 'Progressive difficulty'],
            estimatedImpact: 'significant' as any,
            prerequisites: ['Skill assessment']
          },
          {
            id: 'team-strategy',
            type: 'team_strategy' as any,
            title: 'Team Strategy Practice',
            description: 'Focus on team coordination and game strategies',
            confidence: 0.82,
            reasoning: 'Recent games show opportunities for strategic improvement',
            implementation: ['Team drills', 'Game scenarios', 'Communication exercises'],
            estimatedImpact: 'moderate' as any,
            prerequisites: ['Team assessment']
          }
        ]
      };
    }

    if (lowerInput.includes('performance') || lowerInput.includes('analyze')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: `Let me analyze your team's performance. Based on recent data, your team shows ${teamProfile.strengths.length} key strengths and ${teamProfile.weaknesses.length} areas for improvement. Would you like me to dive deeper into any specific aspect?`,
        timestamp: new Date(),
        suggestions: [
          {
            id: 'strength-analysis',
            type: 'team_strategy' as any,
            title: 'Analyze Strengths',
            description: 'Detailed analysis of team strengths and how to leverage them',
            confidence: 0.85,
            reasoning: 'Comprehensive data available on team performance',
            implementation: ['Review game footage', 'Analyze statistics', 'Identify patterns'],
            estimatedImpact: 'moderate' as any,
            prerequisites: ['Performance data']
          }
        ]
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: `I understand you're asking about "${userInput}". I can help you with practice planning, performance analysis, drill selection, and more. Could you be more specific about what you'd like to accomplish?`,
      timestamp: new Date()
    };
  };

  const handleSuggestionClick = (suggestion: AISuggestion) => {
    onSuggestionApply(suggestion);
    
    // Add follow-up message
    const followUpMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Great choice! I've applied the "${suggestion.title}" suggestion. ${suggestion.description}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, followUpMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">AI Coaching Assistant</h3>
            <p className="text-sm text-gray-500">Powered by advanced AI</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <span className="text-xs text-gray-500">{isTyping ? 'Typing...' : 'Online'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {/* Suggestions */}
        {messages.length > 0 && messages[messages.length - 1].type === 'ai' && 
         messages[messages.length - 1].suggestions && (
          <div className="space-y-2">
            {messages[messages.length - 1].suggestions!.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="font-medium text-blue-800">{suggestion.title}</div>
                <div className="text-sm text-blue-600">{suggestion.description}</div>
                <div className="text-xs text-blue-500 mt-1">
                  Confidence: {Math.round(suggestion.confidence * 100)}%
                </div>
              </button>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about practice planning, team analysis, or coaching advice..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant; 