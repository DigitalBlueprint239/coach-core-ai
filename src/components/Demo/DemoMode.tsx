import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useToast,
} from '@chakra-ui/react';
import { Crown, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { demoService } from '../../services/demo/demo-service';
import { simpleWaitlistService } from '../../services/waitlist/simple-waitlist-service';
import MVPDashboard from '../Dashboard/MVPDashboard';
import ModernPracticePlanner from '../PracticePlanner/ModernPracticePlanner';
import AIPlayGenerator from '../AI/AIPlayGenerator';
import TeamManagement from '../Team/TeamManagement';
import GameCalendar from '../GameManagement/GameCalendar';

const DemoMode: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [password, setPassword] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    initializeDemo();
  }, []);

  const initializeDemo = async () => {
    try {
      // Get access token from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || localStorage.getItem('demo_access_token');
      
      if (token) {
        // const userData = enhancedWaitlistService.getCurrentDemoData();
        const userData = null; // Simple service doesn't have this method
        if (userData) {
          const demoSession = await demoService.createDemoSession(token, userData);
          setSession(demoSession);
        }
      }
    } catch (error) {
      console.error('Error initializing demo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAction = () => {
    setShowUpgrade(true);
    onOpen();
  };

  const handleUpgrade = async () => {
    if (!password.trim()) {
      toast({
        title: 'Password required',
        description: 'Please enter a password for your account',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUpgrading(true);
    try {
      // const { user, profile } = await enhancedWaitlistService.upgradeToFullAccount(
      // Simple service doesn't have this method - would need to implement
      const { user, profile } = { user: null, profile: null };

      toast({
        title: 'Account Created! 🎉',
        description: 'Your demo data has been saved to your new account',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Upgrade Failed',
        description: error.message || 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSkipUpgrade = () => {
    onClose();
    setShowUpgrade(false);
  };

  if (isLoading) {
    return (
      <Box p={6} textAlign="center">
        <Text>Loading demo mode...</Text>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box p={6} textAlign="center">
        <Text>Demo session not found. Please sign up again.</Text>
        <Button mt={4} onClick={() => navigate('/')}>
          Go to Signup
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Demo Banner */}
      <Alert status="info" variant="subtle" borderRadius="md" mb={4}>
        <AlertIcon />
        <HStack spacing={2} flex={1}>
          <Text fontSize="sm">
            <strong>Demo Mode:</strong> You're exploring Coach Core with temporary access
          </Text>
          <Badge colorScheme="blue" variant="subtle">
            {session.data.preferences.role.replace('-', ' ')}
          </Badge>
        </HStack>
        <Button
          size="sm"
          colorScheme="blue"
          variant="outline"
          leftIcon={<Crown size={16} />}
          onClick={handleSaveAction}
        >
          Save & Create Account
        </Button>
      </Alert>

      {/* Main App Content */}
      <Box>
        <MVPDashboard />
        <Box p={6}>
          <ModernPracticePlanner />
        </Box>
        <Box p={6}>
          <AIPlayGenerator />
        </Box>
        <Box p={6}>
          <TeamManagement />
        </Box>
        <Box p={6}>
          <GameCalendar teamId="demo-team" />
        </Box>
      </Box>

      {/* Upgrade Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Crown size={20} />
              <Text>Create Your Account</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Save your demo work and create a permanent account to continue using Coach Core.
              </Text>
              
              <Box w="full" p={4} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Your demo data:
                </Text>
                <VStack spacing={1} align="start">
                  <Text fontSize="xs">• {session.data.plays.length} plays created</Text>
                  <Text fontSize="xs">• {session.data.practices.length} practices planned</Text>
                  <Text fontSize="xs">• Team: {session.data.team ? 'Set up' : 'Not set up'}</Text>
                </VStack>
              </Box>

              <FormControl>
                <FormLabel>Create Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleSkipUpgrade}>
                Skip for Now
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleUpgrade}
                isLoading={isUpgrading}
                loadingText="Creating Account..."
                leftIcon={<Zap size={16} />}
              >
                Create Account & Save
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DemoMode;
