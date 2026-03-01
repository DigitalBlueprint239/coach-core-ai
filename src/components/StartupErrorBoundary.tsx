import React, { useState, useEffect } from 'react';
import { app, auth, db } from '../firebase'; // Import the centralized Firebase services

interface StartupErrorBoundaryProps {
  children: React.ReactNode;
}

const StartupErrorBoundary: React.FC<StartupErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    const checkFirebaseServices = async () => {
      try {
        // Lightweight runtime check for Firebase services
        // Check if app is initialized
        if (!app.name) {
          throw new Error('Firebase App not initialized.');
        }
        // Check Firestore availability (e.g., try to access a collection)
        // This is a more robust check than just importing 'db'
        await db.collection('__health_check__').get(); 

        // Check Auth availability (e.g., try to get current user without waiting for full auth state)
        if (!auth) {
          throw new Error('Firebase Auth not initialized.');
        }

        setIsFirebaseReady(true);
      } catch (error: any) {
        setHasError(true);
        setErrorMessage(`Firebase initialization failed: ${error.message}. Please check your Firebase configuration and network connection. Error Code: FB-INIT-001`);
        console.error('Firebase Startup Error:', error);
      }
    };

    checkFirebaseServices();
  }, []);

  if (hasError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h1>Application Startup Error</h1>
        <p>{errorMessage}</p>
        <p>Please try refreshing the page or contact support if the issue persists.</p>
        <p>For developers: Check console for more details.</p>
      </div>
    );
  }

  if (!isFirebaseReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        backgroundColor: '#e2e3e5',
        color: '#383d41',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h1>Loading Application...</h1>
        <p>Initializing Firebase services. Please wait.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default StartupErrorBoundary;
