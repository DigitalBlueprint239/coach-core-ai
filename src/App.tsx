import React, { useState } from 'react';

// Simple demo components
const DemoDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleAIGenerate = async () => {
    setLoading(true);
    // Simulate AI generation
    setTimeout(() => {
      setLoading(false);
      alert('AI Practice Plan Generated! 🚀');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Coach Core AI</h1>
              <p className="text-xl text-gray-600">The Ultimate Sports Coaching Platform</p>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the future of sports coaching with AI-powered practice planning, 
            intelligent play design, and comprehensive team management.
          </p>
        </div>

        {/* Demo Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* AI Practice Planner */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Practice Planner</h3>
                <p className="text-sm text-gray-600">Generate intelligent practice plans</p>
              </div>
            </div>
            <button
              onClick={handleAIGenerate}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Practice Plan'}
            </button>
          </div>

          {/* Team Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
                <p className="text-sm text-gray-600">Manage player rosters</p>
              </div>
            </div>
            <button
              onClick={() => alert('Team Management Demo! 👥')}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Manage Team
            </button>
          </div>

          {/* Smart Playbook */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏈</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Playbook</h3>
                <p className="text-sm text-gray-600">Design plays with AI</p>
              </div>
            </div>
            <button
              onClick={() => alert('Smart Playbook Demo! 🏈')}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Design Plays
            </button>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
                <p className="text-sm text-gray-600">Track performance metrics</p>
              </div>
            </div>
            <button
              onClick={() => alert('Analytics Demo! 📈')}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
            >
              View Analytics
            </button>
          </div>

          {/* Drill Library */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚽</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Drill Library</h3>
                <p className="text-sm text-gray-600">Browse coaching drills</p>
              </div>
            </div>
            <button
              onClick={() => alert('Drill Library Demo! ⚽')}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
            >
              Browse Drills
            </button>
          </div>

          {/* AI Assistant */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                <p className="text-sm text-gray-600">Get coaching advice</p>
              </div>
            </div>
            <button
              onClick={() => alert('AI Assistant Demo! 🤖')}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
            >
              Ask AI
            </button>
          </div>
        </div>

        {/* Demo Info */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Demo Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What's Included</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• AI-powered practice plan generation</li>
                <li>• Interactive playbook design</li>
                <li>• Team roster management</li>
                <li>• Comprehensive drill library</li>
                <li>• Performance analytics</li>
                <li>• Mobile-responsive design</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Technical Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• React 18 + TypeScript</li>
                <li>• Firebase backend integration</li>
                <li>• OpenAI GPT-4 integration</li>
                <li>• PWA capabilities</li>
                <li>• Real-time updates</li>
                <li>• Offline functionality</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return <DemoDashboard />;
};

export default App;

