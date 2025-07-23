// src/components/SecureDemoDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../contexts/TeamContext';
import { ConsentManager } from '../security/ConsentManager';
import { PrivacyManager } from '../security/PrivacyManager';
import { DataAnonymizer } from '../security/DataAnonymizer';
import { AuditLogger } from '../security/AuditLogger';
import { 
  ConsentSettings, 
  EnhancedPrivacySettings,
  ConsentLevel 
} from '../types/privacy-schema';

const SecureDemoDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  
  const [consent, setConsent] = useState<ConsentSettings | null>(null);
  const [privacy, setPrivacy] = useState<EnhancedPrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoData, setDemoData] = useState({
    practicePlans: [],
    teamStats: {},
    aiInsights: []
  });

  // Load user consent and privacy settings
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user?.uid) return;

      try {
        const [consentSettings, privacySettings] = await Promise.all([
          ConsentManager.getConsent(user.uid),
          PrivacyManager.getPrivacySettings(user.uid)
        ]);

        setConsent(consentSettings);
        setPrivacy(privacySettings);
      } catch (error) {
        console.error('Error loading user settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSettings();
  }, [user]);

  // Handle consent updates
  const handleConsentUpdate = async (
    consentType: keyof ConsentSettings,
    newValue: ConsentLevel,
    reason: string
  ) => {
    if (!user?.uid) return;

    const success = await ConsentManager.updateConsent(
      user.uid,
      consentType,
      newValue,
      reason,
      {
        ipAddress: 'demo_ip',
        userAgent: navigator.userAgent
      }
    );

    if (success) {
      setConsent(prev => prev ? { ...prev, [consentType]: newValue } : null);
      
      // Log the consent change
      await AuditLogger.logPrivacyEvent(user.uid, 'consent_updated', {
        consentType,
        newValue,
        reason
      });
    }
  };

  // Handle privacy setting updates
  const handlePrivacyUpdate = async (updates: Partial<EnhancedPrivacySettings>) => {
    if (!user?.uid) return;

    const success = await PrivacyManager.updatePrivacySettings(user.uid, updates);
    
    if (success) {
      setPrivacy(prev => prev ? { ...prev, ...updates } : null);
      
      // Log the privacy change
      await AuditLogger.logPrivacyEvent(user.uid, 'privacy_updated', updates);
    }
  };

  // Secure data collection for AI training
  const collectSecureData = async (action: string, data: any) => {
    if (!user?.uid || !consent?.aiTraining || consent.aiTraining !== 'granted') {
      console.log('AI training consent not granted');
      return;
    }

    try {
      // Anonymize data before collection
      const anonymizedData = await DataAnonymizer.anonymize(
        data,
        action,
        'high'
      );

      // Store anonymized data for AI training
      console.log('Anonymized data collected for AI training:', anonymizedData);

      // Log the data collection
      await AuditLogger.logAITrainingEvent(
        user.uid,
        action,
        { originalDataSize: JSON.stringify(data).length },
        true
      );
    } catch (error) {
      console.error('Error collecting secure data:', error);
    }
  };

  const handlePracticePlanCreate = async (plan: any) => {
    if (!user?.uid) return;

    // Log the action
    await AuditLogger.logAuditEvent(
      user.uid,
      'practice_plan_created',
      'practice_plans',
      { planName: plan.name, duration: plan.duration },
      'low',
      'success'
    );

    // Collect anonymized data for AI training (if consented)
    await collectSecureData('practice_plan_created', {
      sport: currentTeam?.sport,
      level: currentTeam?.level,
      planStructure: plan.periods,
      drillTypes: plan.drills?.map((d: any) => d.category) || [],
      duration: plan.duration
    });

    // Update demo data
    setDemoData(prev => ({
      ...prev,
      practicePlans: [...prev.practicePlans, plan]
    }));
  };

  const handleTeamManagement = async (action: string, data: any) => {
    if (!user?.uid) return;

    // Log the action
    await AuditLogger.logAuditEvent(
      user.uid,
      `team_${action}`,
      'team_management',
      { action, dataType: typeof data },
      'low',
      'success'
    );

    // Collect anonymized data for analytics (if consented)
    if (consent?.analytics === 'granted') {
      await collectSecureData('team_management', {
        action,
        sport: currentTeam?.sport,
        level: currentTeam?.level
      });
    }
  };

  const handlePlaybookAction = async (action: string, data: any) => {
    if (!user?.uid) return;

    // Log the action
    await AuditLogger.logAuditEvent(
      user.uid,
      `playbook_${action}`,
      'playbook',
      { action, playType: data.type },
      'low',
      'success'
    );

    // Collect anonymized data for AI training (if consented)
    await collectSecureData('playbook_action', {
      action,
      sport: currentTeam?.sport,
      level: currentTeam?.level,
      playType: data.type,
      formation: data.formation
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading secure demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <span className="text-3xl"></span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Coach Core AI</h1>
              <p className="text-xl text-gray-600">Secure Demo with Privacy Protection</p>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the future of sports coaching with enterprise-grade security, 
            privacy protection, and AI-powered features.
          </p>
        </div>

        {/* Privacy & Consent Management */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Privacy & Data Collection Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consent Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Consent Management</h3>
              <div className="space-y-3">
                {consent && Object.entries(consent).filter(([key]) => 
                  !key.includes('LastUpdated') && !key.includes('Reason')
                ).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleConsentUpdate(key as keyof ConsentSettings, 'granted', 'User granted consent')}
                        className={`px-3 py-1 text-xs rounded ${
                          value === 'granted' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Grant
                      </button>
                      <button
                        onClick={() => handleConsentUpdate(key as keyof ConsentSettings, 'denied', 'User denied consent')}
                        className={`px-3 py-1 text-xs rounded ${
                          value === 'denied' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Privacy Settings</h3>
              <div className="space-y-3">
                {privacy && Object.entries(privacy).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <button
                      onClick={() => handlePrivacyUpdate({ [key]: !value })}
                      className={`px-3 py-1 text-xs rounded ${
                        value 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {value ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Status */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Security Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Data Anonymization</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Consent Management</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Audit Logging</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Privacy Compliance</span>
              </div>
            </div>
          </div>
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
              onClick={() => handlePracticePlanCreate({
                name: 'Demo Practice Plan',
                duration: 90,
                periods: [
                  { name: 'Warm-up', duration: 15, drills: [] },
                  { name: 'Skill Development', duration: 45, drills: [] },
                  { name: 'Cool-down', duration: 15, drills: [] }
                ]
              })}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Create Practice Plan
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
                <p className="text-sm text-gray-600">Manage player rosters securely</p>
              </div>
            </div>
            <button
              onClick={() => handleTeamManagement('player_added', { playerName: 'Demo Player' })}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Add Player
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
                <p className="text-sm text-gray-600">Design plays with AI assistance</p>
              </div>
            </div>
            <button
              onClick={() => handlePlaybookAction('play_created', { 
                type: 'pass', 
                formation: 'shotgun' 
              })}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Create Play
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
              onClick={() => handleTeamManagement('analytics_viewed', { metrics: 'performance' })}
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
              onClick={() => handleTeamManagement('drill_viewed', { drillType: 'passing' })}
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
              onClick={() => handleTeamManagement('ai_consulted', { question: 'practice tips' })}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
            >
              Ask AI
            </button>
          </div>
        </div>

        {/* Demo Data Summary */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Demo Data Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {demoData.practicePlans.length}
              </div>
              <div className="text-gray-600">Practice Plans Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {consent?.aiTraining === 'granted' ? '✅' : '❌'}
              </div>
              <div className="text-gray-600">AI Training Consent</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {privacy?.allowDataCollection ? '✅' : '❌'}
              </div>
              <div className="text-gray-600">Data Collection Enabled</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

} 