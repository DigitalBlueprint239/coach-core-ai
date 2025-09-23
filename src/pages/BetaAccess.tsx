import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Badge,
  useToast,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Fade,
  ScaleFade,
  Divider,
  Progress,
  List,
  ListItem,
  ListIcon,
  Link,
  Container,
} from '@chakra-ui/react';
import {
  Brain,
  Play,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Trophy,
  Award,
  Crown,
  Shield,
  Target,
  Zap,
  ArrowRight,
  ExternalLink,
  Download,
  Share,
  Settings,
  BookOpen,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Image,
  Video,
  BookOpen as BookOpenIcon,
  BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Settings as SettingsIcon,
  Zap as ZapIcon,
  Shield as ShieldIcon,
  Target as TargetIcon,
  Clock as ClockIcon,
  Star as StarIcon,
  Trophy as TrophyIcon,
  Award as AwardIcon,
  Crown as CrownIcon,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase/firebase-config';
import { trackUserAction, trackError } from '../services/monitoring';
import { trackWaitlistConversion } from '../services/analytics';

interface BetaAccessData {
  email: string;
  name: string;
  role: string;
  teamLevel: string;
  source: string;
  onboardingStatus: 'invited' | 'onboarded' | 'pending';
  createdAt: Date;
  invitedAt?: Date;
  onboardedAt?: Date;
  inviteToken?: string;
}

const BETA_FEATURES = [
  {
    icon: Brain,
    title: 'AI Play Suggestions',
    description: 'Get intelligent play recommendations based on game situations and opponent analysis',
    color: 'purple',
    status: 'active',
  },
  {
    icon: Play,
    title: 'Smart Playbook Designer',
    description: 'Design, save, and export professional playbooks with our visual editor',
    color: 'blue',
    status: 'active',
  },
  {
    icon: Calendar,
    title: 'Practice Planner',
    description: 'AI-assisted practice planning with drill assignments and time management',
    color: 'green',
    status: 'active',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Comprehensive roster management and performance tracking',
    color: 'orange',
    status: 'active',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track team performance and coaching insights',
    color: 'teal',
    status: 'coming-soon',
  },
  {
    icon: Video,
    title: 'Video Analysis',
    description: 'Upload and analyze game footage with AI',
    color: 'pink',
    status: 'coming-soon',
  },
];

const BetaAccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [betaData, setBetaData] = useState<BetaAccessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No beta access token provided');
      setIsLoading(false);
      return;
    }

    validateBetaToken(token);
  }, [token]);

  const validateBetaToken = async (token: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Query waitlist for the token
      const q = query(
        collection(db, 'waitlist'),
        where('inviteToken', '==', token)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Invalid or expired beta access token');
        setIsValidToken(false);
        return;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data() as BetaAccessData;
      
      setBetaData({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        invitedAt: data.invitedAt?.toDate(),
        onboardedAt: data.onboardedAt?.toDate(),
      });
      
      setIsValidToken(true);

      // Track beta access
      trackUserAction('beta_access', {
        email: data.email,
        role: data.role,
        teamLevel: data.teamLevel,
        source: data.source,
      });

      // Track conversion
      trackWaitlistConversion({
        email: data.email,
        source: data.source,
        converted: true,
      });

    } catch (error) {
      console.error('Error validating beta token:', error);
      setError('Failed to validate beta access token');
      trackError('beta_token_validation_error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    if (!betaData || !token) return;

    try {
      setIsOnboarding(true);

      // Update onboarding status in Firestore
      const waitlistQuery = query(
        collection(db, 'waitlist'),
        where('inviteToken', '==', token)
      );
      
      const querySnapshot = await getDocs(waitlistQuery);
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          onboardingStatus: 'onboarded',
          onboardedAt: serverTimestamp(),
        });
      }

      // Track onboarding start
      trackUserAction('beta_onboarding_start', {
        email: betaData.email,
        role: betaData.role,
        teamLevel: betaData.teamLevel,
      });

      toast({
        title: 'Welcome to Beta! 🎉',
        description: 'Let\'s get you set up with Coach Core AI',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate to dashboard or onboarding flow
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to start onboarding. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsOnboarding(false);
    }
  };

  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      'head-coach': 'Head Coach',
      'assistant-coach': 'Assistant Coach',
      'coordinator': 'Coordinator',
      'position-coach': 'Position Coach',
      'volunteer': 'Volunteer Coach',
      'athletic-director': 'Athletic Director',
      'other': 'Other',
    };
    return roleMap[role] || role;
  };

  const getTeamLevelLabel = (level: string): string => {
    const levelMap: Record<string, string> = {
      'youth': 'Youth (Ages 8-13)',
      'high-school': 'High School',
      'college': 'College',
      'semi-pro': 'Semi-Pro',
      'professional': 'Professional',
      'other': 'Other',
    };
    return levelMap[level] || level;
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.600">Validating your beta access...</Text>
        </VStack>
      </Box>
    );
  }

  if (error || !isValidToken) {
    return (
      <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')} display="flex" alignItems="center" justifyContent="center">
        <Container maxW="md">
          <Card bg={bgColor} border="1px" borderColor={borderColor}>
            <CardBody textAlign="center" py={8}>
              <Icon as={AlertCircle} boxSize={16} color="red.500" mb={4} />
              <Heading size="lg" color="red.700" mb={2}>
                Invalid Beta Access
              </Heading>
              <Text color="gray.600" mb={6}>
                {error || 'This beta access link is invalid or has expired.'}
              </Text>
              <Button
                colorScheme="blue"
                onClick={() => navigate('/waitlist')}
                leftIcon={<ArrowRight />}
              >
                Join Waitlist
              </Button>
            </CardBody>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      {/* Header */}
      <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} py={8}>
        <Container maxW="6xl">
          <VStack spacing={6} textAlign="center">
            <HStack>
              <Heading size="2xl" color="gray.800">
                Welcome to Coach Core AI Beta!
              </Heading>
              <Badge colorScheme="purple" variant="subtle" fontSize="lg" px={3} py={1}>
                BETA
              </Badge>
            </HStack>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              Hi {betaData?.name}, you now have exclusive access to our AI-powered coaching platform. 
              Let's get you started!
            </Text>
          </VStack>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxW="6xl" py={12}>
        <VStack spacing={8} align="stretch">
          {/* User Info */}
          <Card bg={bgColor} border="1px" borderColor={borderColor}>
            <CardHeader>
              <Heading size="md">Your Beta Access</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color="gray.600">Name</Text>
                  <Text fontWeight="semibold">{betaData?.name}</Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color="gray.600">Email</Text>
                  <Text fontWeight="semibold">{betaData?.email}</Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color="gray.600">Role</Text>
                  <Text fontWeight="semibold">{getRoleLabel(betaData?.role || '')}</Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color="gray.600">Team Level</Text>
                  <Text fontWeight="semibold">{getTeamLevelLabel(betaData?.teamLevel || '')}</Text>
                </VStack>
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Beta Features */}
          <Card bg={bgColor} border="1px" borderColor={borderColor}>
            <CardHeader>
              <Heading size="md">What You'll Get Access To</Heading>
              <Text color="gray.600">
                Explore these powerful features designed specifically for coaches like you
              </Text>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {BETA_FEATURES.map((feature, index) => (
                  <ScaleFade key={index} in={true} delay={index * 0.1}>
                    <Card
                      bg={cardBg}
                      border="1px"
                      borderColor={borderColor}
                      _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                      transition="all 0.2s"
                    >
                      <CardBody>
                        <VStack spacing={3} align="start">
                          <HStack spacing={3}>
                            <Icon as={feature.icon} boxSize={6} color={`${feature.color}.500`} />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="semibold" fontSize="sm">
                                {feature.title}
                              </Text>
                              <Badge
                                colorScheme={feature.status === 'active' ? 'green' : 'yellow'}
                                size="sm"
                                variant="subtle"
                              >
                                {feature.status === 'active' ? 'Available' : 'Coming Soon'}
                              </Badge>
                            </VStack>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {feature.description}
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </ScaleFade>
                ))}
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Getting Started */}
          <Card bg={bgColor} border="1px" borderColor={borderColor}>
            <CardHeader>
              <Heading size="md">Getting Started</Heading>
              <Text color="gray.600">
                Follow these steps to make the most of your beta experience
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack spacing={4}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">1</Badge>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold">Complete Your Profile</Text>
                    <Text fontSize="sm" color="gray.600">
                      Set up your coaching profile and team information
                    </Text>
                  </VStack>
                </HStack>
                <HStack spacing={4}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">2</Badge>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold">Explore AI Features</Text>
                    <Text fontSize="sm" color="gray.600">
                      Try the AI play suggestions and practice planner
                    </Text>
                  </VStack>
                </HStack>
                <HStack spacing={4}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">3</Badge>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold">Provide Feedback</Text>
                    <Text fontSize="sm" color="gray.600">
                      Help us improve by sharing your experience
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Action Buttons */}
          <Card bg={bgColor} border="1px" borderColor={borderColor}>
            <CardBody textAlign="center" py={8}>
              <VStack spacing={6}>
                <Heading size="lg">Ready to Get Started?</Heading>
                <Text color="gray.600" maxW="md">
                  Click below to access your beta dashboard and start exploring Coach Core AI
                </Text>
                <HStack spacing={4}>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={handleStartOnboarding}
                    isLoading={isOnboarding}
                    loadingText="Starting..."
                    leftIcon={<ArrowRight />}
                  >
                    Access Beta Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/waitlist')}
                  >
                    Learn More
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default BetaAccess;





