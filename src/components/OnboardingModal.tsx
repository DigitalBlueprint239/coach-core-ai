// src/components/OnboardingModal.tsx
import React, { useState } from 'react';
import { LoadingState } from './LoadingStates';
import { useModalDialog } from './common/useModalDialog';

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to Coach Core AI!',
    description: 'Your private workspace for teams, practice plans and plays. Let’s get you started with a quick walkthrough.',
    illustration: '🏆'
  },
  {
    title: 'Team Management',
    description: 'Create and select your team. Team access is owner-only during this private beta; roster and attendance tools are planned.',
    illustration: '👥'
  },
  {
    title: 'Practice Planner',
    description: 'Create, edit and save your own practice plans. AI generation is disabled in this milestone.',
    illustration: '📋'
  },
  {
    title: 'Smart Playbook',
    description: 'Design plays visually and save them in your authorized team workspace. Recovery tools help preserve unsynced drafts.',
    illustration: '🏈'
  },
  {
    title: 'Analytics & Feedback',
    description: 'Analytics, player development and attendance are planned features, not working modules in this milestone.',
    illustration: '📈'
  },
  {
    title: 'AI Assistant',
    description: 'AI generation is unavailable in this milestone. Use the existing manual planning and play design tools.',
    illustration: '🤖'
  },
  {
    title: 'Offline & PWA',
    description: 'Device drafts support recovery. Cloud saves require an acknowledged connection. App installation depends on your browser.',
    illustration: '📱'
  },
  {
    title: 'Ready to Get Started?',
    description: 'Start in your own workspace or try the explicitly labeled dashboard sample preview. Fictional events and tasks are never saved to your team.',
    illustration: '🚀'
  }
];

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onDemoMode: () => void;
  onComplete?: () => void;
  className?: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  open,
  onClose,
  onDemoMode,
  onComplete,
  className = ''
}) => {
  const [step, setStep] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);
  // Escape closes like the close button.
  const dialog = useModalDialog(open, onClose);

  if (!open) return null;

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleDemo = async () => {
    setLoadingDemo(true);
    try {
      await onDemoMode();
      onClose();
    } finally {
      setLoadingDemo(false);
    }
  };

  const { title, description, illustration } = ONBOARDING_STEPS[step];

  return (
    <div className={`onboarding-modal-overlay ${className}`}>
      <div ref={dialog.ref} onKeyDown={dialog.onKeyDown} className="onboarding-modal" role="dialog" aria-modal="true"
        aria-labelledby="onboarding-title" aria-describedby="onboarding-description">
        <div className="onboarding-illustration" aria-hidden="true">{illustration}</div>
        <h2 id="onboarding-title" className="onboarding-title">{title}</h2>
        <p id="onboarding-description" className="onboarding-description">{description}</p>

        <div className="onboarding-actions">
          {step === ONBOARDING_STEPS.length - 1 ? (
            <>
              <button
                className="onboarding-btn demo"
                onClick={handleDemo}
                disabled={loadingDemo}
              >
                {loadingDemo ? <LoadingState type="spinner" size="small" text="Loading Demo..." /> : 'Try Demo Mode'}
              </button>
              <button
                className="onboarding-btn primary"
                onClick={handleNext}
              >
                Start Using Coach Core
              </button>
            </>
          ) : (
            <button
              className="onboarding-btn primary"
              onClick={handleNext}
            >
              {step === ONBOARDING_STEPS.length - 2 ? 'Finish' : 'Next'}
            </button>
          )}
          {step > 0 && (
            <button
              className="onboarding-btn secondary"
              onClick={handleBack}
            >
              Back
            </button>
          )}
        </div>
        <button type="button" className="onboarding-close" onClick={onClose} aria-label="Close onboarding">×</button>
      </div>
      <style>{`
        /* Elite Broadcast surface. The overlay renders outside .cc-app, so it carries the
           token values it needs (same values as src/ui/elite-broadcast.css). */
        .onboarding-modal-overlay {
          --eb-text: #F4F7FB; --eb-secondary: #AEB8C6; --eb-line-3: #3A4866; --eb-panel-2: #0B0F17;
          --eb-cyan: #19E3FF; --eb-ink: #04060A; --eb-amber: #FFC94D; --eb-amber-text: #FFD97A;
          --eb-display: 'Big Shoulders Display', 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif;
          --eb-body: Archivo, 'Segoe UI', Arial, sans-serif;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #04060ACC;
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .onboarding-modal {
          background: linear-gradient(160deg, #10182A 0%, #0A0F1A 70%);
          border: 1px solid #2A3550;
          box-shadow: 0 20px 60px #00000080;
          color: var(--eb-text);
          font: 15px/1.45 var(--eb-body);
          padding: 2rem 2.5rem;
          max-width: 440px;
          width: 100%;
          text-align: center;
          position: relative;
        }
        .onboarding-illustration {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .onboarding-title {
          font: 900 30px/1.05 var(--eb-display);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .onboarding-description {
          font-size: 1rem;
          color: var(--eb-secondary);
          margin-bottom: 2rem;
        }
        .onboarding-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .onboarding-btn {
          min-height: 52px;
          padding: 0 24px;
          border: 1px solid var(--eb-line-3);
          border-radius: 0;
          background: transparent;
          color: var(--eb-text);
          font: 800 20px var(--eb-display);
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
        }
        .onboarding-btn.primary {
          border: 0;
          background: var(--eb-cyan);
          color: var(--eb-ink);
          font-weight: 900;
          clip-path: polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%);
        }
        .onboarding-btn.primary:hover {
          background: #C2F7FF;
        }
        .onboarding-btn.secondary:hover {
          background: var(--eb-panel-2);
        }
        .onboarding-btn.demo {
          border-color: var(--eb-amber);
          background: #2A2208;
          color: var(--eb-amber-text);
        }
        .onboarding-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .onboarding-btn:focus-visible,
        .onboarding-close:focus-visible {
          outline: 3px solid var(--eb-cyan);
          outline-offset: 3px;
        }
        .onboarding-close {
          position: absolute;
          top: 8px;
          right: 8px;
          min-width: 44px;
          min-height: 44px;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--eb-secondary);
          cursor: pointer;
        }
        .onboarding-close:hover {
          color: var(--eb-cyan);
        }
        @media (max-width: 480px) {
          .onboarding-modal {
            padding: 1.25rem 0.75rem;
            max-width: 95vw;
          }
        }
      `}</style>
    </div>
  );
};
