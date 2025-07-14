import React, { useState } from 'react';
import { useMigration } from '../hooks/useFirestore';
import { useTeam } from '../contexts/TeamContext';
import { useToast } from './ToastManager';

export const MigrationBanner: React.FC = () => {
  const { currentTeam } = useTeam();
  const { hasLocalData, isMigrating, migrateData } = useMigration(currentTeam?.id);
  const { showToast } = useToast();
  const [isVisible, setIsVisible] = useState(true);

  if (!hasLocalData || !currentTeam || !isVisible) {
    return null;
  }

  const handleMigrate = async () => {
    try {
      await migrateData();
      showToast('Data migrated successfully!', 'success');
      setIsVisible(false);
    } catch (error) {
      showToast('Failed to migrate data. Please try again.', 'error');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Migrate Your Data
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              We found existing practice plans and plays in your browser. Would you like to migrate them to your current team "{currentTeam.name}"?
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mt-4 flex items-center space-x-3">
        <button
          onClick={handleMigrate}
          disabled={isMigrating}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isMigrating ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Migrating...</span>
            </div>
          ) : (
            'Migrate Now'
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}; 