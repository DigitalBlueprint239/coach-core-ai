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
            The Play Designer is currently in beta and requires special access.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <Heading size="md">Play Designer - Beta Feature</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="start">
              <Text>
                The Play Designer is our most advanced feature, allowing you to create
                custom plays with AI assistance, interactive diagrams, and real-time
                collaboration.
              </Text>

              <VStack spacing={2} align="start">
                <Text fontWeight="medium">Features include:</Text>
                <Text fontSize="sm">• AI-powered play generation</Text>
                <Text fontSize="sm">• Interactive field diagrams</Text>
                <Text fontSize="sm">• Real-time collaboration</Text>
                <Text fontSize="sm">• Export to multiple formats</Text>
                <Text fontSize="sm">• Advanced analytics</Text>
              </VStack>

              {isBetaUser ? (
                <Alert status="success">
                  <AlertIcon />
                  <AlertTitle>You have beta access!</AlertTitle>
                  <AlertDescription>
                    You can access the Play Designer. Contact support if you're having issues.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert status="warning">
                  <AlertIcon />
                  <AlertTitle>Beta access required</AlertTitle>
                  <AlertDescription>
                    Please contact an administrator to request beta access to the Play Designer.
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
                    secureLogger.info('User requested Play Designer access', {
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
                    secureLogger.info('User viewed Play Designer info', {
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

// Feature-gated Play Designer component
export const FeatureGatedPlayDesigner: React.FC = () => {
  return (
    <FeatureGate
      feature="playDesigner"
      fallback={<BetaAccessRequired />}
    >
      {/* This would be the actual Play Designer component */}
      <Box p={6}>
        <VStack spacing={6} align="stretch">
          <Alert status="success">
            <AlertIcon />
            <AlertTitle>Play Designer - Beta Access Granted</AlertTitle>
            <AlertDescription>
              You have access to the Play Designer beta feature.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <Heading size="md">Play Designer</Heading>
              <Badge colorScheme="blue">Beta</Badge>
            </CardHeader>
            <CardBody>
              <Text>
                Welcome to the Play Designer! This is where you can create custom plays
                with AI assistance and interactive diagrams.
              </Text>
              
              <Text mt={4}>
                The actual Play Designer component would be rendered here.
              </Text>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </FeatureGate>
  );
};

export default FeatureGatedPlayDesigner;
