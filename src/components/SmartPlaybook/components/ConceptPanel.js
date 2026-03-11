/**
 * ConceptPanel.js – One-click concept route assignment
 * Shows available concepts; clicking one applies all routes at once.
 */

import React, { memo } from 'react';
import { Zap } from 'lucide-react';
import { CONCEPT_LIST } from '../utils/conceptAssignment';

const ConceptButton = memo(({ concept, onClick }) => (
  <button
    onClick={() => onClick(concept.id)}
    className="w-full flex items-start gap-2 px-3 py-2 bg-gray-50 hover:bg-yellow-50 border border-gray-200 hover:border-yellow-400 rounded-lg transition-all text-left"
    title={concept.description}
  >
    <Zap size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
    <div>
      <div className="text-sm font-medium text-gray-800">{concept.name}</div>
      <div className="text-xs text-gray-500">{concept.description}</div>
    </div>
  </button>
));

ConceptButton.displayName = 'ConceptButton';

/**
 * @param {{ onApplyConcept: (conceptId: string) => void, disabled?: boolean }} props
 */
const ConceptPanel = memo(({ onApplyConcept, disabled = false }) => (
  <div className="bg-white rounded-lg shadow-sm p-4">
    <h3 className="font-semibold text-gray-800 text-sm mb-1">Concepts</h3>
    <p className="text-xs text-gray-500 mb-3">
      Click to assign routes to all eligible receivers at once.
    </p>

    {disabled && (
      <p className="text-xs text-amber-600 mb-3 p-2 bg-amber-50 rounded">
        Add players to the field first.
      </p>
    )}

    <div className="space-y-2">
      {CONCEPT_LIST.map(concept => (
        <ConceptButton
          key={concept.id}
          concept={concept}
          onClick={disabled ? () => {} : onApplyConcept}
        />
      ))}
    </div>
  </div>
));

ConceptPanel.displayName = 'ConceptPanel';
export default ConceptPanel;
