import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Divider,
} from '@chakra-ui/react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Bug, Shield, Database } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../services/firebase/firebase-config';

const AuthDebug: React.FC = () => {
  const { user, profile, isLoading, error } = useAuth();
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authState, setAuthState] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Get current Firebase user
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
      console.log('🔍 Firebase auth state changed:', user);
    });

    return () => unsubscribe();
  }, []);

  const refreshAuthState = () => {
    setIsRefreshing(true);
    // Force a refresh by checking auth state
    auth.currentUser?.reload().then(() => {
      setFirebaseUser(auth.currentUser);
      toast({
        title: '🔄 Auth State Refreshed',
        description: 'Authentication state has been refreshed',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }).catch((error) => {
      console.error('Error refreshing auth state:', error);
      toast({
        title: '❌ Refresh Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }).finally(() => {
      setIsRefreshing(false);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'warning': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={20} />;
      case 'error': return <XCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      default: return null;
    }
  };

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="lg" color="brand.500" mb={2}>
            🔍 Authentication Debug Panel
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Troubleshoot authentication issues and verify Firebase configuration
          </Text>
        </Box>

        {/* Controls */}
        <Card>
          <CardHeader>
            <Heading size="md">Controls</Heading>
          </CardHeader>
          <CardBody>
            <Button
              colorScheme="blue"
              onClick={refreshAuthState}
              isLoading={isRefreshing}
              loadingText="Refreshing..."
              leftIcon={<RefreshCw />}
            >
              🔄 Refresh Auth State
            </Button>
          </CardBody>
        </Card>

        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <Heading size="md">🔐 Authentication Status</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="bold">Loading State:</Text>
                <Badge colorScheme={isLoading ? 'yellow' : 'green'}>
                  {isLoading ? 'Loading...' : 'Loaded'}
                </Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontWeight="bold">User Authenticated:</Text>
                <Badge colorScheme={user ? 'green' : 'red'}>
                  {user ? 'Yes' : 'No'}
                </Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontWeight="bold">Profile Loaded:</Text>
                <Badge colorScheme={profile ? 'green' : 'red'}>
                  {profile ? 'Yes' : 'No'}
                </Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontWeight="bold">Firebase User:</Text>
                <Badge colorScheme={firebaseUser ? 'green' : 'red'}>
                  {firebaseUser ? 'Connected' : 'Not Connected'}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* User Information */}
        {user && (
          <Card>
            <CardHeader>
              <Heading size="md">👤 User Information</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Box>
                  <Text fontWeight="bold">User ID:</Text>
                  <Code>{user.uid}</Code>
                </Box>
                <Box>
                  <Text fontWeight="bold">Email:</Text>
                  <Code>{user.email}</Code>
                </Box>
                <Box>
                  <Text fontWeight="bold">Display Name:</Text>
                  <Code>{user.displayName || 'Not set'}</Code>
                </Box>
                <Box>
                  <Text fontWeight="bold">Email Verified:</Text>
                  <Badge colorScheme={user.emailVerified ? 'green' : 'red'}>
                    {user.emailVerified ? 'Yes' : 'No'}
                  </Badge>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Profile Information */}
        {profile && (
          <Card>
            <CardHeader>
              <Heading size="md">📋 Profile Information</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Box>
                  <Text fontWeight="bold">Team Name:</Text>
                  <Code>{profile.teamName || 'Not set'}</Code>
                </Box>
                <Box>
                  <Text fontWeight="bold">Sport:</Text>
                  <Code>{profile.sport || 'Not set'}</Code>
                </Box>
                <Box>
                  <Text fontWeight="bold">Role:</Text>
                  <Code>{profile.role || 'Not set'}</Code>
                </Box>
                <Box>
                  <Text fontWeight="bold">Created:</Text>
                  <Code>{profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Not set'}</Code>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Firebase Configuration */}
        <Card>
          <CardHeader>
            <Heading size="md">⚙️ Firebase Configuration</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Box>
                <Text fontWeight="bold">Project ID:</Text>
                <Code>{auth.app.options.projectId}</Code>
              </Box>
              <Box>
                <Text fontWeight="bold">Auth Domain:</Text>
                <Code>{auth.app.options.authDomain}</Code>
              </Box>
              <Box>
                <Text fontWeight="bold">API Key:</Text>
                <Code>{auth.app.options.apiKey ? `${auth.app.options.apiKey.substring(0, 10)}...` : 'Not set'}</Code>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Error Information */}
        {error && (
          <Card>
            <CardHeader>
              <Heading size="md">❌ Error Information</Heading>
            </CardHeader>
            <CardBody>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Authentication Error</AlertTitle>
                  <AlertDescription>
                    <Code>{error}</Code>
                  </AlertDescription>
                </Box>
              </Alert>
            </CardBody>
          </Card>
        )}

        {/* Debug Actions */}
        <Card>
          <CardHeader>
            <Heading size="md">🐛 Debug Actions</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Open your browser's developer console (F12) to see detailed authentication logs.
              </Text>
              <Text fontSize="sm" color="gray.600">
                Look for messages starting with 🔐, 🔄, 👤, ✅, or ❌ to track the authentication flow.
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Troubleshooting Guide */}
        <Card>
          <CardHeader>
            <Heading size="md">🔧 Troubleshooting Guide</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="start">
              <Box>
                <Text fontWeight="bold" color="red.500">Issue: auth/operation-not-allowed</Text>
                <Text fontSize="sm" color="gray.600">
                  • Google authentication is not enabled in Firebase Console
                  • Go to Authentication → Sign-in method → Enable Google
                </Text>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" color="orange.500">Issue: Redirected back to landing page</Text>
                <Text fontSize="sm" color="gray.600">
                  • Check browser console for authentication errors
                  • Verify Firebase project configuration
                  • Check if user profile creation is failing
                </Text>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" color="blue.500">Issue: Google sign-in popup blocked</Text>
                <Text fontSize="sm" color="gray.600">
                  • Allow popups for localhost:3000
                  • Check ad blockers and browser settings
                  • Try incognito mode
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default AuthDebug;

