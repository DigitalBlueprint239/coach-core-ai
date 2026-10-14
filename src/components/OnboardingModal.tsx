// src/components/OnboardingModal.tsx
import React, { useState } from 'react';
import { LoadingState } from './LoadingStates';

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
      <div className="onboarding-modal">
        <div className="onboarding-illustration">{illustration}</div>
        <h2 className="onboarding-title">{title}</h2>
        <p className="onboarding-description">{description}</p>

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
        <button className="onboarding-close" onClick={onClose} aria-label="Close onboarding">×</button>
      </div>
      <style>{`
        .onboarding-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .onboarding-modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          padding: 2rem 2.5rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          position: relative;
        }
        .onboarding-illustration {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .onboarding-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .onboarding-description {
          font-size: 1rem;
          color: #555;
          margin-bottom: 2rem;
        }
        .onboarding-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .onboarding-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .onboarding-btn.primary {
          background: linear-gradient(135deg, #0084ff, #00d4ff);
          color: white;
        }
        .onboarding-btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }
        .onboarding-btn.demo {
          background: #fbbf24;
          color: #111827;
        }
        .onboarding-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .onboarding-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #aaa;
          cursor: pointer;
        }
        .onboarding-close:hover {
          color: #0084ff;
        }
        @media (max-width: 480px) {
          .onboarding-modal {
            padding: 1.25rem 0.5rem;
            max-width: 95vw;
          }
        }
      `}</style>
    </div>
  );
};
