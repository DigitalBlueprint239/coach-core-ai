import React from 'react';

// Minimal stubs for referenced components
const Sparkles = (props: any) => <span {...props}>✨</span>;
const ConfidenceBadge = ({ confidence }: { confidence: number }) => <span>{Math.round((confidence ?? 0) * 100)}%</span>;
const ChevronDown = (props: any) => <span {...props}>▼</span>;
const ThumbsUp = (props: any) => <span {...props}>👍</span>;
const ThumbsDown = (props: any) => <span {...props}>👎</span>;

// Minimal type stubs
interface AIInsight {
  id: string;
  message: string;
  recommendation?: string;
  confidence: number;
  reasoning: string[];
  category: string;
}

export const AIInsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => (
  <div className="bg-white border rounded p-4">
    <div className="flex items-center">
      <Sparkles />
      <span>{insight.message}</span>
      <ConfidenceBadge confidence={insight.confidence} />
    </div>
  </div>
);

export const AIBrainIntegrationDemo: React.FC = () => (
  <div className="p-4">
    <h2>Coach Core AI Brain - Demo</h2>
    <button>Generate Smart Practice</button>
  </div>
);

export default AIInsightCard;