/**
 * Smart Playbook - Main exports
 * 
 * A complete football playbook system with:
 * - Interactive field canvas
 * - Player management
 * - Route drawing
 * - Formation templates
 * - Save/load functionality
 * - Undo/redo system
 */

// Main application component
export { default as SmartPlaybook } from './SmartPlaybook';

// Core components
export { default as Field } from './Field';
export { default as DebugPanel } from './DebugPanel';
export { default as PlayLibrary } from './PlayLibrary';

// UI Components
export { default as Toolbar } from './components/Toolbar';
export { default as FormationTemplates } from './components/FormationTemplates';
export { default as PlayerControls } from './components/PlayerControls';
export { default as RouteControls } from './components/RouteControls';
export { default as SaveLoadPanel } from './components/SaveLoadPanel';
export { default as Dashboard } from '../Dashboard';

// Utilities
export * from './PlayController'; 