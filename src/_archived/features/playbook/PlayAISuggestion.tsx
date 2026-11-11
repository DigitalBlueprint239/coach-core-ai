import React, { useState } from 'react';
import { useAI } from '../../ai-brain/AIContext';

interface PlayAISuggestionProps {
  playContext: any;
}

const PlayAISuggestion: React.FC<PlayAISuggestionProps> = ({ playContext }) => {
  const ai = useAI();
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestion = async () => {
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await ai.getRealtimeInsight(playContext);
      setSuggestion(result);
    } catch (err: any) {
      setError('Failed to get AI suggestion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4 p-4 bg-purple-50 rounded-lg shadow">
      <button
        onClick={handleGetSuggestion}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        disabled={loading}
      >
        {loading ? 'Analyzing...' : 'Get AI Suggestion'}
      </button>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      {suggestion && (
        <div className="mt-3">
          <div className="font-semibold text-lg text-purple-800">
            Suggestion: {suggestion.suggestion}
          </div>
          <div className="text-sm text-gray-700">
            Confidence: {(suggestion.confidence * 100).toFixed(0)}%<br />
            Urgency: {suggestion.urgency}<br />
            Reasoning:
            <ul className="list-disc ml-6">
              {suggestion.reasoning.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayAISuggestion;
