// @ts-nocheck
import React from 'react';
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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Icon,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  CheckIcon, 
  StarIcon, 
  ExternalLinkIcon, 
  LockIcon,
  TriangleUpIcon 
} from '@chakra-ui/icons';
import { useSubscription } from '../../hooks/useSubscription';
import { SUBSCRIPTION_TIERS } from '../../services/payments/stripe-config';
import secureLogger from '../../utils/secure-logger';

// Subscription-gated Play Designer component
export const SubscriptionGatedPlayDesigner: React.FC = () => {
  const { 
    userProfile, 
    isFreeTier, 
    isProTier, 
    isEnterpriseTier,
    hasFeatureAccess,
    isWithinLimits,
    updateUsage
  } = useSubscription();

  // Check if user has access to Play Designer
  const [hasAccess, setHasAccess] = React.useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = React.useState(true);

  // Check access on mount
  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsCheckingAccess(true);
        const access = await hasFeatureAccess('Play Designer');
        setHasAccess(access);
      } catch (error) {
        secureLogger.error('Failed to check Play Designer access', { error });
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [hasFeatureAccess]);

  // Handle play creation
  const handlePlayCreation = async () => {
    if (!hasAccess) return;

    try {
      // Check if user is within limits
      const withinLimits = await isWithinLimits('savedPlays', 0);
      if (!withinLimits) {
        // Show upgrade prompt
        return;
      }

      // Update usage
      await updateUsage('savedPlays', 1);
      
      // Proceed with play creation
      secureLogger.info('Play created', { userId: userProfile?.userId });
    } catch (error) {
      secureLogger.error('Failed to create play', { error });
    }
  };

  // Get current tier info
  const getCurrentTierInfo = () => {
    if (!userProfile) return null;
    return SUBSCRIPTION_TIERS[userProfile.tier];
  };

  // Get upgrade tier info
  const getUpgradeTierInfo = () => {
    if (isFreeTier()) return SUBSCRIPTION_TIERS.PRO;
    if (isProTier()) return SUBSCRIPTION_TIERS.ENTERPRISE;
    return null;
  };

  // Handle upgrade
  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  // Loading state
  if (isCheckingAccess) {
    return (
      <Box p={6}>
        <VStack spacing={4}>
          <Text>Checking access permissions...</Text>
        </VStack>
      </Box>
    );
  }

  // Access granted - show Play Designer
  if (hasAccess) {
    return (
      <Box p={6}>
        <VStack spacing={6} align="stretch">
          <Alert status="success">
            <AlertIcon />
            <AlertTitle>Play Designer Access Granted</AlertTitle>
            <AlertDescription>
              You have access to the Play Designer. Create unlimited plays with AI assistance.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">Play Designer</Heading>
                <Badge colorScheme="green">Active</Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Text>
                  Welcome to the Play Designer! Create custom plays with AI assistance, 
                  interactive diagrams, and real-time collaboration.
                </Text>

                <Button
                  colorScheme="brand"
                  size="lg"
                  onClick={handlePlayCreation}
                  leftIcon={<StarIcon />}
                >
                  Create New Play
                </Button>

                <Text fontSize="sm" color="gray.500">
                  Your current plan: {getCurrentTierInfo()?.name}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    );
  }

  // Access denied - show upgrade prompt
  const upgradeTier = getUpgradeTierInfo();
  
  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Play Designer Access Required</AlertTitle>
          <AlertDescription>
            The Play Designer is available with a Pro subscription or higher.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Play Designer</Heading>
              <HStack>
                <Icon as={LockIcon} color="gray.500" />
                <Badge colorScheme="gray">Pro Required</Badge>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Text>
                The Play Designer is our most advanced feature, allowing you to create
                custom plays with AI assistance, interactive diagrams, and real-time
                collaboration.
              </Text>

              {/* Features List */}
              <Box>
                <Text fontWeight="bold" mb={3}>Play Designer Features:</Text>
                <List spacing={2}>
                  <ListItem>
                    <HStack align="start">
                      <ListIcon as={CheckIcon} color="green.500" />
                      <Text fontSize="sm">AI-powered play generation</Text>
                    </HStack>
                  </ListItem>
                  <ListItem>
                    <HStack align="start">
                      <ListIcon as={CheckIcon} color="green.500" />
                      <Text fontSize="sm">Interactive field diagrams</Text>
                    </HStack>
                  </ListItem>
                  <ListItem>
                    <HStack align="start">
                      <ListIcon as={CheckIcon} color="green.500" />
                      <Text fontSize="sm">Real-time collaboration</Text>
                    </HStack>
                  </ListItem>
                  <ListItem>
                    <HStack align="start">
                      <ListIcon as={CheckIcon} color="green.500" />
                      <Text fontSize="sm">Export to multiple formats</Text>
                    </HStack>
                  </ListItem>
                  <ListItem>
                    <HStack align="start">
                      <ListIcon as={CheckIcon} color="green.500" />
                      <Text fontSize="sm">Advanced analytics</Text>
                    </HStack>
                  </ListItem>
                </List>
              </Box>

              {/* Current Plan Info */}
              {userProfile && (
                <Box p={4} bg={useColorModeValue('gray.50', 'gray.800')} borderRadius="md">
                  <VStack spacing={2} align="start">
                    <Text fontWeight="bold" fontSize="sm">Current Plan: {getCurrentTierInfo()?.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {getCurrentTierInfo()?.features.slice(0, 3).join(' • ')}
                    </Text>
                  </VStack>
                </Box>
              )}

              {/* Upgrade Options */}
              {upgradeTier && (
                <Box p={4} borderWidth="1px" borderColor="brand.200" borderRadius="md">
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Icon as={TriangleUpIcon} color="brand.500" />
                          <Text fontWeight="bold">{upgradeTier.name} Plan</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          {upgradeTier.price === 0 ? 'Free' : `$${(upgradeTier.price / 100).toFixed(0)}/${upgradeTier.interval}`}
                        </Text>
                      </VStack>
                      <Button
                        colorScheme="brand"
                        size="sm"
                        onClick={handleUpgrade}
                        leftIcon={<ExternalLinkIcon />}
                      >
                        Upgrade Now
                      </Button>
                    </HStack>

                    <Text fontSize="sm" color="gray.600">
                      Includes: {upgradeTier.features.slice(0, 3).join(' • ')}
                    </Text>
                  </VStack>
                </Box>
              )}

              {/* Action Buttons */}
              <HStack spacing={4}>
                <Button
                  colorScheme="brand"
                  onClick={handleUpgrade}
                  leftIcon={<ExternalLinkIcon />}
                >
                  View Pricing Plans
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Navigate to demo or learn more
                    window.location.href = '/demo';
                  }}
                >
                  Try Demo
                </Button>
              </HStack>

              {/* Support */}
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Need help? Contact our support team at{' '}
                <Text as="span" color="brand.500" cursor="pointer">
                  support@coachcoreai.com
                </Text>
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default SubscriptionGatedPlayDesigner;
