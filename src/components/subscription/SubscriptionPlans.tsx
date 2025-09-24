// @ts-nocheck
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
  List,
  ListItem,
  ListIcon,
  Divider,
  useToast,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Icon,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import { CheckIcon, StarIcon, LockIcon } from '@chakra-ui/icons';
import { useSubscriptionTiers, useSubscriptionCheckout } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { SubscriptionTier } from '../../services/payments/stripe-config';
import secureLogger from '../../utils/secure-logger';

// Subscription plans component
export const SubscriptionPlans: React.FC = () => {
  const { user } = useAuth();
  const { tiers, loading: tiersLoading, formatPrice } = useSubscriptionTiers();
  const { startCheckout, loading: checkoutLoading } = useSubscriptionCheckout();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const toast = useToast();

  // Handle tier selection
  const handleTierSelect = async (tier: SubscriptionTier) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to subscribe.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      setSelectedTier(tier.id);

      const config = {
        userId: user.uid,
        tier: tier.id,
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
        metadata: {
          email: user.email,
          name: user.displayName || 'User',
        },
      };

      await startCheckout(config);

    } catch (error) {
      secureLogger.error('Failed to start checkout', { error, tier: tier.id });
      toast({
        title: 'Checkout failed',
        description: 'Unable to start checkout process. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSelectedTier(null);
    }
  };

  // Get tier badge color
  const getTierBadgeColor = (tier: SubscriptionTier): string => {
    if (tier.id === 'free') return 'gray';
    if (tier.id === 'pro') return 'blue';
    if (tier.id === 'pro_yearly') return 'green';
    return 'gray';
  };

  // Check if tier is popular
  const isPopular = (tier: SubscriptionTier): boolean => {
    return tier.id === 'pro';
  };

  // Check if tier is best value
  const isBestValue = (tier: SubscriptionTier): boolean => {
    return tier.id === 'pro_yearly';
  };

  if (tiersLoading) {
    return (
      <Center py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading subscription plans...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box py={8} maxW="1200px" mx="auto" px={4}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <Text fontSize="3xl" fontWeight="bold" color="gray.800">
            Choose Your Plan
          </Text>
          <Text fontSize="lg" color="gray.600" maxW="600px">
            Select the perfect plan for your coaching needs. Upgrade or downgrade at any time.
          </Text>
        </VStack>

        {/* Plans Grid */}
        <Box
          display="grid"
          gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
          gap={6}
          maxW="1000px"
          mx="auto"
        >
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              position="relative"
              borderWidth={isPopular(tier) ? '2px' : '1px'}
              borderColor={isPopular(tier) ? 'blue.500' : 'gray.200'}
              borderRadius="lg"
              overflow="hidden"
              _hover={{
                transform: 'translateY(-4px)',
                shadow: 'xl',
                transition: 'all 0.2s',
              }}
              transition="all 0.2s"
            >
              {/* Popular Badge */}
              {isPopular(tier) && (
                <Box
                  position="absolute"
                  top={0}
                  left="50%"
                  transform="translateX(-50%)"
                  bg="blue.500"
                  color="white"
                  px={4}
                  py={1}
                  borderRadius="0 0 8px 8px"
                  fontSize="sm"
                  fontWeight="bold"
                  zIndex={1}
                >
                  <HStack spacing={1}>
                    <StarIcon boxSize={3} />
                    <Text>Most Popular</Text>
                  </HStack>
                </Box>
              )}

              {/* Best Value Badge */}
              {isBestValue(tier) && (
                <Box
                  position="absolute"
                  top={0}
                  left="50%"
                  transform="translateX(-50%)"
                  bg="green.500"
                  color="white"
                  px={4}
                  py={1}
                  borderRadius="0 0 8px 8px"
                  fontSize="sm"
                  fontWeight="bold"
                  zIndex={1}
                >
                  <HStack spacing={1}>
                    <Icon as={CheckIcon} boxSize={3} />
                    <Text>Best Value</Text>
                  </HStack>
                </Box>
              )}

              <CardHeader pb={2}>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="xl" fontWeight="bold" color="gray.800">
                        {tier.name}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {tier.description}
                      </Text>
                    </VStack>
                    <Badge colorScheme={getTierBadgeColor(tier)} size="lg">
                      {tier.id === 'free' ? 'Free' : 'Paid'}
                    </Badge>
                  </HStack>

                  <Box textAlign="center" py={2}>
                    <Text fontSize="4xl" fontWeight="bold" color="blue.600">
                      {tier.price === 0 ? 'Free' : formatPrice(tier.price, tier.currency)}
                    </Text>
                    {tier.price > 0 && (
                      <Text fontSize="sm" color="gray.600">
                        per {tier.interval}
                      </Text>
                    )}
                  </Box>
                </VStack>
              </CardHeader>

              <CardBody pt={0}>
                <VStack spacing={4} align="stretch">
                  {/* Features List */}
                  <List spacing={2}>
                    {tier.features.map((feature, index) => (
                      <ListItem key={index} fontSize="sm">
                        <HStack align="start" spacing={2}>
                          <ListIcon as={CheckIcon} color="green.500" />
                          <Text color="gray.700">{feature}</Text>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>

                  <Divider />

                  {/* Action Button */}
                  <Button
                    colorScheme={isPopular(tier) ? 'blue' : 'gray'}
                    size="lg"
                    width="full"
                    isLoading={selectedTier === tier.id && checkoutLoading}
                    loadingText="Starting checkout..."
                    onClick={() => handleTierSelect(tier)}
                    isDisabled={!user}
                  >
                    {tier.id === 'free' ? 'Get Started' : 'Subscribe Now'}
                  </Button>

                  {/* Additional Info */}
                  {tier.id === 'free' && (
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      No credit card required
                    </Text>
                  )}

                  {tier.id === 'pro_yearly' && (
                    <Text fontSize="xs" color="green.600" textAlign="center" fontWeight="medium">
                      Save 2 months with yearly billing
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          ))}
        </Box>

        {/* Additional Information */}
        <VStack spacing={4} textAlign="center" pt={8}>
          <Text fontSize="lg" fontWeight="medium" color="gray.700">
            All plans include:
          </Text>
          <HStack spacing={8} wrap="wrap" justify="center">
            <HStack spacing={2}>
              <CheckIcon color="green.500" />
              <Text fontSize="sm" color="gray.600">30-day money-back guarantee</Text>
            </HStack>
            <HStack spacing={2}>
              <CheckIcon color="green.500" />
              <Text fontSize="sm" color="gray.600">Cancel anytime</Text>
            </HStack>
            <HStack spacing={2}>
              <CheckIcon color="green.500" />
              <Text fontSize="sm" color="gray.600">Secure payment processing</Text>
            </HStack>
            <HStack spacing={2}>
              <CheckIcon color="green.500" />
              <Text fontSize="sm" color="gray.600">24/7 customer support</Text>
            </HStack>
          </HStack>
        </VStack>

        {/* FAQ or Help */}
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Need help choosing?</AlertTitle>
            <AlertDescription>
              Contact our support team for personalized recommendations based on your team size and coaching needs.
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default SubscriptionPlans;
