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
  Progress,
  Divider,
  Icon,
  Card,
  CardBody,
  SimpleGrid,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { 
  Crown, 
  X, 
  Zap, 
  CheckCircle, 
  Clock, 
  Users, 
  Play, 
  BookOpen,
  BarChart3,
  ArrowRight,
  Star,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { demoService } from '../../services/demo/demo-service';
import { enhancedWaitlistService } from '../../services/waitlist/enhanced-waitlist-service';
import ModernDashboard from '../Dashboard/ModernDashboard';
import ModernPracticePlanner from '../PracticePlanner/ModernPracticePlanner';
import AIPlayGenerator from '../AI/AIPlayGenerator';
import TeamManagement from '../Team/TeamManagement';
import GameCalendar from '../GameManagement/GameCalendar';

const EnhancedDemoMode: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [password, setPassword] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string>('');
  const [demoProgress, setDemoProgress] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    initializeDemo();
  }, []);

  const initializeDemo = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || localStorage.getItem('demo_access_token');
      
      if (token) {
        const userData = enhancedWaitlistService.getCurrentDemoData();
        if (userData) {
          const demoSession = await demoService.createDemoSession(token, userData);
          setSession(demoSession);
          setDemoProgress(calculateProgress(demoSession));
        }
      }
    } catch (error) {
      console.error('Error initializing demo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (session: any) => {
    let progress = 0;
    if (session?.data) {
      if (session.data.plays?.length > 0) progress += 25;
      if (session.data.practices?.length > 0) progress += 25;
      if (session.data.team) progress += 25;
      if (session.data.games?.length > 0) progress += 25;
    }
    return progress;
  };

  const handleFeatureAction = (feature: string) => {
    setCurrentFeature(feature);
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
      const { user, profile } = await enhancedWaitlistService.upgradeToFullAccount(
        session.accessToken,
        password
      );

      toast({
        title: 'Account Created! 🎉',
        description: 'Your demo data has been saved to your new account',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

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

  const quickActions = [
    {
      icon: Play,
      title: 'Create AI Play',
      description: 'Generate a new play with AI',
      color: 'blue',
      action: () => handleFeatureAction('play'),
    },
    {
      icon: BookOpen,
      title: 'Plan Practice',
      description: 'Design your practice session',
      color: 'green',
      action: () => handleFeatureAction('practice'),
    },
    {
      icon: Users,
      title: 'Add Team',
      description: 'Set up your team roster',
      color: 'purple',
      action: () => handleFeatureAction('team'),
    },
    {
      icon: BarChart3,
      title: 'View Analytics',
      description: 'See performance insights',
      color: 'orange',
      action: () => handleFeatureAction('analytics'),
    },
  ];

  if (isLoading) {
    return (
      <Box p={6} textAlign="center">
        <VStack spacing={4}>
          <Icon as={Zap} boxSize={12} color="brand.500" animation="pulse 2s infinite" />
          <Text fontSize="lg" fontWeight="medium">Loading your demo experience...</Text>
          <Progress value={75} colorScheme="brand" size="lg" w="300px" isAnimated />
        </VStack>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box p={6} textAlign="center">
        <VStack spacing={4}>
          <Text fontSize="lg">Demo session not found. Please sign up again.</Text>
          <Button onClick={() => navigate('/')} colorScheme="brand">
            Go to Signup
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      {/* Enhanced Demo Banner */}
      <Alert status="info" variant="subtle" borderRadius="lg" mb={6}>
        <AlertIcon />
        <HStack spacing={3} flex={1}>
          <VStack align="start" spacing={1} flex={1}>
            <HStack spacing={2}>
              <Text fontSize="sm" fontWeight="bold">
                Demo Mode
              </Text>
              <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                {session.data.preferences.role.replace('-', ' ')}
              </Badge>
            </HStack>
            <Text fontSize="xs" color="gray.600">
              You're exploring Coach Core with temporary access. All features are available!
            </Text>
          </VStack>
          <HStack spacing={2}>
            <Text fontSize="xs" color="gray.500">
              Progress: {demoProgress}%
            </Text>
            <Progress value={demoProgress} size="sm" w="100px" colorScheme="blue" />
          </HStack>
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            leftIcon={<Crown size={14} />}
            onClick={handleFeatureAction('upgrade')}
          >
            Save & Create Account
          </Button>
        </HStack>
      </Alert>

      {/* Quick Actions */}
      <Box mb={8}>
        <Text fontSize="lg" fontWeight="semibold" mb={4} color="gray.700">
          What would you like to try first?
        </Text>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          {quickActions.map((action, index) => (
            <Card
              key={index}
              cursor="pointer"
              onClick={action.action}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
              }}
              transition="all 0.2s"
            >
              <CardBody textAlign="center" p={4}>
                <Box
                  w={12}
                  h={12}
                  bg={`${action.color}.100`}
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  mx="auto"
                  mb={3}
                >
                  <Icon as={action.icon} boxSize={6} color={`${action.color}.600`} />
                </Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  {action.title}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {action.description}
                </Text>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Main App Content with Enhanced UX */}
      <Box>
        <ModernDashboard />
        
        <Box p={6} bg="gray.50">
          <VStack spacing={6}>
            <HStack w="full" justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                Practice Planning
              </Text>
              <Button
                size="sm"
                colorScheme="green"
                variant="outline"
                onClick={() => handleFeatureAction('practice')}
                rightIcon={<ArrowRight size={14} />}
              >
                Try Practice Planner
              </Button>
            </HStack>
            <ModernPracticePlanner />
          </VStack>
        </Box>

        <Box p={6}>
          <VStack spacing={6}>
            <HStack w="full" justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                AI Play Generator
              </Text>
              <Button
                size="sm"
                colorScheme="blue"
                variant="outline"
                onClick={() => handleFeatureAction('play')}
                rightIcon={<ArrowRight size={14} />}
              >
                Generate Play
              </Button>
            </HStack>
            <AIPlayGenerator />
          </VStack>
        </Box>

        <Box p={6} bg="gray.50">
          <VStack spacing={6}>
            <HStack w="full" justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                Team Management
              </Text>
              <Button
                size="sm"
                colorScheme="purple"
                variant="outline"
                onClick={() => handleFeatureAction('team')}
                rightIcon={<ArrowRight size={14} />}
              >
                Manage Team
              </Button>
            </HStack>
            <TeamManagement />
          </VStack>
        </Box>

        <Box p={6}>
          <VStack spacing={6}>
            <HStack w="full" justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                Game Calendar
              </Text>
              <Button
                size="sm"
                colorScheme="orange"
                variant="outline"
                onClick={() => handleFeatureAction('games')}
                rightIcon={<ArrowRight size={14} />}
              >
                Schedule Games
              </Button>
            </HStack>
            <GameCalendar teamId="demo-team" />
          </VStack>
        </Box>
      </Box>

      {/* Enhanced Upgrade Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
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
            <VStack spacing={6}>
              <Text fontSize="sm" color="gray.600">
                Save your demo work and create a permanent account to continue using Coach Core.
              </Text>
              
              {/* Demo Data Summary */}
              <Card bg="blue.50" border="1px solid" borderColor="blue.200">
                <CardBody>
                  <VStack spacing={3} align="start">
                    <Text fontSize="sm" fontWeight="medium" color="blue.800">
                      Your demo progress:
                    </Text>
                    <VStack spacing={2} align="start" w="full">
                      <HStack justify="space-between" w="full">
                        <Text fontSize="xs" color="blue.700">Plays created</Text>
                        <Badge colorScheme="blue" variant="subtle">
                          {session.data.plays?.length || 0}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text fontSize="xs" color="blue.700">Practice plans</Text>
                        <Badge colorScheme="blue" variant="subtle">
                          {session.data.practices?.length || 0}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text fontSize="xs" color="blue.700">Team setup</Text>
                        <Badge colorScheme={session.data.team ? 'green' : 'gray'} variant="subtle">
                          {session.data.team ? 'Complete' : 'Not started'}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <Text fontSize="xs" color="blue.700">Games scheduled</Text>
                        <Badge colorScheme="blue" variant="subtle">
                          {session.data.games?.length || 0}
                        </Badge>
                      </HStack>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* Benefits */}
              <VStack spacing={3} align="start" w="full">
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  With a full account, you'll get:
                </Text>
                <VStack spacing={2} align="start" w="full">
                  <HStack spacing={2}>
                    <CheckCircle size={16} color="green" />
                    <Text fontSize="xs" color="gray.600">Unlimited access to all features</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <CheckCircle size={16} color="green" />
                    <Text fontSize="xs" color="gray.600">Save and sync across devices</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <CheckCircle size={16} color="green" />
                    <Text fontSize="xs" color="gray.600">Team collaboration features</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <CheckCircle size={16} color="green" />
                    <Text fontSize="xs" color="gray.600">Advanced analytics and reports</Text>
                  </HStack>
                </VStack>
              </VStack>

              <FormControl>
                <FormLabel fontSize="sm">Create Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  size="lg"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleSkipUpgrade}>
                Continue Demo
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleUpgrade}
                isLoading={isUpgrading}
                loadingText="Creating Account..."
                leftIcon={<Zap size={16} />}
                size="lg"
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

export default EnhancedDemoMode;

