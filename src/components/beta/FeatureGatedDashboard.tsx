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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { StarIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { FeatureGate } from '../../hooks/useFeatureFlags';
import { useBetaUser } from '../../hooks/useFeatureFlags';
import secureLogger from '../../utils/secure-logger';

// Beta access required component
const BetaAccessRequired: React.FC = () => {
  const { isBetaUser, betaUser } = useBetaUser();

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Beta Feature Access Required</AlertTitle>
          <AlertDescription>
            The Dashboard is currently in beta and requires special access.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <Heading size="md">Dashboard - Beta Feature</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="start">
              <Text>
                The Dashboard provides a comprehensive overview of your team's performance,
                practice plans, and analytics with real-time data and insights.
              </Text>

              <VStack spacing={2} align="start">
                <Text fontWeight="medium">Features include:</Text>
                <Text fontSize="sm">• Real-time team performance metrics</Text>
                <Text fontSize="sm">• Practice plan analytics</Text>
                <Text fontSize="sm">• Player progress tracking</Text>
                <Text fontSize="sm">• Customizable widgets</Text>
                <Text fontSize="sm">• Advanced reporting</Text>
              </VStack>

              {isBetaUser ? (
                <Alert status="success">
                  <AlertIcon />
                  <AlertTitle>You have beta access!</AlertTitle>
                  <AlertDescription>
                    You can access the Dashboard. Contact support if you're having issues.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert status="warning">
                  <AlertIcon />
                  <AlertTitle>Beta access required</AlertTitle>
                  <AlertDescription>
                    Please contact an administrator to request beta access to the Dashboard.
                  </AlertDescription>
                </Alert>
              )}

              {betaUser && (
                <HStack spacing={4} p={4} bg="gray.50" borderRadius="md">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.500">Beta User</Text>
                    <Text fontWeight="medium">{betaUser.name}</Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.500">Enrolled</Text>
                    <Text fontSize="sm">{betaUser.enrolledAt.toLocaleDateString()}</Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color="gray.500">Feedback</Text>
                    <HStack spacing={1}>
                      <Icon as={StarIcon} color="yellow.500" />
                      <Text fontSize="sm">{betaUser.feedbackCount}</Text>
                    </HStack>
                  </VStack>
                </HStack>
              )}

              <HStack spacing={4}>
                <Button
                  colorScheme="blue"
                  leftIcon={<ExternalLinkIcon />}
                  onClick={() => {
                    secureLogger.info('User requested Dashboard access', {
                      isBetaUser,
                      userId: betaUser?.userId,
                    });
                  }}
                >
                  Request Access
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    secureLogger.info('User viewed Dashboard info', {
                      isBetaUser,
                      userId: betaUser?.userId,
                    });
                  }}
                >
                  Learn More
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

// Feature-gated Dashboard component
export const FeatureGatedDashboard: React.FC = () => {
  return (
    <FeatureGate
      feature="dashboard"
      fallback={<BetaAccessRequired />}
    >
      {/* This would be the actual Dashboard component */}
      <Box p={6}>
        <VStack spacing={6} align="stretch">
          <Alert status="success">
            <AlertIcon />
            <AlertTitle>Dashboard - Beta Access Granted</AlertTitle>
            <AlertDescription>
              You have access to the Dashboard beta feature.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <Heading size="md">Dashboard</Heading>
              <Badge colorScheme="blue">Beta</Badge>
            </CardHeader>
            <CardBody>
              <Text>
                Welcome to the Dashboard! This is where you can view your team's
                performance, practice plans, and analytics.
              </Text>
              
              <Text mt={4}>
                The actual Dashboard component would be rendered here.
              </Text>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </FeatureGate>
  );
};

export default FeatureGatedDashboard;
