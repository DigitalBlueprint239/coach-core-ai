import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AIProvider } from './ai-brain/AIContext';
import ChakraProvider from './providers/ChakraProvider';
import { Dashboard, SmartPlaybook } from './components/SmartPlaybook';

const App = () => (
  <ChakraProvider>
    <AIProvider>
      <Router>
        <nav className="flex gap-4 p-4 bg-gray-100 border-b mb-6">
          <Link to="/" className="font-semibold text-blue-700">Dashboard</Link>
          <Link to="/playbook" className="font-semibold text-blue-700">Smart Playbook</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/playbook" element={<SmartPlaybook />} />
        </Routes>
      </Router>
    </AIProvider>
  </ChakraProvider>
);

export default App; 