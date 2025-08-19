import React, { useState, useEffect, useCallback } from 'react';
import { updatePlay, getPlays, type Play } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

interface PlayEditorProps {
  teamId: string;
  playId: string;
  onSave?: (play: Play) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

export const PlayEditor: React.FC<PlayEditorProps> = ({
  teamId,
  playId,
  onSave,
  onCancel,
  onError
}) => {
  const { user } = useAuth();
  const [play, setPlay] = useState<Play | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    formation: '',
    description: '',
    difficulty: 'beginner' as const,
    tags: [] as string[]
  });

  // Load the play data
  useEffect(() => {
    const loadPlay = async () => {
      if (!playId) return;
      
      setLoading(true);
      try {
        const plays = await getPlays(teamId);
        const foundPlay = plays.find(p => p.id === playId);
        
        if (foundPlay) {
          setPlay(foundPlay);
          setFormData({
            name: foundPlay.name,
            formation: foundPlay.formation,
            description: foundPlay.description,
            difficulty: foundPlay.difficulty,
            tags: foundPlay.tags || []
          });
        } else {
          setError('Play not found');
        }
      } catch (err) {
        setError('Failed to load play');
        console.error('Error loading play:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlay();
  }, [teamId, playId]);

  // Handle form changes
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle tag changes
  const handleTagChange = useCallback((tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      tags
    }));
  }, []);

  // Save play with conflict resolution
  const handleSave = useCallback(async () => {
    if (!play || !user) return;

    setSaving(true);
    setError(null);

    try {
      // Prepare update data with current version
      const updateData: Partial<Play> = {
        ...formData,
        version: play.version // Include current version for conflict detection
      };

      // Use the improved updatePlay function with conflict resolution
      await updatePlay(teamId, playId, updateData);

      // Update local state
      const updatedPlay = {
        ...play,
        ...formData,
        version: (play.version || 0) + 1
      };
      setPlay(updatedPlay);

      onSave?.(updatedPlay);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save play';
      setError(errorMessage);
      onError?.(errorMessage);
      
      // If it's a conflict error, we might want to reload the play data
      if (errorMessage.includes('modified by another user')) {
        // Optionally reload the play to get the latest version
        const plays = await getPlays(teamId);
        const latestPlay = plays.find(p => p.id === playId);
        if (latestPlay) {
          setPlay(latestPlay);
          setFormData({
            name: latestPlay.name,
            formation: latestPlay.formation,
            description: latestPlay.description,
            difficulty: latestPlay.difficulty,
            tags: latestPlay.tags || []
          });
        }
      }
    } finally {
      setSaving(false);
    }
  }, [play, user, formData, teamId, playId, onSave, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading play...</span>
      </div>
    );
  }

  if (!play) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Play not found</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Play</h2>
        <p className="text-sm text-gray-600">
          Version: {play.version || 1} | 
          Last modified: {play.lastModifiedAt ? new Date(play.lastModifiedAt.seconds * 1000).toLocaleString() : 'Unknown'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="space-y-6">
          {/* Play Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Play Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Formation */}
          <div>
            <label htmlFor="formation" className="block text-sm font-medium text-gray-700 mb-2">
              Formation
            </label>
            <input
              type="text"
              id="formation"
              value={formData.formation}
              onChange={(e) => handleInputChange('formation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 4-3-3, 3-5-2"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the play strategy..."
            />
          </div>

          {/* Difficulty */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              id="difficulty"
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags.join(', ')}
              onChange={(e) => handleTagChange(e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., counter-attack, set-piece, pressing"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlayEditor; 