/**
 * SpacingWarnings.tsx - Displays route spacing warnings
 * Shows amber warnings when routes converge too closely.
 */

import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { SpacingWarning } from '../../../engine/offense/schema';

interface SpacingWarningsProps {
  warnings: SpacingWarning[];
}

const SpacingWarnings: React.FC<SpacingWarningsProps> = memo(({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-1.5 text-amber-600 text-sm font-semibold mb-3">
        <AlertTriangle size={16} />
        <span>Spacing Issues ({warnings.length})</span>
      </div>
      <div className="space-y-2">
        {warnings.map((w, i) => (
          <div
            key={i}
            className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800"
          >
            {w.message}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Routes that converge too closely allow defenders to bracket multiple receivers.
          Adjust route depths or lateral spacing to create better separation.
        </p>
      </div>
    </div>
  );
});

SpacingWarnings.displayName = 'SpacingWarnings';

export default SpacingWarnings;
