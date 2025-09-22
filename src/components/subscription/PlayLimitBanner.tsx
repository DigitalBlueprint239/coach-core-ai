import React from 'react';
import { Alert, AlertDescription, AlertIcon, AlertTitle, HStack, Button, Text } from '@chakra-ui/react';
import { SubscriptionTier } from '../../types/user';
import { subscriptionService } from '../../services/stripe/subscription-service';

interface PlayLimitBannerProps {
  subscription: SubscriptionTier; // 'free' | 'premium' | 'enterprise'
  savedPlaysThisMonth: number;
  freeLimit?: number; // default 3 for saved plays
}

const PlayLimitBanner: React.FC<PlayLimitBannerProps> = ({
  subscription,
  savedPlaysThisMonth,
  freeLimit = 3,
}) => {
  if (subscription !== 'free') return null;

  const remaining = Math.max(0, freeLimit - savedPlaysThisMonth);
  // Show when at or below 1 remaining
  if (remaining > 1) return null;

  const handleUpgrade = async () => {
    try {
      const url = '/pricing';
      window.location.assign(url);
    } catch (e) {
      console.warn('Upgrade redirect failed', e);
    }
  };

  return (
    <Alert status={remaining === 0 ? 'error' : 'warning'} borderRadius="md" data-testid="play-limit-banner">
      <AlertIcon />
      <HStack justify="space-between" w="full">
        <div>
          <AlertTitle>
            {remaining === 0 ? 'Play limit reached' : 'You are nearing your play limit'}
          </AlertTitle>
          <AlertDescription>
            <Text>
              {remaining === 0
                ? `You have reached the Free plan limit of ${freeLimit} saved plays.`
                : `You have ${remaining} saved play${remaining === 1 ? '' : 's'} remaining on the Free plan.`}
            </Text>
          </AlertDescription>
        </div>
        <Button colorScheme="brand" onClick={handleUpgrade} data-testid="upgrade-to-pro">
          Upgrade to Pro
        </Button>
      </HStack>
    </Alert>
  );
};

export default PlayLimitBanner;

