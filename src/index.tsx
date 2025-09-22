import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import UIErrorBoundary from './components/common/UIErrorBoundary';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <UIErrorBoundary>
      <App />
    </UIErrorBoundary>
  </React.StrictMode>
);
