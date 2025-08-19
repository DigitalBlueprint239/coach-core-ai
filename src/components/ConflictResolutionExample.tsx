// src/components/ConflictResolutionExample.tsx
import React, { useState, useEffect } from 'react';
import { updatePlay, getPlays, Play } from '../services/firestore';
import { useAuth } from '../hooks/useAuth';

interface ConflictResolutionExampleProps {
  teamId: string;
  playId: string;
}

export const ConflictResolutionExample: React.FC<ConflictResolutionExampleProps> = ({ 
  teamId, 
  playId 
}) => {
  const { user } = useAuth();
  const [play, setPlay] = useState<Play | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    formation: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load play data
  useEffect(() => {
    const loadPlay = async () => {
      try {
        const plays = await getPlays(teamId);
        const foundPlay = plays.find(p => p.id === playId);
        if (foundPlay) {
          setPlay(foundPlay);
          setFormData({
            name: foundPlay.name,
            description: foundPlay.description,
            formation: foundPlay.formation
          });
        }
      } catch (err) {
        setError('Failed to load play data');
      }
    };

    if (teamId && playId) {
      loadPlay();
    }
  }, [teamId, playId]);

  // Handle form changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // Clear any previous errors
    setSuccess(''); // Clear any previous success messages
  };

  // Handle save with optimistic locking
  const handleSave = async () => {
    if (!play || !user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Include current version for conflict detection
      const updateData: Partial<Play> = {
        name: formData.name,
        description: formData.description,
        formation: formData.formation,
        version: play.version // Critical: Include current version
      };

      await updatePlay(teamId, playId, updateData);
      
      // Update local state on success
      const updatedPlay = {
        ...play,
        ...formData,
        version: (play.version || 0) + 1
      };
      setPlay(updatedPlay);
      setSuccess('Play updated successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save play';
      setError(errorMessage);
      
      // Handle conflict errors by reloading latest data
      if (errorMessage.includes('modified by another user')) {
        try {
          const plays = await getPlays(teamId);
          const latestPlay = plays.find(p => p.id === playId);
          if (latestPlay) {
            setPlay(latestPlay);
            setFormData({
              name: latestPlay.name,
              description: latestPlay.description,
              formation: latestPlay.formation
            });
            setError('Play was modified by another user. Latest version loaded. Please review and try again.');
          }
        } catch (reloadError) {
          setError('Failed to reload latest version. Please refresh the page.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (!play) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading play...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Play Editor - Optimistic Locking Example
        </h2>
        
        {/* Version Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Document Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Version:</span> {play.version || 0}
            </div>
            <div>
              <span className="font-medium text-blue-800">Last Modified:</span> 
              {play.lastModifiedAt ? new Date(play.lastModifiedAt.seconds * 1000).toLocaleString() : 'Unknown'}
            </div>
            <div>
              <span className="font-medium text-blue-800">Modified By:</span> {play.lastModifiedBy || 'Unknown'}
            </div>
            <div>
              <span className="font-medium text-blue-800">Created:</span> 
              {play.createdAt ? new Date(play.createdAt).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Play Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formation
            </label>
            <input
              type="text"
              value={formData.formation}
              onChange={(e) => handleInputChange('formation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Success
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  {success}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">How to Test Conflict Resolution:</h3>
          <ol className="text-yellow-800 text-sm space-y-1 list-decimal list-inside">
            <li>Open this page in two different browser tabs</li>
            <li>Make different changes to the play in each tab</li>
            <li>Save the changes in the first tab</li>
            <li>Try to save the changes in the second tab</li>
            <li>You should see a conflict error and the latest version will be loaded</li>
          </ol>
        </div>
      </div>
    </div>
  );
}; 