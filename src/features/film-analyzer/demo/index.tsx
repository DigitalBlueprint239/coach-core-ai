// Separate A0 entry. Deliberately imports no App/Auth/Firebase/AI/service-worker module.
import React from 'react';
import { createRoot } from 'react-dom/client';
import FilmDemoApp from './FilmDemoApp';
createRoot(document.getElementById('root')!).render(<FilmDemoApp />);
