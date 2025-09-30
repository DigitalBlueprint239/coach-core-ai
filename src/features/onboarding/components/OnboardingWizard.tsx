import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  List,
  ListIcon,
  ListItem,
  Progress,
  Stack,
  Text,
} from '@chakra-ui/react';
import { CheckCircle, ChevronLeft, ChevronRight, Sparkles, Users, CalendarCheck } from 'lucide-react';
import { useBetaProgram } from '../../../hooks/useBetaProgram';

interface OnboardingWizardProps {
  displayName?: string;
  onComplete?: () => void;
}

interface StepConfig {
  title: string;
  description?: string;
  content: React.ReactNode;
}

const WelcomeScreen: React.FC<{ name?: string }> = ({ name }) => (
  <Stack spacing={4}>
    <Heading size="lg">Welcome {name ? `${name}!` : 'Coach!'}</Heading>
    <Text color="gray.600">
      We are excited to have you in the Coach Core AI Beta. This short guided setup will get you from invite to impact in just a few minutes.
    </Text>
    <Box bg="gray.800" color="white" borderRadius="lg" p={4} shadow="lg">
      <Flex align="center" gap={3}>
        <Icon as={Sparkles} boxSize={6} />
        <Text>Watch a 60-second overview of the beta program and what to expect.</Text>
      </Flex>
    </Box>
  </Stack>
);

const ProfileSetup: React.FC = () => (
  <Stack spacing={4}>
    <Text>Complete your profile so we can personalize drills, content, and communications.</Text>
    <List spacing={3}>
      {['Basic Info', 'Coaching Specialization', 'Team Setup (optional)', 'Availability'].map((item) => (
        <ListItem key={item} display="flex" alignItems="center" gap={2}>
          <ListIcon as={CheckCircle} color="blue.500" />
          {item}
        </ListItem>
      ))}
    </List>
  </Stack>
);

const InteractiveTour: React.FC = () => (
  <Stack spacing={4}>
    <Text>Take a quick tour of the core beta features. Each highlight includes an interactive sandbox.</Text>
    <List spacing={3}>
      {[{ label: 'AI Assistant', icon: Sparkles }, { label: 'Team Management', icon: Users }, { label: 'Practice Planner', icon: CalendarCheck }].map((feature) => (
        <ListItem key={feature.label} display="flex" alignItems="center" gap={2}>
          <Icon as={feature.icon} boxSize={5} color="purple.500" />
          <Text fontWeight="medium">{feature.label}</Text>
        </ListItem>
      ))}
    </List>
  </Stack>
);

const FirstActionPrompt: React.FC = () => (
  <Stack spacing={3}>
    <Text>Pick a starting action to make immediate progress:</Text>
    {[
      'Create your first team',
      'Generate a practice plan',
      'Invite team members',
      'Explore AI features',
    ].map((callToAction) => (
      <Button key={callToAction} variant="outline" colorScheme="blue" justifyContent="flex-start">
        {callToAction}
      </Button>
    ))}
  </Stack>
);

const BetaAgreement: React.FC = () => (
  <Stack spacing={4}>
    <Text>
      Help us shape the future of Coach Core AI. Here is what we ask from every beta partner:
    </Text>
    <List spacing={3}>
      {[
        'Share weekly feedback via quick surveys',
        'Join monthly coaching roundtables (optional)',
        'Report bugs directly in-app using the feedback widget',
      ].map((item) => (
        <ListItem key={item} display="flex" alignItems="center" gap={2}>
          <ListIcon as={CheckCircle} color="green.500" />
          {item}
        </ListItem>
      ))}
    </List>
  </Stack>
);

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ displayName, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const { trackBetaEvent } = useBetaProgram();

  const steps = useMemo<StepConfig[]>(
    () => [
      {
        title: 'Welcome to Coach Core AI',
        description: 'A quick overview of the beta experience.',
        content: <WelcomeScreen name={displayName} />,
      },
      {
        title: 'Complete Your Profile',
        description: 'Tell us about your coaching background.',
        content: <ProfileSetup />,
      },
      {
        title: 'Tour Beta Features',
        description: 'Preview the tools available in beta.',
        content: <InteractiveTour />,
      },
      {
        title: 'Take Your First Action',
        description: 'Jumpstart your workflow with a recommended action.',
        content: <FirstActionPrompt />,
      },
      {
        title: 'Beta Partnership Agreement',
        description: 'Understand expectations and perks.',
        content: <BetaAgreement />,
      },
    ],
    [displayName]
  );

  const currentStep = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const handleNext = async () => {
    const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(nextIndex);
    await trackBetaEvent({
      userId: 'current',
      cohortId: 'unknown',
      type: 'onboarding_step',
      properties: { step: currentStep.title },
    });
    if (nextIndex === steps.length - 1 && onComplete) {
      onComplete();
    }
  };

  const handlePrev = () => {
    setStepIndex(Math.max(stepIndex - 1, 0));
  };

  return (
    <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={6} shadow="md">
      <Stack spacing={6}>
        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Stack spacing={1}>
              <Heading size="md">{currentStep.title}</Heading>
              {currentStep.description ? (
                <Text color="gray.600">{currentStep.description}</Text>
              ) : null}
            </Stack>
            <Text fontSize="sm" color="gray.500">
              Step {stepIndex + 1} of {steps.length}
            </Text>
          </Flex>
          <Progress value={progress} size="sm" colorScheme="blue" borderRadius="md" />
        </Box>

        <Box>{currentStep.content}</Box>

        <Flex justify="space-between" pt={4}>
          <Button leftIcon={<Icon as={ChevronLeft} />} onClick={handlePrev} variant="ghost" isDisabled={stepIndex === 0}>
            Back
          </Button>
          <Button
            colorScheme="blue"
            rightIcon={<Icon as={ChevronRight} />}
            onClick={handleNext}
            isDisabled={stepIndex === steps.length - 1}
          >
            Continue
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
};

export default OnboardingWizard;
