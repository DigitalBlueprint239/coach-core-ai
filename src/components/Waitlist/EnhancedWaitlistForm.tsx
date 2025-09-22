import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  useToast,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  SimpleGrid,
  FormErrorMessage,
  FormHelperText,
  Select,
  Spinner,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Divider,
  Fade,
  ScaleFade,
  useColorModeValue,
  Tooltip,
  Progress,
  Checkbox,
  CheckboxGroup,
  Stack,
} from '@chakra-ui/react';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Users, 
  GraduationCap,
  Crown,
  Shield,
  Target,
  Clock,
  Sparkles,
  ArrowRight,
  Heart,
  Info,
  Star,
  Trophy,
  Award,
  Brain,
  Play,
  BookOpen,
  Calendar,
  Settings,
  Zap,
  Shield as ShieldIcon,
  Target as TargetIcon,
  Clock as ClockIcon,
  Star as StarIcon,
  Trophy as TrophyIcon,
  Award as AwardIcon,
  Brain as BrainIcon,
  Play as PlayIcon,
  BookOpen as BookOpenIcon,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  Zap as ZapIcon,
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase/firebase-config';
import { trackUserAction, trackError } from '../../services/monitoring';
import { trackWaitlistSignup, trackWaitlistSignupSuccess, trackWaitlistSignupError } from '../../services/analytics';

