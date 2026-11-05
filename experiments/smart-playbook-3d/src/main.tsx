import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installWriteGuards } from './debug';
import './styles.css';

installWriteGuards();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
