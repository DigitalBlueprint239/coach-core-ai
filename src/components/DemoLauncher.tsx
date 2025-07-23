import React, { useState } from 'react';
import { LoadingSpinner, useToast } from './index';

interface DemoFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  component: React.ComponentType;
  demoData?: any;
}

const DemoLauncher: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const demoFeatures: DemoFeature[] = [
    {
      id: 'dashboard',
      title: 'Dashboard Overview',
      description: 'Main coaching dashboard with team overview and quick actions',
      icon: '',
      component: () => <div>Dashboard Component</div>
    },
    {
      id: 'practice-planner',
      title: 'AI Practice Planner',
      description: 'Generate intelligent practice plans with AI assistance',
      icon: '',
      component: () => <div>Practice Planner Component</div>
    },
    {
      id: 'team-roster',
      title: 'Team Roster Management',
      description: 'Manage player information, positions, and team structure',
      icon: '',
      component: () => <div>Team Roster Component</div>
    },
    {
      id: 'drill-library',
      title: 'Drill Library',
      description: 'Browse and search through hundreds of coaching drills',
      icon: '',
      component: () => <div>Drill Library Component</div>
    },
    {
      id: 'smart-playbook',
      title: 'Smart Playbook',
      description: 'Design plays with drag-and-drop interface and AI suggestions',
      icon: '',
      component: () => <div>Smart Playbook Component</div>
    },
    {
      id: 'analytics',
      title: 'Analytics & Progress',
      description: 'Track player progress and team performance metrics',
      icon: '',
      component: () => <div>Analytics Component</div>
    }
  ];

  const handleFeatureSelect = async (featureId: string) => {
    setLoading(true);
    try {
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSelectedFeature(featureId);
      showSuccess(`Loading ${demoFeatures.find(f => f.id === featureId)?.title}...`);
    } catch (error) {
      showError('Failed to load feature');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMenu = () => {
    setSelectedFeature(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Preparing demo..." />
      </div>
    );
  }

  if (selectedFeature) {
    const feature = demoFeatures.find(f => f.id === selectedFeature);
    const Component = feature?.component;
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToMenu}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back to Demo Menu
                </button>
                <span className="text-lg font-semibold">{feature?.title}</span>
              </div>
              <div className="text-sm text-gray-500">Demo Mode</div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {Component && <Component />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <span className="text-3xl"></span>
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

        {/* Demo Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {demoFeatures.map((feature) => (
            <div
              key={feature.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => handleFeatureSelect(feature.id)}
            >
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 font-medium">Try Demo</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
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
                <li>• React 19 + TypeScript</li>
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
  )
}

export default DemoLauncher; 