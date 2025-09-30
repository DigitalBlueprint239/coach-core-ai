import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Center,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBetaUser, useFeatureAccess } from '../../hooks/useFeatureFlags';
import { featureFlagService } from '../../services/feature-flags/feature-flag-service';
import { userBehaviorLogger } from '../../services/analytics/user-behavior-logger';
import secureLogger from '../../utils/secure-logger';

interface BetaGateProps {
  featureKey?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingMessage?: string;
  waitlistPath?: string;
  analyticsContext?: Record<string, unknown>;
  onRequestAccess?: () => void;
}

const LOCAL_STORAGE_KEY = 'coachCoreBetaDisabled';
const SESSION_STORAGE_KEY = 'coachCoreBetaDisabled';
const ENV_DISABLE_SWITCH = 'VITE_BETA_KILL_SWITCH';

const hasRuntimeKillSwitch = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (window.localStorage.getItem(LOCAL_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch (error) {
    secureLogger.warn('Unable to read beta kill switch localStorage key', { error });
  }

  try {
    if (window.sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch (error) {
    secureLogger.warn('Unable to read beta kill switch sessionStorage key', { error });
  }

  const envRecord = import.meta.env as Record<string, string | undefined>;
  const envValue = envRecord[ENV_DISABLE_SWITCH] ?? 'false';
  return envValue.toLowerCase() === 'true';
};

const BetaGateFallback: React.FC<{
  onJoinWaitlist: () => void;
  onRequestAccess?: () => void;
  isKillSwitchActive: boolean;
}> = ({ onJoinWaitlist, onRequestAccess, isKillSwitchActive }) => {
  return (
    <Center py={16} px={6}>
      <Box maxW="lg" w="full">
        <Alert status={isKillSwitchActive ? 'warning' : 'info'} variant="left-accent" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <VStack align="start" spacing={4} w="full">
            <Box>
              <AlertTitle fontSize="lg">
                {isKillSwitchActive ? 'Beta features are temporarily offline' : 'Beta access required'}
              </AlertTitle>
              <AlertDescription fontSize="md">
                {isKillSwitchActive
                  ? 'We disabled the beta experience while we investigate an issue. You will regain access as soon as the beta reopens.'
                  : 'You need beta access to view this area. Join the waitlist or contact the team to request access.'}
              </AlertDescription>
            </Box>
            <VStack align="stretch" spacing={3} w="full">
              <Button colorScheme="blue" onClick={onJoinWaitlist}>
                Join the waitlist
              </Button>
              {onRequestAccess && (
                <Button variant="outline" onClick={onRequestAccess}>
                  Contact the beta team
                </Button>
              )}
            </VStack>
          </VStack>
        </Alert>
      </Box>
    </Center>
  );
};

export const BetaGate: React.FC<BetaGateProps> = ({
  featureKey,
  children,
  fallback,
  loadingMessage = 'Checking beta access...',
  waitlistPath = '/waitlist',
  analyticsContext,
  onRequestAccess,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { betaUser, isBetaUser, isLoading } = useBetaUser();
  const { hasAccess } = useFeatureAccess(featureKey ?? 'betaFeatures');
  const [featureFlagsReady, setFeatureFlagsReady] = useState<boolean>(featureFlagService.isReady());
  const [runtimeDisabled, setRuntimeDisabled] = useState<boolean>(hasRuntimeKillSwitch());
  const analyticsState = useRef<'loading' | 'granted' | 'denied'>();

  // Poll remote-config readiness once until initialized
  useEffect(() => {
    if (featureFlagsReady) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const timer = window.setInterval(() => {
      if (featureFlagService.isReady()) {
        setFeatureFlagsReady(true);
        window.clearInterval(timer);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [featureFlagsReady]);

  // Listen for manual runtime disable / enable events
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const disableListener: EventListener = () => setRuntimeDisabled(true);
    const enableListener: EventListener = () => setRuntimeDisabled(false);

    window.addEventListener('coach-core-beta-disable', disableListener);
    window.addEventListener('coach-core-beta-enable', enableListener);

    return () => {
      window.removeEventListener('coach-core-beta-disable', disableListener);
      window.removeEventListener('coach-core-beta-enable', enableListener);
    };
  }, []);

  const globalBetaEnabled = useMemo(() => {
    try {
      return featureFlagService.isFeatureEnabled('betaFeatures', betaUser?.userId);
    } catch (error) {
      secureLogger.error('Failed to evaluate betaFeatures flag', { error });
      return false;
    }
  }, [betaUser?.userId, featureFlagsReady]);

  const specificFeatureEnabled = useMemo(() => {
    if (!featureKey) {
      return true;
    }
    try {
      return featureFlagService.isFeatureEnabled(featureKey, betaUser?.userId);
    } catch (error) {
      secureLogger.error('Failed to evaluate feature gate flag', { error, featureKey });
      return false;
    }
  }, [betaUser?.userId, featureKey, featureFlagsReady]);

  const isChecking = isLoading || !featureFlagsReady;
  const isGateOpen = !runtimeDisabled && globalBetaEnabled && specificFeatureEnabled && isBetaUser && hasAccess;

  const analyticsPayload = useMemo(
    () => ({
      feature: featureKey ?? 'betaFeatures',
      path: location.pathname,
      betaUserId: betaUser?.userId,
      isBetaUser,
      runtimeDisabled,
      featureFlagsReady,
      featureEnabled: specificFeatureEnabled,
      hasFeatureAccess: hasAccess,
      ...analyticsContext,
    }),
    [
      analyticsContext,
      betaUser?.userId,
      featureFlagsReady,
      featureKey,
      hasAccess,
      isBetaUser,
      location.pathname,
      runtimeDisabled,
      specificFeatureEnabled,
    ]
  );

  // Track loading event once when component mounts or location changes
  useEffect(() => {
    if (analyticsState.current === 'loading') {
      return;
    }

    analyticsState.current = 'loading';
    userBehaviorLogger.logBehavior('beta_gate_loading', analyticsPayload);
    secureLogger.info('Beta gate loading', analyticsPayload);
  }, [analyticsPayload]);

  // Track gate outcome transitions
  useEffect(() => {
    if (isChecking) {
      return;
    }

    const nextState: 'granted' | 'denied' = isGateOpen ? 'granted' : 'denied';
    if (analyticsState.current === nextState) {
      return;
    }

    analyticsState.current = nextState;
    const eventName = nextState === 'granted' ? 'beta_gate_access_granted' : 'beta_gate_denied';
    userBehaviorLogger.logBehavior(eventName, analyticsPayload);
    secureLogger.info(`Beta gate ${nextState}`, analyticsPayload);
  }, [analyticsPayload, isChecking, isGateOpen]);

  if (isChecking) {
    return (
      <Center py={16} px={6} data-testid="beta-gate-loading">
        <VStack spacing={4}>
          <Spinner size="lg" thickness="4px" />
          <Text color="gray.500">{loadingMessage}</Text>
        </VStack>
      </Center>
    );
  }

  if (isGateOpen) {
    return <>{children}</>;
  }

  const handleJoinWaitlist = () => {
    navigate(waitlistPath);
  };

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <BetaGateFallback
      onJoinWaitlist={handleJoinWaitlist}
      onRequestAccess={onRequestAccess}
      isKillSwitchActive={runtimeDisabled || !globalBetaEnabled}
    />
  );
};

export default BetaGate;
