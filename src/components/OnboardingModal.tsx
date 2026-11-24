// src/components/OnboardingModal.tsx
import React, { useState } from 'react';

// Every step describes something that works today. Features that are not built are named once, as not built.
// src/components/__tests__/OnboardingModal.test.tsx fails if this copy starts promising them again.
const ONBOARDING_STEPS = [
  {
    title: 'Welcome to Coach Core AI',
    description: 'This is an early version of a football coaching tool. Here is what you can do with it today.',
    illustration: '🏆'
  },
  {
    title: 'Your team',
    description: 'Create a team to hold your plays and practice plans. A team is private to the coach who creates it.',
    illustration: '👥'
  },
  {
    title: 'Practice Planner',
    description: 'Write a practice plan for your team and save it.',
    illustration: '📋'
  },
  {
    title: 'Smart Playbook',
    description: 'Lay out formations and plays on a football field and save them to your team’s playbook.',
    illustration: '🏈'
  },
  {
    title: 'Not available yet',
    description: 'AI advice, analytics, sharing plays with other coaches or players, and offline use are not built yet. They will be announced here when they are.',
    illustration: '🚧'
  },
  {
    title: 'Ready to get started?',
    description: 'Start by creating your team.',
    illustration: '🚀'
  }
];

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  /** Accepted for compatibility; there is no demo mode, so nothing offers it. */
  onDemoMode?: () => void;
  onComplete?: () => void;
  className?: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  open,
  onClose,
  onComplete,
  className = ''
}) => {
  const [step, setStep] = useState(0);

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

  const { title, description, illustration } = ONBOARDING_STEPS[step];

  return (
    <div className={`onboarding-modal-overlay ${className}`}>
      <div className="onboarding-modal">
        <div className="onboarding-illustration">{illustration}</div>
        <h2 className="onboarding-title">{title}</h2>
        <p className="onboarding-description">{description}</p>

        <div className="onboarding-actions">
          <button
            className="onboarding-btn primary"
            onClick={handleNext}
          >
            {step === ONBOARDING_STEPS.length - 1 ? 'Start using Coach Core' : 'Next'}
          </button>
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