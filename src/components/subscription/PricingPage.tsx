// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Container,
  Heading,
  Divider,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionPlans from './SubscriptionPlans';
import secureLogger from '../../utils/secure-logger';

// Pricing page component
export const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, loading } = useSubscription(user?.uid || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const toast = useToast();

  // Handle URL parameters for success/cancel
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    
    if (subscriptionStatus === 'success') {
      setShowSuccess(true);
      toast({
        title: 'Subscription successful!',
        description: 'Welcome to Coach Core AI Pro. You now have access to all premium features.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (subscriptionStatus === 'canceled') {
      setShowCanceled(true);
      toast({
        title: 'Subscription canceled',
        description: 'Your subscription was not completed. You can try again anytime.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  if (loading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading pricing information...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Success Alert */}
      {showSuccess && (
        <Alert status="success" borderRadius="none">
          <AlertIcon />
          <Box>
            <AlertTitle>Subscription successful!</AlertTitle>
            <AlertDescription>
              Welcome to Coach Core AI Pro. You now have access to all premium features.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Canceled Alert */}
      {showCanceled && (
        <Alert status="info" borderRadius="none">
          <AlertIcon />
          <Box>
            <AlertTitle>Subscription canceled</AlertTitle>
            <AlertDescription>
              Your subscription was not completed. You can try again anytime.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Hero Section */}
      <Box bg="white" py={16}>
        <Container maxW="container.xl">
          <VStack spacing={8} textAlign="center">
            <Heading as="h1" size="2xl" color="gray.800">
              Simple, Transparent Pricing
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="600px">
              Choose the perfect plan for your coaching needs. No hidden fees, no surprises.
              Upgrade or downgrade at any time.
            </Text>
            
            {/* Current Subscription Status */}
            {user && subscription && (
              <Box
                bg="blue.50"
                border="1px solid"
                borderColor="blue.200"
                borderRadius="md"
                p={4}
                maxW="400px"
              >
                <VStack spacing={2}>
                  <Text fontSize="sm" fontWeight="medium" color="blue.800">
                    Current Plan
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.900">
                    {subscription.tier === 'free' ? 'Free Plan' : `${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan`}
                  </Text>
                  <Text fontSize="sm" color="blue.700">
                    Status: {subscription.status}
                  </Text>
                </VStack>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>

      {/* Pricing Plans */}
      <Box py={16}>
        <Container maxW="container.xl">
          <SubscriptionPlans />
        </Container>
      </Box>

      {/* Features Comparison */}
      <Box bg="white" py={16}>
        <Container maxW="container.xl">
          <VStack spacing={12} align="stretch">
            <VStack spacing={4} textAlign="center">
              <Heading as="h2" size="xl" color="gray.800">
                Feature Comparison
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="600px">
                See what's included in each plan to make the right choice for your team.
              </Text>
            </VStack>

            {/* Feature Comparison Table */}
            <Box overflowX="auto">
              <Box as="table" width="100%" borderCollapse="collapse">
                <Box as="thead">
                  <Box as="tr" borderBottom="1px solid" borderColor="gray.200">
                    <Box as="th" p={4} textAlign="left" fontWeight="bold" color="gray.800">
                      Features
                    </Box>
                    <Box as="th" p={4} textAlign="center" fontWeight="bold" color="gray.800">
                      Free
                    </Box>
                    <Box as="th" p={4} textAlign="center" fontWeight="bold" color="blue.600">
                      Pro
                    </Box>
                    <Box as="th" p={4} textAlign="center" fontWeight="bold" color="green.600">
                      Pro (Yearly)
                    </Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  {/* Core Features */}
                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Waitlist Access
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Demo Mode
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Full Play Designer
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="red.500">✗</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Advanced Team Dashboard
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="red.500">✗</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      AI Brain Integration
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="red.500">✗</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Practice Planner
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="red.500">✗</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Game Calendar
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="red.500">✗</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Performance Analytics
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="red.500">✗</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="green.500">✓</Text>
                    </Box>
                  </Box>

                  {/* Limits */}
                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Teams
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">1</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Unlimited</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Unlimited</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Players
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">10</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Unlimited</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Unlimited</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Plays
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">5</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Unlimited</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Unlimited</Text>
                    </Box>
                  </Box>

                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      AI Generations
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">0</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">100/month</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">100/month</Text>
                    </Box>
                  </Box>

                  {/* Support */}
                  <Box as="tr" borderBottom="1px solid" borderColor="gray.100">
                    <Box as="td" p={4} fontWeight="medium" color="gray.800">
                      Support
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Community</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Priority</Text>
                    </Box>
                    <Box as="td" p={4} textAlign="center">
                      <Text color="gray.600">Priority</Text>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box bg="gray.50" py={16}>
        <Container maxW="container.xl">
          <VStack spacing={12} align="stretch">
            <VStack spacing={4} textAlign="center">
              <Heading as="h2" size="xl" color="gray.800">
                Frequently Asked Questions
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="600px">
                Have questions? We've got answers.
              </Text>
            </VStack>

            <Box
              display="grid"
              gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
              gap={8}
            >
              <VStack spacing={6} align="stretch">
                <Box>
                  <Text fontWeight="bold" color="gray.800" mb={2}>
                    Can I change my plan anytime?
                  </Text>
                  <Text color="gray.600">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" color="gray.800" mb={2}>
                    Is there a free trial?
                  </Text>
                  <Text color="gray.600">
                    Yes! You can start with our free plan and upgrade when you're ready for more features.
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" color="gray.800" mb={2}>
                    What payment methods do you accept?
                  </Text>
                  <Text color="gray.600">
                    We accept all major credit cards through our secure Stripe payment processor.
                  </Text>
                </Box>
              </VStack>

              <VStack spacing={6} align="stretch">
                <Box>
                  <Text fontWeight="bold" color="gray.800" mb={2}>
                    Can I cancel anytime?
                  </Text>
                  <Text color="gray.600">
                    Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" color="gray.800" mb={2}>
                    Is my data secure?
                  </Text>
                  <Text color="gray.600">
                    Absolutely! We use industry-standard encryption and security practices to protect your data.
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" color="gray.800" mb={2}>
                    Do you offer refunds?
                  </Text>
                  <Text color="gray.600">
                    Yes! We offer a 30-day money-back guarantee for all paid plans.
                  </Text>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box bg="blue.600" py={16}>
        <Container maxW="container.xl">
          <VStack spacing={6} textAlign="center">
            <Heading as="h2" size="xl" color="white">
              Ready to get started?
            </Heading>
            <Text fontSize="lg" color="blue.100" maxW="600px">
              Join thousands of coaches who are already using Coach Core AI to improve their teams.
            </Text>
            <HStack spacing={4}>
              <Button size="lg" colorScheme="white" variant="solid" onClick={() => window.location.href = '/signup'}>
                Get Started Free
              </Button>
              <Button size="lg" colorScheme="white" variant="outline" onClick={() => window.location.href = '/contact'}>
                Contact Sales
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default PricingPage;
