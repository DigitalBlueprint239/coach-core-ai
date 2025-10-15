import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './providers/AuthProvider';
import { TeamProvider } from './contexts/TeamContext';
import { AIProvider } from './ai-brain/AIContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <TeamProvider>
        <AIProvider>
          <App />
        </AIProvider>
      </TeamProvider>
    </AuthProvider>
  </React.StrictMode>
);
