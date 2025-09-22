import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Divider,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  GridItem,
  Icon,
  Tooltip,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { 
  CheckIcon, 
  StarIcon, 
  ExternalLinkIcon, 
  WarningIcon,
  InfoIcon 
} from '@chakra-ui/icons';
import { useSubscription } from '../../hooks/useSubscription';
import { SUBSCRIPTION_TIERS } from '../../services/payments/stripe-config';
import secureLogger from '../../utils/secure-logger';

// Subscription management component
export const SubscriptionManagement: React.FC = () => {
  const { 
    userProfile, 
    subscription, 
    isLoading, 
    isFreeTier, 
    isProTier, 
    isEnterpriseTier,
    isActive,
    isCanceled,
    cancelSubscription,
    openCustomerPortal,
    getUsageStatistics,
    refresh
  } = useSubscription();
  
  const [usageStats, setUsageStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Load usage statistics
  const loadUsageStats = async () => {
    if (!userProfile) return;

    try {
      setIsLoadingStats(true);
      const stats = await getUsageStatistics();
      setUsageStats(stats);
    } catch (error) {
      secureLogger.error('Failed to load usage statistics', { error });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    loadUsageStats();
  }, [userProfile]);

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;

    try {
      setIsCanceling(true);
      const success = await cancelSubscription();
      
      if (success) {
        toast({
          title: 'Subscription Canceled',
          description: 'Your subscription has been canceled and will end at the current period.',
          status: 'success',
          duration: 5000,
        });
        await refresh(); // Refresh data
        onClose();
      } else {
        toast({
          title: 'Cancellation Failed',
          description: 'Failed to cancel your subscription. Please try again or contact support.',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      secureLogger.error('Failed to cancel subscription', { error });
      toast({
        title: 'Cancellation Error',
        description: 'An error occurred while canceling your subscription.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsCanceling(false);
    }
  };

  // Handle customer portal
  const handleOpenCustomerPortal = async () => {
    try {
      const success = await openCustomerPortal();
      if (!success) {
        toast({
          title: 'Portal Unavailable',
          description: 'Unable to open customer portal. Please contact support.',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      secureLogger.error('Failed to open customer portal', { error });
      toast({
        title: 'Portal Error',
        description: 'An error occurred while opening the customer portal.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Get current tier info
  const getCurrentTierInfo = () => {
    if (!userProfile) return null;
    return SUBSCRIPTION_TIERS[userProfile.tier];
  };

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  // Get usage percentage
  const getUsagePercentage = (usage: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((usage / limit) * 100, 100);
  };

  // Get usage color
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'orange';
    if (percentage >= 50) return 'yellow';
    return 'green';
  };

  // Loading state
  if (isLoading) {
    return (
      <Box py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading subscription information...</Text>
        </VStack>
      </Box>
    );
  }

  // No subscription state
  if (!userProfile) {
    return (
      <Box py={8}>
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>No Subscription Found</AlertTitle>
          <AlertDescription>
            Unable to load your subscription information. Please refresh the page or contact support.
          </AlertDescription>
        </Alert>
      </Box>
    );
  }

  const tierInfo = getCurrentTierInfo();

  return (
    <Box py={8}>
      <VStack spacing={8} align="stretch">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={2}>
                <Heading size="md">Current Plan</Heading>
                <HStack>
                  <Badge colorScheme="blue" fontSize="md">
                    {tierInfo?.name}
                  </Badge>
                  {isCanceled() && (
                    <Badge colorScheme="red">Canceled</Badge>
                  )}
                  {isActive() && !isCanceled() && (
                    <Badge colorScheme="green">Active</Badge>
                  )}
                </HStack>
              </VStack>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ExternalLinkIcon />}
                onClick={handleOpenCustomerPortal}
              >
                Manage Billing
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Plan Details */}
              <HStack justify="space-between">
                <Text fontWeight="medium">Plan Price:</Text>
                <Text>
                  {tierInfo?.price === 0 ? 'Free' : `$${(tierInfo?.price || 0) / 100}/${tierInfo?.interval}`}
                </Text>
              </HStack>
              
              {subscription?.currentPeriodEnd && (
                <HStack justify="space-between">
                  <Text fontWeight="medium">Next Billing:</Text>
                  <Text>{formatDate(subscription.currentPeriodEnd)}</Text>
                </HStack>
              )}

              {subscription?.trialEnd && (
                <HStack justify="space-between">
                  <Text fontWeight="medium">Trial Ends:</Text>
                  <Text>{formatDate(subscription.trialEnd)}</Text>
                </HStack>
              )}

              {/* Canceled Notice */}
              {isCanceled() && (
                <Alert status="warning">
                  <AlertIcon />
                  <AlertTitle>Subscription Canceled</AlertTitle>
                  <AlertDescription>
                    Your subscription will end on {formatDate(subscription?.currentPeriodEnd)}. 
                    You can reactivate it anytime before then.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <HStack spacing={4}>
                {!isFreeTier() && !isCanceled() && (
                  <Button
                    colorScheme="red"
                    variant="outline"
                    size="sm"
                    onClick={onOpen}
                  >
                    Cancel Subscription
                  </Button>
                )}
                
                {isFreeTier() && (
                  <Button
                    colorScheme="brand"
                    size="sm"
                    onClick={() => {
                      // Navigate to pricing page
                      window.location.href = '/pricing';
                    }}
                  >
                    Upgrade to Pro
                  </Button>
                )}
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Usage Statistics */}
        {usageStats && (
          <Card>
            <CardHeader>
              <Heading size="md">Usage Statistics</Heading>
            </CardHeader>
            <CardBody>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                {/* Saved Plays */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="medium">Saved Plays</Text>
                    <Text fontSize="sm" color="gray.500">
                      {usageStats.usage.savedPlays} / {usageStats.limits.savedPlays === -1 ? '∞' : usageStats.limits.savedPlays}
                    </Text>
                  </HStack>
                  <Progress
                    value={getUsagePercentage(usageStats.usage.savedPlays, usageStats.limits.savedPlays)}
                    colorScheme={getUsageColor(getUsagePercentage(usageStats.usage.savedPlays, usageStats.limits.savedPlays))}
                    size="sm"
                    borderRadius="md"
                  />
                </Box>

                {/* Team Members */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="medium">Team Members</Text>
                    <Text fontSize="sm" color="gray.500">
                      {usageStats.usage.teamMembers} / {usageStats.limits.teamMembers === -1 ? '∞' : usageStats.limits.teamMembers}
                    </Text>
                  </HStack>
                  <Progress
                    value={getUsagePercentage(usageStats.usage.teamMembers, usageStats.limits.teamMembers)}
                    colorScheme={getUsageColor(getUsagePercentage(usageStats.usage.teamMembers, usageStats.limits.teamMembers))}
                    size="sm"
                    borderRadius="md"
                  />
                </Box>

                {/* AI Generations */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="medium">AI Generations</Text>
                    <Text fontSize="sm" color="gray.500">
                      {usageStats.usage.aiGenerations} / {usageStats.limits.aiGenerations === -1 ? '∞' : usageStats.limits.aiGenerations}
                    </Text>
                  </HStack>
                  <Progress
                    value={getUsagePercentage(usageStats.usage.aiGenerations, usageStats.limits.aiGenerations)}
                    colorScheme={getUsageColor(getUsagePercentage(usageStats.usage.aiGenerations, usageStats.limits.aiGenerations))}
                    size="sm"
                    borderRadius="md"
                  />
                </Box>

                {/* Storage */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="medium">Storage Used</Text>
                    <Text fontSize="sm" color="gray.500">
                      {usageStats.usage.storageUsedGB.toFixed(2)} GB / {usageStats.limits.storageGB === -1 ? '∞' : `${usageStats.limits.storageGB} GB`}
                    </Text>
                  </HStack>
                  <Progress
                    value={getUsagePercentage(usageStats.usage.storageUsedGB, usageStats.limits.storageGB)}
                    colorScheme={getUsageColor(getUsagePercentage(usageStats.usage.storageUsedGB, usageStats.limits.storageGB))}
                    size="sm"
                    borderRadius="md"
                  />
                </Box>
              </Grid>

              {/* Usage Warnings */}
              {!usageStats.isWithinLimits && (
                <Alert status="warning" mt={4}>
                  <AlertIcon />
                  <AlertTitle>Usage Limit Exceeded</AlertTitle>
                  <AlertDescription>
                    You have exceeded one or more usage limits. Consider upgrading your plan.
                  </AlertDescription>
                </Alert>
              )}
            </CardBody>
          </Card>
        )}

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <Heading size="md">Plan Features</Heading>
          </CardHeader>
          <CardBody>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {tierInfo?.features.map((feature, index) => (
                <HStack key={index} align="start">
                  <Icon as={CheckIcon} color="green.500" mt={1} />
                  <Text fontSize="sm">{feature}</Text>
                </HStack>
              ))}
            </Grid>
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
                <Text>
                  Are you sure you want to cancel your subscription? This action cannot be undone.
                </Text>
                <Alert status="warning">
                  <AlertIcon />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Your subscription will remain active until the end of your current billing period. 
                    You will lose access to Pro features after that date.
                  </AlertDescription>
                </Alert>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Keep Subscription
              </Button>
              <Button
                colorScheme="red"
                onClick={handleCancelSubscription}
                isLoading={isCanceling}
                loadingText="Canceling..."
              >
                Cancel Subscription
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default SubscriptionManagement;
