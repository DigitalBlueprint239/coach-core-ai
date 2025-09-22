import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  Grid,
  GridItem,
  IconButton,
  Tooltip,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { EditIcon, ExternalLinkIcon, WarningIcon, CheckIcon } from '@chakra-ui/icons';
import { useSubscription, useSubscriptionCheckout } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { stripeCheckoutService } from '../../services/payments/stripe-checkout';
import secureLogger from '../../utils/secure-logger';

// Subscription dashboard component
export const SubscriptionDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    subscription, 
    usage, 
    loading, 
    error, 
    getSubscriptionTier, 
    isActive, 
    getLimits,
    cancelSubscription 
  } = useSubscription(user?.uid || '');
  
  const { startCheckout } = useSubscriptionCheckout();
  const [limits, setLimits] = useState<any>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [canceling, setCanceling] = useState(false);
  const toast = useToast();

  // Load limits on mount
  React.useEffect(() => {
    const loadLimits = async () => {
      if (user?.uid) {
        setLoadingLimits(true);
        try {
          const limitsData = await getLimits();
          setLimits(limitsData);
        } catch (err) {
          secureLogger.error('Failed to load limits', { error: err });
        } finally {
          setLoadingLimits(false);
        }
      }
    };
    loadLimits();
  }, [user?.uid, getLimits]);

  // Handle upgrade
  const handleUpgrade = async () => {
    if (!user) return;

    try {
      const config = {
        userId: user.uid,
        tier: 'pro',
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/dashboard?subscription=canceled`,
        metadata: {
          email: user.email,
          name: user.displayName || 'User',
        },
      };

      await startCheckout(config);
    } catch (error) {
      secureLogger.error('Failed to start upgrade', { error });
      toast({
        title: 'Upgrade failed',
        description: 'Unable to start upgrade process. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;

    try {
      setCanceling(true);
      await cancelSubscription(true); // Cancel at period end
      
      toast({
        title: 'Subscription canceled',
        description: 'Your subscription will be canceled at the end of the current billing period.',
        status: 'success',
        duration: 5000,
      });
      
      onClose();
    } catch (error) {
      secureLogger.error('Failed to cancel subscription', { error });
      toast({
        title: 'Cancelation failed',
        description: 'Unable to cancel subscription. Please contact support.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setCanceling(false);
    }
  };

  // Handle manage subscription
  const handleManageSubscription = async () => {
    if (!subscription?.stripeCustomerId) {
      toast({
        title: 'Customer portal unavailable',
        description: 'Unable to access customer portal. Please contact support.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const result = await stripeCheckoutService.redirectToCustomerPortal(
        subscription.stripeCustomerId,
        `${window.location.origin}/dashboard`
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to open customer portal');
      }
    } catch (error) {
      secureLogger.error('Failed to open customer portal', { error });
      toast({
        title: 'Portal unavailable',
        description: 'Unable to open customer portal. Please contact support.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Get subscription status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'green';
      case 'trialing': return 'blue';
      case 'past_due': return 'orange';
      case 'canceled': return 'red';
      case 'unpaid': return 'red';
      default: return 'gray';
    }
  };

  // Calculate usage percentage
  const getUsagePercentage = (current: number, max: number): number => {
    if (max === -1) return 0; // Unlimited
    if (max === 0) return 100; // No access
    return Math.min((current / max) * 100, 100);
  };

  // Format date
  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Center py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading subscription details...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Error loading subscription</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  const tier = getSubscriptionTier();
  const active = isActive();

  return (
    <Box py={6} maxW="1200px" mx="auto" px={4}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              Subscription Management
            </Text>
            <Text color="gray.600">
              Manage your subscription and usage
            </Text>
          </VStack>
          <HStack spacing={3}>
            {tier === 'free' && (
              <Button colorScheme="blue" onClick={handleUpgrade}>
                Upgrade to Pro
              </Button>
            )}
            {active && subscription?.stripeCustomerId && (
              <Button variant="outline" onClick={handleManageSubscription}>
                <HStack spacing={2}>
                  <Text>Manage Billing</Text>
                  <ExternalLinkIcon boxSize={3} />
                </HStack>
              </Button>
            )}
          </HStack>
        </HStack>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={1}>
                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                  Current Plan
                </Text>
                <Text color="gray.600">
                  {tier === 'free' ? 'Free Plan' : `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
                </Text>
              </VStack>
              <Badge colorScheme={getStatusColor(subscription?.status || 'inactive')} size="lg">
                {subscription?.status || 'inactive'}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            {subscription && (
              <VStack spacing={4} align="stretch">
                <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                  <Stat>
                    <StatLabel>Billing Period</StatLabel>
                    <StatNumber fontSize="md">
                      {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                    </StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Next Billing Date</StatLabel>
                    <StatNumber fontSize="md">
                      {formatDate(subscription.currentPeriodEnd)}
                    </StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Auto Renewal</StatLabel>
                    <StatNumber fontSize="md">
                      {subscription.cancelAtPeriodEnd ? 'No' : 'Yes'}
                    </StatNumber>
                  </Stat>
                </Grid>

                {subscription.cancelAtPeriodEnd && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Subscription will be canceled</AlertTitle>
                      <AlertDescription>
                        Your subscription will end on {formatDate(subscription.currentPeriodEnd)} and will not renew.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Usage Statistics */}
        {usage && limits && (
          <Card>
            <CardHeader>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                Usage Statistics
              </Text>
            </CardHeader>
            <CardBody pt={0}>
              <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
                {/* Teams */}
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      Teams Created
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {usage.teamsCreated} / {limits.maxTeams === -1 ? '∞' : limits.maxTeams}
                    </Text>
                  </HStack>
                  {limits.maxTeams !== -1 && (
                    <Progress
                      value={getUsagePercentage(usage.teamsCreated, limits.maxTeams)}
                      colorScheme={getUsagePercentage(usage.teamsCreated, limits.maxTeams) > 80 ? 'red' : 'blue'}
                      size="sm"
                      borderRadius="md"
                    />
                  )}
                </VStack>

                {/* Players */}
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      Players Added
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {usage.playersAdded} / {limits.maxPlayers === -1 ? '∞' : limits.maxPlayers}
                    </Text>
                  </HStack>
                  {limits.maxPlayers !== -1 && (
                    <Progress
                      value={getUsagePercentage(usage.playersAdded, limits.maxPlayers)}
                      colorScheme={getUsagePercentage(usage.playersAdded, limits.maxPlayers) > 80 ? 'red' : 'blue'}
                      size="sm"
                      borderRadius="md"
                    />
                  )}
                </VStack>

                {/* Plays */}
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      Plays Created
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {usage.playsCreated} / {limits.maxPlays === -1 ? '∞' : limits.maxPlays}
                    </Text>
                  </HStack>
                  {limits.maxPlays !== -1 && (
                    <Progress
                      value={getUsagePercentage(usage.playsCreated, limits.maxPlays)}
                      colorScheme={getUsagePercentage(usage.playsCreated, limits.maxPlays) > 80 ? 'red' : 'blue'}
                      size="sm"
                      borderRadius="md"
                    />
                  )}
                </VStack>

                {/* AI Generations */}
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      AI Generations
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {usage.aiGenerations} / {limits.aiGenerations === -1 ? '∞' : limits.aiGenerations}
                    </Text>
                  </HStack>
                  {limits.aiGenerations !== -1 && (
                    <Progress
                      value={getUsagePercentage(usage.aiGenerations, limits.aiGenerations)}
                      colorScheme={getUsagePercentage(usage.aiGenerations, limits.aiGenerations) > 80 ? 'red' : 'blue'}
                      size="sm"
                      borderRadius="md"
                    />
                  )}
                </VStack>
              </Grid>
            </CardBody>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              Actions
            </Text>
          </CardHeader>
          <CardBody pt={0}>
            <HStack spacing={4} wrap="wrap">
              {tier === 'free' && (
                <Button colorScheme="blue" onClick={handleUpgrade}>
                  Upgrade to Pro
                </Button>
              )}
              
              {active && subscription?.stripeCustomerId && (
                <Button variant="outline" onClick={handleManageSubscription}>
                  <HStack spacing={2}>
                    <Text>Manage Billing</Text>
                    <ExternalLinkIcon boxSize={3} />
                  </HStack>
                </Button>
              )}

              {active && !subscription?.cancelAtPeriodEnd && (
                <Button variant="outline" colorScheme="red" onClick={onOpen}>
                  Cancel Subscription
                </Button>
              )}

              <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
                View All Plans
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Cancel Subscription Modal */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Cancel Subscription</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Are you sure?</AlertTitle>
                    <AlertDescription>
                      Your subscription will be canceled at the end of the current billing period. 
                      You'll continue to have access until {subscription && formatDate(subscription.currentPeriodEnd)}.
                    </AlertDescription>
                  </Box>
                </Alert>
                <Text color="gray.600">
                  You can reactivate your subscription at any time before the end of your billing period.
                </Text>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <HStack spacing={3}>
                <Button variant="outline" onClick={onClose}>
                  Keep Subscription
                </Button>
                <Button 
                  colorScheme="red" 
                  onClick={handleCancelSubscription}
                  isLoading={canceling}
                  loadingText="Canceling..."
                >
                  Cancel Subscription
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default SubscriptionDashboard;