// Types
interface WaitlistEntry {
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
  ipAddress?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

interface EnhancedWaitlistFormProps {
  onSuccess?: (entry: WaitlistEntry) => void;
  onError?: (error: string) => void;
  variant?: 'beta' | 'general';
  showFeatures?: boolean;
  autoInvite?: boolean;
}

const ROLE_OPTIONS = [
  { value: 'head-coach', label: 'Head Coach', icon: Crown, description: 'Lead team strategy and coaching' },
  { value: 'assistant-coach', label: 'Assistant Coach', icon: Users, description: 'Support head coach and player development' },
  { value: 'coordinator', label: 'Coordinator', icon: Target, description: 'Specialized coaching (offense, defense, special teams)' },
  { value: 'position-coach', label: 'Position Coach', icon: Shield, description: 'Focus on specific player positions' },
  { value: 'volunteer', label: 'Volunteer Coach', icon: Heart, description: 'Community and youth coaching' },
  { value: 'athletic-director', label: 'Athletic Director', icon: Settings, description: 'Program management and oversight' },
  { value: 'other', label: 'Other', icon: User, description: 'Other coaching role' },
];

const TEAM_LEVEL_OPTIONS = [
  { value: 'youth', label: 'Youth (Ages 8-13)', icon: Star, description: 'Elementary and middle school' },
  { value: 'high-school', label: 'High School', icon: GraduationCap, description: 'Grades 9-12' },
  { value: 'college', label: 'College', icon: Trophy, description: 'NCAA and collegiate programs' },
  { value: 'semi-pro', label: 'Semi-Pro', icon: Award, description: 'Semi-professional leagues' },
  { value: 'professional', label: 'Professional', icon: Crown, description: 'Professional leagues' },
  { value: 'other', label: 'Other', icon: Target, description: 'Other level' },
];

const BETA_FEATURES = [
  {
    icon: Brain,
    title: 'AI Play Suggestions',
    description: 'Get intelligent play recommendations based on game situations',
    color: 'purple',
  },
  {
    icon: Play,
    title: 'Smart Playbook',
    description: 'Design, save, and export professional playbooks',
    color: 'blue',
  },
  {
    icon: Calendar,
    title: 'Practice Planner',
    description: 'AI-assisted practice planning with drill assignments',
    color: 'green',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Comprehensive roster and performance tracking',
    color: 'orange',
  },
];

const EnhancedWaitlistForm: React.FC<EnhancedWaitlistFormProps> = ({ 
  onSuccess, 
  onError, 
  variant = 'beta',
  showFeatures = true,
  autoInvite = true,
}) => {
  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [teamLevel, setTeamLevel] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [inviteLink, setInviteLink] = useState('');

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!validateEmail(email)) return 'Please enter a valid email address';
    if (!name.trim()) return 'Name is required';
    if (!role) return 'Please select your coaching role';
    if (!teamLevel) return 'Please select your team level';
    if (!agreedToTerms) return 'Please agree to the terms and conditions';
    return null;
  };

  const checkDuplicateEmail = async (email: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'waitlist'),
        where('email', '==', email.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn('Could not check for duplicate email:', error);
      return false; // Allow signup to proceed
    }
  };

  const generateInviteToken = (): string => {
    return `beta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Track signup attempt
      trackWaitlistSignup({
        email: email.trim(),
        role,
        teamLevel,
        source: variant === 'beta' ? 'beta-launch' : 'website',
      });

      // Check for duplicate email
      const isDuplicate = await checkDuplicateEmail(email);
      if (isDuplicate) {
        setError('This email is already registered for beta access');
        trackWaitlistSignupError('duplicate_email');
        return;
      }

      // Generate invite token if auto-invite is enabled
      const inviteToken = autoInvite ? generateInviteToken() : undefined;
      const inviteLink = autoInvite ? `${window.location.origin}/beta?token=${inviteToken}` : undefined;

      // Create waitlist entry
      const waitlistEntry: WaitlistEntry = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        teamLevel,
        source: variant === 'beta' ? 'beta-launch' : 'website',
        onboardingStatus: autoInvite ? 'invited' : 'pending',
        createdAt: new Date(),
        invitedAt: autoInvite ? new Date() : undefined,
        inviteToken,
        ipAddress: '', // Will be filled by backend
        userAgent: navigator.userAgent,
        utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
      };

      // Add to Firestore
      await addDoc(collection(db, 'waitlist'), {
        ...waitlistEntry,
        createdAt: serverTimestamp(),
        invitedAt: autoInvite ? serverTimestamp() : null,
      });

      // Track success
      trackWaitlistSignupSuccess({
        email: waitlistEntry.email,
        role: waitlistEntry.role,
        teamLevel: waitlistEntry.teamLevel,
        source: waitlistEntry.source,
        hasInvite: !!inviteLink,
      });

      // Track user action
      trackUserAction('waitlist_signup', {
        role,
        teamLevel,
        source: waitlistEntry.source,
        variant,
      });

      setIsSubmitted(true);
      setInviteLink(inviteLink || '');
      
      toast({
        title: variant === 'beta' ? 'Welcome to Beta! 🎉' : 'Success!',
        description: variant === 'beta' 
          ? 'You\'ve been added to the beta waitlist. Check your email for access!'
          : 'You\'ve been added to the waitlist. We\'ll notify you when we launch!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onSuccess?.(waitlistEntry);
    } catch (error: any) {
      console.error('Error adding to waitlist:', error);
      const errorMessage = 'Failed to join waitlist. Please try again.';
      setError(errorMessage);
      
      trackWaitlistSignupError(error.message || 'unknown_error');
      trackError('waitlist_signup_error', error);
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isSubmitted) {
    return (
      <ScaleFade in={isSubmitted} initialScale={0.9}>
        <Card maxW="lg" mx="auto" bg="green.50" borderColor="green.200">
          <CardBody textAlign="center" py={8}>
            <Icon as={CheckCircle} boxSize={16} color="green.500" mb={4} />
            <Heading size="lg" color="green.700" mb={2}>
              {variant === 'beta' ? 'Welcome to Beta!' : 'You\'re on the list!'}
            </Heading>
            <Text color="green.600" mb={4}>
              {variant === 'beta' 
                ? 'You\'ve been added to the beta waitlist. Check your email for access instructions!'
                : 'We\'ll notify you as soon as Coach Core AI is ready for you.'
              }
            </Text>
            
            {inviteLink && (
              <VStack spacing={4} mt={6}>
                <Text fontSize="sm" color="green.700" fontWeight="semibold">
                  Your Beta Access Link:
                </Text>
                <Box
                  p={3}
                  bg="white"
                  borderRadius="md"
                  border="1px"
                  borderColor="green.200"
                  w="full"
                >
                  <Text fontSize="sm" color="gray.600" wordBreak="break-all">
                    {inviteLink}
                  </Text>
                </Box>
                <Button
                  colorScheme="green"
                  size="sm"
                  onClick={() => window.open(inviteLink, '_blank')}
                  rightIcon={<ArrowRight />}
                >
                  Access Beta Now
                </Button>
              </VStack>
            )}

            {showFeatures && variant === 'beta' && (
              <VStack spacing={4} mt={6}>
                <Text fontSize="sm" color="green.700" fontWeight="semibold">
                  What you'll get access to:
                </Text>
                <SimpleGrid columns={2} spacing={2} w="full">
                  {BETA_FEATURES.map((feature, index) => (
                    <HStack key={index} spacing={2} p={2} bg="white" borderRadius="md">
                      <Icon as={feature.icon} boxSize={4} color={`${feature.color}.500`} />
                      <Text fontSize="xs" color="gray.600">
                        {feature.title}
                      </Text>
                    </HStack>
                  ))}
                </SimpleGrid>
              </VStack>
            )}
          </CardBody>
        </Card>
      </ScaleFade>
    );
  }

  return (
    <Card maxW="lg" mx="auto" shadow="lg" bg={bgColor}>
      <CardHeader textAlign="center" pb={4}>
        <VStack spacing={3}>
          <Icon as={Mail} boxSize={8} color="blue.500" />
          <Heading size="lg" color="gray.800">
            {variant === 'beta' ? 'Join Beta Access' : 'Join the Waitlist'}
          </Heading>
          <Text color="gray.600" fontSize="sm">
            {variant === 'beta' 
              ? 'Get early access to Coach Core AI and help shape the future of coaching'
              : 'Be the first to experience the future of coaching with AI'
            }
          </Text>
        </VStack>
      </CardHeader>
      
      <CardBody pt={0}>
        {/* Progress indicator */}
        <Progress value={(currentStep / 3) * 100} size="sm" colorScheme="blue" mb={6} />
        
        <form onSubmit={handleSubmit}>
          <VStack spacing={6}>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <Fade in={currentStep === 1}>
                <VStack spacing={4} w="full">
                  <FormControl isRequired isInvalid={!!error && !email}>
                    <FormLabel htmlFor="email" fontSize="sm" fontWeight="medium">
                      Email Address
                    </FormLabel>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      size="lg"
                      borderRadius="xl"
                      borderColor="gray.300"
                      _focus={{
                        borderColor: 'blue.500',
                        boxShadow: '0 0 0 1px #3182ce',
                      }}
                    />
                  </FormControl>

                  <FormControl isRequired isInvalid={!!error && !name}>
                    <FormLabel htmlFor="name" fontSize="sm" fontWeight="medium">
                      Full Name
                    </FormLabel>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      size="lg"
                      borderRadius="xl"
                      borderColor="gray.300"
                      _focus={{
                        borderColor: 'blue.500',
                        boxShadow: '0 0 0 1px #3182ce',
                      }}
                    />
                  </FormControl>

                  <Button
                    type="button"
                    colorScheme="blue"
                    size="lg"
                    width="full"
                    onClick={nextStep}
                    rightIcon={<ArrowRight />}
                  >
                    Continue
                  </Button>
                </VStack>
              </Fade>
            )}

            {/* Step 2: Role & Team Level */}
            {currentStep === 2 && (
              <Fade in={currentStep === 2}>
                <VStack spacing={4} w="full">
                  <FormControl isRequired isInvalid={!!error && !role}>
                    <FormLabel fontSize="sm" fontWeight="medium">
                      Coaching Role
                    </FormLabel>
                    <Select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Select your coaching role"
                      size="lg"
                      borderRadius="xl"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {role && (
                      <FormHelperText>
                        {ROLE_OPTIONS.find(r => r.value === role)?.description}
                      </FormHelperText>
                    )}
                  </FormControl>

                  <FormControl isRequired isInvalid={!!error && !teamLevel}>
                    <FormLabel fontSize="sm" fontWeight="medium">
                      Team Level
                    </FormLabel>
                    <Select
                      value={teamLevel}
                      onChange={(e) => setTeamLevel(e.target.value)}
                      placeholder="Select your team level"
                      size="lg"
                      borderRadius="xl"
                    >
                      {TEAM_LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {teamLevel && (
                      <FormHelperText>
                        {TEAM_LEVEL_OPTIONS.find(t => t.value === teamLevel)?.description}
                      </FormHelperText>
                    )}
                  </FormControl>

                  <HStack spacing={4} w="full">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      flex={1}
                      onClick={prevStep}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      colorScheme="blue"
                      size="lg"
                      flex={1}
                      onClick={nextStep}
                      rightIcon={<ArrowRight />}
                    >
                      Continue
                    </Button>
                  </HStack>
                </VStack>
              </Fade>
            )}

            {/* Step 3: Confirmation & Submit */}
            {currentStep === 3 && (
              <Fade in={currentStep === 3}>
                <VStack spacing={4} w="full">
                  {/* Review Info */}
                  <Box p={4} bg={cardBg} borderRadius="md" w="full">
                    <Text fontSize="sm" fontWeight="semibold" mb={3} color="gray.700">
                      Review Your Information:
                    </Text>
                    <VStack spacing={2} align="start">
                      <HStack>
                        <Text fontSize="sm" color="gray.600">Name:</Text>
                        <Text fontSize="sm" fontWeight="medium">{name}</Text>
                      </HStack>
                      <HStack>
                        <Text fontSize="sm" color="gray.600">Email:</Text>
                        <Text fontSize="sm" fontWeight="medium">{email}</Text>
                      </HStack>
                      <HStack>
                        <Text fontSize="sm" color="gray.600">Role:</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {ROLE_OPTIONS.find(r => r.value === role)?.label}
                        </Text>
                      </HStack>
                      <HStack>
                        <Text fontSize="sm" color="gray.600">Team Level:</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {TEAM_LEVEL_OPTIONS.find(t => t.value === teamLevel)?.label}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>

                  {/* Terms Agreement */}
                  <FormControl isRequired isInvalid={!!error && !agreedToTerms}>
                    <Checkbox
                      isChecked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      colorScheme="blue"
                    >
                      <Text fontSize="sm" color="gray.600">
                        I agree to receive updates about Coach Core AI and understand that this is a beta program.
                      </Text>
                    </Checkbox>
                  </FormControl>

                  {error && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <HStack spacing={4} w="full">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      flex={1}
                      onClick={prevStep}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
                      flex={1}
                      isLoading={isLoading}
                      loadingText="Joining..."
                      leftIcon={<Icon as={Mail} />}
                    >
                      {variant === 'beta' ? 'Join Beta' : 'Join Waitlist'}
                    </Button>
                  </HStack>
                </VStack>
              </Fade>
            )}

            <Text fontSize="xs" color="gray.500" textAlign="center">
              By joining, you agree to receive updates about Coach Core AI.
              <br />
              We respect your privacy and won't spam you.
            </Text>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
};

export default EnhancedWaitlistForm;


