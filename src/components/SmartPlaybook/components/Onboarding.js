/**
 * Onboarding.js – First-time user tutorial
 * - Step-by-step guided tour
 * - Interactive tooltips
 * - Skip and complete options
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';

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
  const dialogRef = useRef(null);
  const nextRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      setIsActive(true);
      setCurrentStep(0);
    }
  }, [isVisible]);

  // Move focus into the tour when it opens and on each step.
  useEffect(() => {
    if (isActive) nextRef.current?.focus();
  }, [isActive, currentStep]);

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

  // Keyboard support: Escape skips the tour and Tab stays inside it.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleSkip();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled])'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="eb-tour-overlay" aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-tour-title"
        aria-describedby="sp-tour-body"
        onKeyDown={handleKeyDown}
        className={`eb-tour eb-tour-${step.position}`}
      >
        {/* Header */}
        <div className="eb-tour-head">
          <span className="eb-tour-step">Smart Playbook tour · Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
          <button onClick={handleSkip} aria-label="Skip tour" className="eb-tour-close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="eb-tour-body">
          <h3 id="sp-tour-title">{step.title}</h3>
          <p id="sp-tour-body">{step.content}</p>
        </div>

        <div className="eb-tour-progress" aria-hidden="true">
          {ONBOARDING_STEPS.map((item, index) => <span key={item.id ?? index} data-done={index <= currentStep ? 'true' : undefined} />)}
        </div>

        {/* Footer */}
        <div className="eb-tour-foot">
          <div className="eb-visually-hidden">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </div>
          <button onClick={handlePrevious} disabled={isFirst} className="eb-btn">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>
          <button ref={nextRef} onClick={handleNext} className="eb-btn eb-btn-primary">
            {isLast ? (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
});

Onboarding.displayName = 'Onboarding';

export default Onboarding; 