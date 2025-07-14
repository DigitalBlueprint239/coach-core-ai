/**
 * Onboarding.js – First-time user tutorial
 * - Step-by-step guided tour
 * - Interactive tooltips
 * - Skip and complete options
 */

import React, { memo, useState, useEffect } from 'react';
import { HelpCircle, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Smart Playbook!',
    content: 'Create, edit, and save football plays with an intuitive interface. Let\'s get you started!',
    position: 'center'
  },
  {
    id: 'formations',
    title: 'Quick Formations',
    content: 'Start with a formation template to instantly populate the field with players in proper positions.',
    position: 'left',
    target: '.formation-templates'
  },
  {
    id: 'players',
    title: 'Player Management',
    content: 'Click and drag players to move them, or use the "Add Player" mode to place new players.',
    position: 'center'
  },
  {
    id: 'routes',
    title: 'Drawing Routes',
    content: 'Select a player, then click "Start Drawing Route" to create custom routes or apply presets.',
    position: 'right',
    target: '.route-controls'
  },
  {
    id: 'save',
    title: 'Save Your Plays',
    content: 'Give your play a name and save it to your library for future use.',
    position: 'left',
    target: '.save-load-panel'
  },
  {
    id: 'undo',
    title: 'Undo & Redo',
    content: 'Use Ctrl+Z to undo and Ctrl+Y to redo any action. Your changes are always safe!',
    position: 'center'
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    content: 'You now know the basics. Start creating your first play or explore the advanced features.',
    position: 'center'
  }
];

const Onboarding = memo(({
  isVisible = false,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsActive(true);
      setCurrentStep(0);
    }
  }, [isVisible]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem('smartPlaybook_onboarding_complete', 'true');
    onComplete?.();
  };

  const handleSkip = () => {
    setIsActive(false);
    localStorage.setItem('smartPlaybook_onboarding_complete', 'true');
    onSkip?.();
  };

  if (!isActive) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tooltip */}
      <div className={`
        fixed z-50 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200
        transform transition-all duration-300 ease-in-out
        ${step.position === 'left' ? 'left-4' : step.position === 'right' ? 'right-4' : 'left-1/2 transform -translate-x-1/2'}
        ${step.position === 'center' ? 'top-1/2 -translate-y-1/2' : 'top-20'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{step.title}</h3>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </div>
          
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isLast ? (
                <>
                  <Play className="h-4 w-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Arrow */}
        {step.target && (
          <div className="absolute w-0 h-0 border-8 border-transparent border-t-white" 
               style={{
                 left: step.position === 'left' ? '1rem' : step.position === 'right' ? 'calc(100% - 2rem)' : '50%',
                 top: '100%',
                 transform: step.position === 'center' ? 'translateX(-50%)' : 'none'
               }} />
        )}
      </div>
    </>
  );
});

Onboarding.displayName = 'Onboarding';

export default Onboarding; 