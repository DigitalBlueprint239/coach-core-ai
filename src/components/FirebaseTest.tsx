import React, { useState, useEffect } from 'react';
import { usePracticePlans } from '../hooks/useFirestore';
import { LoadingSpinner, useToast } from './index';
import { onAuthStateChange } from '../services/firestore';
import { User } from 'firebase/auth';

const FirebaseTest: React.FC = () => {
  const [teamId] = useState('test-team-123');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAuthenticated = !!user;
  const { plans, loading: plansLoading, error, createPlan } = usePracticePlans(teamId);
  const { showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleTestCreate = async () => {
    try {
      const testPlan = {
        name: 'Test Practice Plan',
        date: new Date().toISOString().split('T')[0],
        duration: 90,
        periods: [
          {
            id: '1',
            name: 'Warm-up',
            duration: 15,
            drills: [],
            intensity: 1
          }
        ],
        goals: ['Test the system'],
        notes: 'This is a test plan'
      };

      await createPlan(testPlan);
      showSuccess('Practice plan created successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to create practice plan');
    }
  };

  const handleTestToast = () => {
    showInfo('This is a test notification');
  };

  if (authLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-yellow-800">Authentication Required</h3>
          <p className="text-yellow-700">
            Please sign in to test the Firebase functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Firebase Integration Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Authentication Status</h3>
          <div className="space-y-2">
            <p><strong>User ID:</strong> {user?.uid}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* Practice Plans */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Practice Plans</h3>
          {plansLoading ? (
            <LoadingSpinner text="Loading plans..." />
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div>
              <p><strong>Count:</strong> {plans.length}</p>
              <button
                onClick={handleTestCreate}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create Test Plan
              </button>
            </div>
          )}
        </div>

        {/* Toast Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Toast Notifications</h3>
          <div className="space-y-2">
            <button
              onClick={() => showSuccess('Success message!')}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Show Success
            </button>
            <button
              onClick={() => showError('Error message!')}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Show Error
            </button>
            <button
              onClick={handleTestToast}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Show Info
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Connection Status</h3>
          <div className="space-y-2">
            <p><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</p>
            <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
            <p><strong>Firebase Project:</strong> {import.meta.env.VITE_FIREBASE_PROJECT_ID}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTest; 