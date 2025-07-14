import React, { useState, useRef, useEffect } from "react";

const CopilotInput = ({
  onGeneratePlan,
  suggestions,
  sportProgram,
  rosterDetails,
  practiceSchedule,
  onApplySuggestion
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [aiModel, setAiModel] = useState("gpt-4");
  const [temperature, setTemperature] = useState(0.7);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      alert('Speech recognition not supported in this browser');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setRecentPrompts([prompt, ...recentPrompts.slice(0, 4)]);
    
    try {
      await onGeneratePlan(prompt, aiModel, temperature);
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Failed to generate suggestions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced AI prompt processing with context
  const processAIPrompt = async (prompt, model = "gpt-4", temp = 0.7) => {
    const context = {
      sport: sportProgram,
      roster: rosterDetails,
      schedule: practiceSchedule,
      availableDrills: getAvailableDrills(),
      practiceConstraints: getPracticeConstraints()
    };

    const systemPrompt = `You are an expert sports coach assistant. Generate practice plan suggestions based on the coach's input.

Context:
- Sport: ${context.sport}
- Roster: ${context.roster.length} players
- Available time: ${context.practiceConstraints.maxDuration} minutes
- Focus areas: ${prompt}

Generate 3-5 drill suggestions with:
1. Drill category (warmup, skills, team, conditioning, special teams, recovery)
2. Specific drill names
3. Recommended duration
4. Intensity level (low, moderate, high)
5. Brief explanation of why this drill fits the request

Format as JSON array.`;

    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: systemPrompt,
          model,
          temperature: temp,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const data = await response.json();
      return JSON.parse(data.suggestions);
    } catch (error) {
      // Fallback to mock suggestions if AI service fails
      return generateMockSuggestions(prompt, context);
    }
  };

  const generateMockSuggestions = (prompt, context) => {
    const suggestions = [];
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes("warm") || promptLower.includes("start")) {
      suggestions.push({
        type: "warmup",
        drills: ["Dynamic Stretching", "Light Jogging", "Position-Specific Warmup"],
        duration: 15,
        intensity: "low",
        explanation: "Proper warmup prepares muscles and reduces injury risk"
      });
    }
    
    if (promptLower.includes("pass") || promptLower.includes("throw")) {
      suggestions.push({
        type: "skills",
        drills: ["Passing Drills", "Catching Practice", "Route Running"],
        duration: 25,
        intensity: "moderate",
        explanation: "Focus on quarterback accuracy and receiver timing"
      });
    }
    
    if (promptLower.includes("team") || promptLower.includes("scrimmage")) {
      suggestions.push({
        type: "team",
        drills: ["7-on-7 Scrimmage", "Team Drills", "Game Situations"],
        duration: 30,
        intensity: "high",
        explanation: "Full team practice with game-like scenarios"
      });
    }
    
    if (promptLower.includes("condition") || promptLower.includes("fitness")) {
      suggestions.push({
        type: "conditioning",
        drills: ["Interval Training", "Circuit Training", "Hill Sprints"],
        duration: 35,
        intensity: "high",
        explanation: "High-intensity conditioning to build endurance"
      });
    }
    
    return suggestions;
  };

  const getAvailableDrills = () => {
    // This would fetch from the drill library
    return ["Dynamic Stretching", "Passing Drills", "7-on-7 Scrimmage", "Interval Training"];
  };

  const getPracticeConstraints = () => {
    return {
      maxDuration: 120,
      availableEquipment: ["cones", "balls", "agility ladders"],
      facilityType: "outdoor field"
    };
  };

  const quickPrompts = [
    "Focus on passing and receiving skills",
    "High-intensity conditioning workout",
    "Team defense and tackling practice",
    "Special teams and kicking practice",
    "Game situation scenarios",
    "Individual position work",
    "Recovery and light skills practice",
    "Red zone offense practice",
    "Two-minute drill simulation",
    "Goal line defense work"
  ];

  const getRosterSummary = () => {
    if (!rosterDetails || rosterDetails.length === 0) {
      return "No roster information available";
    }
    
    const positions = rosterDetails.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(positions)
      .map(([pos, count]) => `${count} ${pos}`)
      .join(", ");
  };

  const getScheduleSummary = () => {
    if (!practiceSchedule || practiceSchedule.length === 0) {
      return "No upcoming practices scheduled";
    }
    
    const nextPractice = practiceSchedule[0];
    return `Next practice: ${nextPractice.date} at ${nextPractice.time}`;
  };

  return (
    <div className="space-y-6">
      {/* AI Copilot Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">AI Practice Copilot</h3>
            <p className="text-gray-600">Describe your practice goals and get AI-powered suggestions</p>
          </div>
        </div>
        
        {/* Context Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Sport Program</div>
            <div className="text-lg font-semibold text-blue-600">{sportProgram}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Roster</div>
            <div className="text-sm text-gray-600">{getRosterSummary()}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Schedule</div>
            <div className="text-sm text-gray-600">{getScheduleSummary()}</div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">AI Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="gpt-4">GPT-4 (Most Creative)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                <option value="claude-3">Claude-3 (Analytical)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Creativity: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your practice goals:
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none pr-12"
                placeholder="e.g., 'Focus on improving quarterback accuracy and wide receiver route running. Include some conditioning and team drills.'"
              />
              <button
                type="button"
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={`absolute top-3 right-3 p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isListening ? 'Stop recording' : 'Voice input'}
              >
                {isListening ? '⏹️' : '🎤'}
              </button>
            </div>
            {isListening && (
              <div className="text-sm text-blue-600 mt-2">
                🎤 Listening... Speak now
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generate Suggestions</span>
                </>
              )}
            </button>
            
            <div className="text-sm text-gray-500">
              {prompt.length}/500 characters
            </div>
          </div>
        </form>
      </div>

      {/* Quick Prompts */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-800 mb-3">Quick Prompts</h4>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((quickPrompt, index) => (
            <button
              key={index}
              onClick={() => setPrompt(quickPrompt)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              {quickPrompt}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Prompts */}
      {recentPrompts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-800 mb-3">Recent Prompts</h4>
          <div className="space-y-2">
            {recentPrompts.map((recentPrompt, index) => (
              <button
                key={index}
                onClick={() => setPrompt(recentPrompt)}
                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
              >
                {recentPrompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-800 mb-4">AI Suggestions</h4>
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-medium text-gray-800 capitalize">
                      {suggestion.type} Practice
                    </h5>
                    <p className="text-sm text-gray-600">
                      {suggestion.duration} minutes • {suggestion.intensity} intensity
                    </p>
                  </div>
                  <button
                    onClick={() => onApplySuggestion(suggestion)}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">
                  {suggestion.explanation}
                </p>
                
                <div className="space-y-2">
                  {suggestion.drills.map((drill, drillIndex) => (
                    <div
                      key={drillIndex}
                      className="flex items-center space-x-2 text-sm"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700">{drill}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-medium text-blue-800 mb-3">💡 AI Tips</h4>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>• Be specific about skills you want to focus on</li>
          <li>• Mention player positions or groups that need attention</li>
          <li>• Include intensity level preferences (light, moderate, high)</li>
          <li>• Reference recent games or performance issues</li>
          <li>• Specify time constraints or special requirements</li>
          <li>• Use voice input for hands-free planning</li>
        </ul>
      </div>
    </div>
  );
};

export default CopilotInput; 