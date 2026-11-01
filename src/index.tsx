import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initMonitoring } from './monitoring/sentry';

// Before the first render so crashes during startup are reported (no-op without a DSN).
initMonitoring();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 