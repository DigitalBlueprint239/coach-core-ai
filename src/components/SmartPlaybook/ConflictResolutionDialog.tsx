import React, { useState } from 'react';
import { Play } from '../../services/firestore';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (action: 'discard' | 'merge' | 'overwrite') => void;
  localChanges: Partial<Play>;
  serverVersion: Play;
  conflictDetails: {
    conflictingFields: string[];
    lastModifiedBy: string;
    lastModifiedAt: Date;
  };
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  onClose,
  onResolve,
  localChanges,
  serverVersion,
  conflictDetails
}) => {
  const [selectedAction, setSelectedAction] = useState<'discard' | 'merge' | 'overwrite' | null>(null);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  if (!isOpen) return null;

  const handleAction = (action: 'discard' | 'merge' | 'overwrite') => {
    if (action === 'overwrite') {
      setShowOverwriteWarning(true);
      setSelectedAction(action);
    } else {
      onResolve(action);
    }
  };

  const confirmOverwrite = () => {
    if (selectedAction === 'overwrite') {
      onResolve('overwrite');
    }
  };

  const getFieldDiff = (field: string) => {
    const localValue = (localChanges as any)[field];
    const serverValue = (serverVersion as any)[field];
    
    if (Array.isArray(localValue) && Array.isArray(serverValue)) {
      return {
        local: localValue.join(', '),
        server: serverValue.join(', '),
        type: 'array'
      };
    }
    
    return {
      local: String(localValue || ''),
      server: String(serverValue || ''),
      type: typeof localValue
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Conflict Detected</h2>
              <p className="text-sm text-gray-600 mt-1">
                This play has been modified by {conflictDetails.lastModifiedBy} at{' '}
                {conflictDetails.lastModifiedAt.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conflict Details */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Conflicting Changes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {conflictDetails.conflictingFields.map((field) => {
                  const diff = getFieldDiff(field);
                  return (
                    <div key={field} className="space-y-2">
                      <h4 className="font-medium text-gray-700 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Your version:</div>
                        <div className="text-sm bg-red-50 border border-red-200 rounded px-2 py-1">
                          {diff.local || '(empty)'}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Server version:</div>
                        <div className="text-sm bg-green-50 border border-green-200 rounded px-2 py-1">
                          {diff.server || '(empty)'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Choose Resolution:</h3>
            
            {/* Option 1: Discard Changes */}
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                 onClick={() => handleAction('discard')}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">Discard My Changes</h4>
                  <p className="text-sm text-gray-500">
                    Accept the server version and lose your local changes
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Merge Changes */}
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                 onClick={() => handleAction('merge')}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">Merge Changes</h4>
                  <p className="text-sm text-gray-500">
                    Combine both versions intelligently (recommended)
                  </p>
                </div>
              </div>
            </div>

            {/* Option 3: Overwrite */}
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                 onClick={() => handleAction('overwrite')}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">Overwrite Server Version</h4>
                  <p className="text-sm text-gray-500">
                    Force your changes and overwrite the server version
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Overwrite Warning Modal */}
      {showOverwriteWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Warning</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                You're about to overwrite changes made by another user. This action cannot be undone.
                Are you sure you want to proceed?
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowOverwriteWarning(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmOverwrite}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Overwrite Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolutionDialog; 