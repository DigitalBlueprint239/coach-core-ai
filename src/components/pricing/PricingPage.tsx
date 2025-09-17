import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  List,
  ListItem,
  ListIcon,
  Divider,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Grid,
  GridItem,
  Icon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { CheckIcon, StarIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useSubscription } from '../../hooks/useSubscription';
import { SUBSCRIPTION_TIERS, SubscriptionTierId } from '../../services/payments/stripe-config';
import { stripeService } from '../../services/payments/stripe-config';
import secureLogger from '../../utils/secure-logger';

// Pricing page component
export const PricingPage: React.FC = () => {
  const { 
    userProfile, 
    isLoading, 
    upgradeSubscription, 
    isFreeTier, 
    isProTier, 
    isEnterpriseTier,
    isActive,
    isCanceled 
  } = useSubscription();
  
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierId | null>(null);
  const toast = useToast();

  // Handle tier selection
  const handleTierSelect = async (tierId: SubscriptionTierId) => {
    if (tierId === 'FREE') {
      toast({
        title: 'Already on Free Tier',
        description: 'You are already using the free tier.',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    if (userProfile?.tier === tierId) {
      toast({
        title: 'Already on This Tier',
        description: 'You are already subscribed to this tier.',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    try {
      setIsUpgrading(true);
      setSelectedTier(tierId);

      const success = await upgradeSubscription(tierId);
      
      if (success) {
        toast({
          title: 'Redirecting to Checkout',
          description: 'You will be redirected to complete your purchase.',
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Upgrade Failed',
          description: 'Failed to start the upgrade process. Please try again.',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      secureLogger.error('Failed to upgrade subscription', { error });
      toast({
        title: 'Upgrade Error',
        description: 'An error occurred during the upgrade process.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUpgrading(false);
      setSelectedTier(null);
    }
  };

  // Get current tier info
  const getCurrentTierInfo = () => {
    if (!userProfile) return null;
    return SUBSCRIPTION_TIERS[userProfile.tier];
  };

  // Check if tier is current
  const isCurrentTier = (tierId: SubscriptionTierId) => {
    return userProfile?.tier === tierId;
  };

  // Check if tier is available for upgrade
  const isTierAvailable = (tierId: SubscriptionTierId) => {
    if (tierId === 'FREE') return true;
    if (tierId === 'PRO') return true;
    if (tierId === 'ENTERPRISE') return userProfile?.tier === 'PRO';
    return false;
  };

  // Get tier status
  const getTierStatus = (tierId: SubscriptionTierId) => {
    if (isCurrentTier(tierId)) {
      if (isCanceled()) return 'Canceled';
      if (isActive()) return 'Active';
      return 'Current';
    }
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <Box py={20}>
        <Container maxW="container.xl">
          <VStack spacing={8}>
            <Spinner size="xl" color="brand.500" />
            <Text>Loading pricing information...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box py={20} bg={useColorModeValue('gray.50', 'gray.900')}>
      <Container maxW="container.xl">
        <VStack spacing={16}>
          {/* Header */}
          <VStack spacing={6} textAlign="center">
            <Heading size="2xl" color={useColorModeValue('gray.800', 'white')}>
              Choose Your Plan
            </Heading>
            <Text fontSize="xl" color={useColorModeValue('gray.600', 'gray.300')} maxW="2xl">
              Start with our free tier and upgrade as your team grows. 
              All plans include our core features with different limits and capabilities.
            </Text>
          </VStack>

          {/* Current Subscription Status */}
          {userProfile && (
            <Card maxW="md" mx="auto">
              <CardBody>
                <VStack spacing={4}>
                  <HStack>
                    <Text fontWeight="bold">Current Plan:</Text>
                    <Badge colorScheme="blue" fontSize="md">
                      {getCurrentTierInfo()?.name}
                    </Badge>
                  </HStack>
                  {isCanceled() && (
                    <Alert status="warning">
                      <AlertIcon />
                      <AlertTitle>Subscription Canceled</AlertTitle>
                      <AlertDescription>
                        Your subscription will end at the current period.
                      </AlertDescription>
                    </Alert>
                  )}
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Pricing Cards */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={8} w="full">
            {Object.entries(SUBSCRIPTION_TIERS).map(([tierId, tier]) => {
              const isCurrent = isCurrentTier(tierId as SubscriptionTierId);
              const isAvailable = isTierAvailable(tierId as SubscriptionTierId);
              const status = getTierStatus(tierId as SubscriptionTierId);
              const isSelected = selectedTier === tierId;

              return (
                <GridItem key={tierId}>
                  <Card
                    h="full"
                    borderWidth={isCurrent ? 2 : 1}
                    borderColor={isCurrent ? 'brand.500' : 'gray.200'}
                    position="relative"
                    _hover={{ transform: 'translateY(-4px)', shadow: 'lg' }}
                    transition="all 0.2s"
                  >
                    {/* Popular Badge */}
                    {tierId === 'PRO' && (
                      <Badge
                        position="absolute"
                        top={-2}
                        left="50%"
                        transform="translateX(-50%)"
                        colorScheme="blue"
                        fontSize="sm"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        Most Popular
                      </Badge>
                    )}

                    <CardHeader textAlign="center" pb={2}>
                      <VStack spacing={2}>
                        <Heading size="lg">{tier.name}</Heading>
                        <HStack>
                          <Text fontSize="3xl" fontWeight="bold" color="brand.500">
                            {tier.price === 0 ? 'Free' : `$${(tier.price / 100).toFixed(0)}`}
                          </Text>
                          {tier.price > 0 && (
                            <Text color="gray.500">/{tier.interval}</Text>
                          )}
                        </HStack>
                        {status && (
                          <Badge colorScheme={isCurrent ? 'green' : 'gray'}>
                            {status}
                          </Badge>
                        )}
                      </VStack>
                    </CardHeader>

                    <CardBody pt={0}>
                      <VStack spacing={6} align="stretch">
                        {/* Features List */}
                        <List spacing={3}>
                          {tier.features.map((feature, index) => (
                            <ListItem key={index}>
                              <HStack align="start">
                                <ListIcon as={CheckIcon} color="green.500" />
                                <Text fontSize="sm">{feature}</Text>
                              </HStack>
                            </ListItem>
                          ))}
                        </List>

                        <Divider />

                        {/* Limits */}
                        <VStack spacing={2} align="stretch">
                          <Text fontWeight="bold" fontSize="sm" color="gray.600">
                            Limits:
                          </Text>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Saved Plays:</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              {tier.limits.savedPlays === -1 ? 'Unlimited' : tier.limits.savedPlays}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Team Members:</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              {tier.limits.teamMembers === -1 ? 'Unlimited' : tier.limits.teamMembers}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">AI Generations:</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              {tier.limits.aiGenerations === -1 ? 'Unlimited' : tier.limits.aiGenerations}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Storage:</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              {tier.limits.storageGB === -1 ? 'Unlimited' : `${tier.limits.storageGB} GB`}
                            </Text>
                          </HStack>
                        </VStack>

                        {/* Action Button */}
                        <Button
                          colorScheme={isCurrent ? 'gray' : 'brand'}
                          variant={isCurrent ? 'outline' : 'solid'}
                          size="lg"
                          isDisabled={!isAvailable || isUpgrading}
                          isLoading={isSelected && isUpgrading}
                          loadingText="Processing..."
                          onClick={() => handleTierSelect(tierId as SubscriptionTierId)}
                          leftIcon={isCurrent ? <CheckIcon /> : <ExternalLinkIcon />}
                        >
                          {isCurrent 
                            ? 'Current Plan' 
                            : tierId === 'FREE' 
                              ? 'Get Started' 
                              : 'Upgrade Now'
                          }
                        </Button>

                        {/* Availability Notice */}
                        {!isAvailable && tierId !== 'FREE' && (
                          <Text fontSize="xs" color="gray.500" textAlign="center">
                            Upgrade to Pro first
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
              );
            })}
          </Grid>

          {/* FAQ Section */}
          <VStack spacing={8} w="full" maxW="4xl">
            <Heading size="xl" textAlign="center">
              Frequently Asked Questions
            </Heading>
            
            <VStack spacing={6} w="full">
              <Box w="full" p={6} bg={useColorModeValue('white', 'gray.800')} borderRadius="md">
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold">Can I change my plan anytime?</Text>
                  <Text color={useColorModeValue('gray.600', 'gray.300')}>
                    Yes, you can upgrade or downgrade your plan at any time. 
                    Changes take effect immediately, and you'll be charged or credited accordingly.
                  </Text>
                </VStack>
              </Box>

              <Box w="full" p={6} bg={useColorModeValue('white', 'gray.800')} borderRadius="md">
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold">What happens to my data if I cancel?</Text>
                  <Text color={useColorModeValue('gray.600', 'gray.300')}>
                    Your data is safe. You can export your plays and team data before canceling. 
                    We'll keep your account active for 30 days after cancellation.
                  </Text>
                </VStack>
              </Box>

              <Box w="full" p={6} bg={useColorModeValue('white', 'gray.800')} borderRadius="md">
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold">Do you offer refunds?</Text>
                  <Text color={useColorModeValue('gray.600', 'gray.300')}>
                    We offer a 30-day money-back guarantee for all paid plans. 
                    Contact support if you're not satisfied with your subscription.
                  </Text>
                </VStack>
              </Box>

              <Box w="full" p={6} bg={useColorModeValue('white', 'gray.800')} borderRadius="md">
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold">Is there a free trial?</Text>
                  <Text color={useColorModeValue('gray.600', 'gray.300')}>
                    Yes! Our free tier includes demo mode and 3 saved plays. 
                    You can upgrade to Pro anytime to unlock all features.
                  </Text>
                </VStack>
              </Box>
            </VStack>
          </VStack>

          {/* Contact Support */}
          <VStack spacing={4} textAlign="center">
            <Text color={useColorModeValue('gray.600', 'gray.300')}>
              Need help choosing a plan? Contact our support team.
            </Text>
            <Button
              variant="outline"
              leftIcon={<ExternalLinkIcon />}
              onClick={() => {
                // Open support or contact form
                window.open('mailto:support@coachcoreai.com', '_blank');
              }}
            >
              Contact Support
            </Button>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default PricingPage;
