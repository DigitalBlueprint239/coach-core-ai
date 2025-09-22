import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  useDisclosure,
} from '@chakra-ui/react';
import { useAppStore } from '../../services/state/app-store';
import { createAndSaveStarterSession } from './createStarterSession';
import { trackOnboardingStart, trackStarterCreated, trackStarterSaved } from '../../services/analytics/analytics-events';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

const FLAG_KEY = 'onboardingChecklist';

const OnboardingChecklist: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const practices = useAppStore(state => state.practices);
  const user = useAppStore(state => state.user);
  const { isFeatureEnabled } = useFeatureFlags();
  const [creating, setCreating] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  const shouldShow = useMemo(() => {
    const enabled = isFeatureEnabled(FLAG_KEY);
    // Show only for users with no practices yet
    return enabled && practices.length === 0;
  }, [isFeatureEnabled, practices.length]);

  useEffect(() => {
    if (shouldShow) {
      onOpen();
      if (user?.uid) trackOnboardingStart(user.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  const progress = Math.round((completed.length / 2) * 100);

  const handleCreateStarter = async () => {
    if (!user?.teamId || !user?.uid) return;
    try {
      setCreating(true);
      const plan = await createAndSaveStarterSession(user.teamId, user.uid);
      trackStarterCreated(plan.id, plan.duration);
      setCompleted(prev => Array.from(new Set([...prev, 'starter_created'])));
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (completed.includes('starter_created')) {
      const lastPlan = practices[0];
      if (lastPlan) trackStarterSaved(lastPlan.id);
    }
    onClose();
  };

  if (!shouldShow) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Welcome! Let’s Get You Started</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text color="gray.600">
              Follow these quick steps to set up your first session.
            </Text>

            <HStack justify="space-between">
              <Text fontWeight="medium">Progress</Text>
              <Badge colorScheme={completed.length === 2 ? 'green' : 'yellow'}>
                {completed.length}/2
              </Badge>
            </HStack>
            <Progress value={progress} borderRadius="md" colorScheme="brand" />

            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text>1. Create a Starter Session</Text>
                {completed.includes('starter_created') && (
                  <Badge colorScheme="green">Done</Badge>
                )}
              </HStack>
              <HStack justify="space-between">
                <Text>2. Save and continue</Text>
                {completed.includes('starter_saved') && (
                  <Badge colorScheme="green">Done</Badge>
                )}
              </HStack>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose} data-testid="onboarding-dismiss">
              Dismiss
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleCreateStarter}
              isLoading={creating}
              data-testid="create-starter-session"
            >
              Create Starter Session
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OnboardingChecklist;

