import React from 'react';

export interface OnboardingProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

declare const Onboarding: React.MemoExoticComponent<(props: OnboardingProps) => React.ReactElement>;
export default Onboarding;
