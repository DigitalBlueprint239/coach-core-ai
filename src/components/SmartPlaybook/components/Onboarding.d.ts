import React from 'react';

interface OnboardingProps {
  isVisible?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

declare const Onboarding: React.FC<OnboardingProps>;
export default Onboarding;
