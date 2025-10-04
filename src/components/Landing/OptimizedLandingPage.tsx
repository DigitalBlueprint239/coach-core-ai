import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  useToast,
  Container,
  Badge,
  Icon,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Spacer,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
  FormControl,
  FormLabel,
  Progress,
  Divider,
} from '@chakra-ui/react';
import { 
  ArrowRight, 
  Users, 
  Brain, 
  Play, 
  Trophy, 
  BookOpen, 
  Zap,
  CheckCircle,
  Star,
  Shield,
  Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { simpleWaitlistService } from '../../services/waitlist/simple-waitlist-service';
import { validateWaitlistEmail } from '../../utils/validation';
import { errorHandler } from '../../utils/error-handling';

interface WaitlistSignup {
  email: string;
  name: string;
  role: 'head-coach' | 'assistant-coach' | 'parent' | 'player';
  timestamp: Date;
}

const OptimizedLandingPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'head-coach' | 'assistant-coach' | 'parent' | 'player'>('head-coach');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [signupStep, setSignupStep] = useState<'form' | 'processing' | 'success'>('form');
  const navigate = useNavigate();
  const toast = useToast();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    if (validationError) {
      setValidationError('');
    }

    if (newEmail) {
      const attempts = 3; // Simple service doesn't track attempts
      setRemainingAttempts(attempts);
    }
  };

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    setValidationError('');
    setSignupStep('processing');

    // Validate email
    const validation = validateWaitlistEmail(email);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid email address');
      setSignupStep('form');
      return;
    }

    // Validate name
    if (!name.trim()) {
      setValidationError('Please enter your name');
      setSignupStep('form');
      return;
    }

    setIsSubmitting(true);

    try {
      // Add to enhanced waitlist with immediate access
      const { accessToken } = await simpleWaitlistService.addToWaitlist({
        email,
        name: name.trim(),
        role,
        immediateAccess: true,
      });

      setSignupStep('success');
      
      // Show success message with progress
      toast({
        title: 'Welcome! You have immediate access! 🎉',
        description: "Let's get you started with Coach Core right now",
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Redirect to demo mode after a short delay
      setTimeout(() => {
        navigate(`/demo?token=${accessToken}`);
      }, 2000);

    } catch (error: any) {
      setSignupStep('form');
      
      if (error.message?.includes('already on our waitlist')) {
        setValidationError('This email is already registered.');
      } else if (error.message?.includes('Too many attempts')) {
        setValidationError('Too many attempts. Please wait before trying again.');
      } else {
        const appError = errorHandler.handleError(error, 'waitlist-signup');
        setValidationError(errorHandler.getUserFriendlyMessage(appError));
      }

      toast({
        title: 'Signup Failed',
        description: error.message || 'Please try again or contact support',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get personalized coaching recommendations and practice plans',
      highlight: 'Most Popular',
    },
    {
      icon: Play,
      title: 'AI Play Generator',
      description: 'Generate intelligent football plays with AI assistance',
      highlight: 'New',
    },
    {
      icon: BookOpen,
      title: 'Smart Play Designer',
      description: 'Create and save plays with drag-and-drop simplicity',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Track players, attendance, and performance metrics',
    },
    {
      icon: Trophy,
      title: 'Performance Analytics',
      description: 'Data-driven insights to improve your team',
    },
  ];

  const benefits = [
    { icon: Zap, text: 'Start coaching in 30 seconds' },
    { icon: Shield, text: 'No credit card required' },
    { icon: Clock, text: '24-hour free access' },
    { icon: CheckCircle, text: 'All features included' },
  ];

  if (signupStep === 'processing') {
    return (
      <Box minH="100vh" bg="gray.50" py={20}>
        <Container maxW="4xl">
          <VStack spacing={8} textAlign="center">
            <Box
              w={20}
              h={20}
              bg="brand.500"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontSize="4xl"
              animation="pulse 2s infinite"
            >
              <Icon as={Zap} boxSize={8} />
            </Box>
            <Heading size="2xl" color="gray.800">
              Setting up your access...
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="2xl">
              We're preparing your personalized Coach Core experience
            </Text>
            <Box w="full" maxW="md">
              <Progress 
                value={75} 
                colorScheme="brand" 
                size="lg" 
                borderRadius="full"
                isAnimated
              />
              <Text fontSize="sm" color="gray.500" mt={2}>
                Almost ready...
              </Text>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (signupStep === 'success') {
    return (
      <Box minH="100vh" bg="gray.50" py={20}>
        <Container maxW="4xl">
          <VStack spacing={8} textAlign="center">
            <Box
              w={20}
              h={20}
              bg="green.500"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontSize="4xl"
              animation="bounce 1s infinite"
            >
              ✓
            </Box>
            <Heading size="2xl" color="gray.800">
              You're in! 🎉
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="2xl">
              Welcome to Coach Core! You now have immediate access to try all our features.
              Redirecting you to the app...
            </Text>
            <VStack spacing={4}>
              <Text fontSize="lg" color="gray.700" fontWeight="medium">
                What you can do right now:
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                {benefits.map((benefit, index) => (
                  <HStack key={index} spacing={3} p={3} bg="white" borderRadius="lg" shadow="sm">
                    <Icon as={benefit.icon} boxSize={5} color="green.500" />
                    <Text fontSize="sm" color="gray.700">
                      {benefit.text}
                    </Text>
                  </HStack>
                ))}
              </SimpleGrid>
            </VStack>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" shadow="sm" borderBottom="1px" borderColor="gray.200">
        <Container maxW="6xl">
          <Flex py={4} align="center">
            <Heading size="lg" color="brand.600">
              Coach Core AI
            </Heading>
            <Spacer />
            <HStack spacing={4}>
              <Button as={Link} to="/login" variant="ghost" colorScheme="gray">
                Sign In
              </Button>
              <Button as={Link} to="/login" colorScheme="brand">
                Get Started
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box py={20} bg="white">
        <Container maxW="6xl">
          <VStack spacing={8} textAlign="center">
            <Badge colorScheme="green" px={4} py={2} borderRadius="full" fontSize="sm">
              ✨ Try Free Now
            </Badge>
            <Heading size="3xl" color="gray.800" maxW="4xl">
              AI-Powered Coaching Platform{' '}
              <Text as="span" color="brand.600">
                Ready to Use
              </Text>
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="3xl">
              Get immediate access to AI-generated practice plans, smart play design, 
              and data-driven insights. Start coaching better today.
            </Text>

            {/* Quick Benefits */}
            <HStack spacing={6} wrap="wrap" justify="center">
              {benefits.map((benefit, index) => (
                <HStack key={index} spacing={2} color="green.600">
                  <Icon as={benefit.icon} boxSize={4} />
                  <Text fontSize="sm" fontWeight="500">
                    {benefit.text}
                  </Text>
                </HStack>
              ))}
            </HStack>

            {/* Optimized Signup Form */}
            <Box w="full" maxW="2xl" mt={8}>
              <Card shadow="lg" borderRadius="2xl">
                <CardHeader textAlign="center" pb={4}>
                  <Heading size="md" color="gray.800">
                    Get Started in 30 Seconds
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    No credit card required • Immediate access • All features included
                  </Text>
                </CardHeader>
                <CardBody pt={0}>
                  <form onSubmit={handleWaitlistSignup}>
                    <VStack spacing={4}>
                      <HStack spacing={4} w="full">
                        <FormControl flex={1}>
                          <FormLabel fontSize="sm" color="gray.600">Your Name</FormLabel>
                          <Input
                            id="waitlist-name"
                            name="name"
                            size="lg"
                            placeholder="John Smith"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            borderRadius="xl"
                          />
                        </FormControl>
                        <FormControl flex={1}>
                          <FormLabel fontSize="sm" color="gray.600">Email Address</FormLabel>
                          <Input
                            id="waitlist-email"
                            name="email"
                            size="lg"
                            placeholder="john@example.com"
                            value={email}
                            onChange={handleEmailChange}
                            type="email"
                            required
                            isInvalid={!!validationError}
                            errorBorderColor="red.300"
                            borderRadius="xl"
                          />
                        </FormControl>
                      </HStack>
                      
                      <FormControl>
                        <FormLabel fontSize="sm" color="gray.600">I am a:</FormLabel>
                        <Select
                          value={role}
                          onChange={(e) => setRole(e.target.value as any)}
                          size="lg"
                          borderRadius="xl"
                        >
                          <option value="head-coach">Head Coach</option>
                          <option value="assistant-coach">Assistant Coach</option>
                          <option value="parent">Parent</option>
                          <option value="player">Player</option>
                        </Select>
                      </FormControl>

                      <Button
                        size="lg"
                        colorScheme="brand"
                        type="submit"
                        isLoading={isSubmitting}
                        rightIcon={<ArrowRight />}
                        w="full"
                        h={14}
                        fontSize="lg"
                        fontWeight="bold"
                        borderRadius="xl"
                        _hover={{
                          transform: 'translateY(-2px)',
                          boxShadow: 'xl',
                        }}
                        transition="all 0.2s"
                      >
                        {isSubmitting ? 'Setting up access...' : 'Get Started Free'}
                      </Button>

                      {/* Validation Error */}
                      {validationError && (
                        <Alert status="error" borderRadius="xl">
                          <AlertIcon />
                          <Box>
                            <AlertTitle>Signup Error</AlertTitle>
                            <AlertDescription>{validationError}</AlertDescription>
                          </Box>
                        </Alert>
                      )}

                      {/* Rate Limiting Info */}
                      {remainingAttempts !== null && remainingAttempts < 3 && (
                        <Alert status="warning" borderRadius="xl">
                          <AlertIcon />
                          <AlertDescription>
                            {remainingAttempts} attempts remaining. Please wait if you need to try again.
                          </AlertDescription>
                        </Alert>
                      )}

                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                      </Text>
                    </VStack>
                  </form>
                </CardBody>
              </Card>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={20} bg="gray.50">
        <Container maxW="6xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="2xl" color="gray.800">
                Everything You Need to Excel
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="2xl">
                Coach Core AI combines cutting-edge technology with proven coaching 
                principles to give you the tools you need to build winning teams.
              </Text>
            </VStack>

            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={8}
              w="full"
            >
              {features.map((feature, index) => (
                <Card key={index} h="full" position="relative" overflow="hidden">
                  {feature.highlight && (
                    <Badge
                      position="absolute"
                      top={4}
                      right={4}
                      colorScheme={feature.highlight === 'Most Popular' ? 'red' : 'blue'}
                      borderRadius="full"
                      fontSize="xs"
                    >
                      {feature.highlight}
                    </Badge>
                  )}
                  <CardHeader textAlign="center" pb={2}>
                    <Box
                      w={12}
                      h={12}
                      bg="brand.100"
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mx="auto"
                      mb={4}
                    >
                      <Icon as={feature.icon} boxSize={6} color="brand.600" />
                    </Box>
                    <Heading size="md" color="gray.800">
                      {feature.title}
                    </Heading>
                  </CardHeader>
                  <CardBody textAlign="center" pt={0}>
                    <Text color="gray.600" fontSize="sm">
                      {feature.description}
                    </Text>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Social Proof Section */}
      <Box py={16} bg="white">
        <Container maxW="4xl">
          <VStack spacing={8} textAlign="center">
            <Heading size="xl" color="gray.800">
              Trusted by Coaches Everywhere
            </Heading>
            <HStack spacing={8} wrap="wrap" justify="center">
              <VStack spacing={2}>
                <Text fontSize="3xl" fontWeight="bold" color="brand.500">500+</Text>
                <Text fontSize="sm" color="gray.600">Coaches</Text>
              </VStack>
              <Divider orientation="vertical" height="50px" />
              <VStack spacing={2}>
                <Text fontSize="3xl" fontWeight="bold" color="brand.500">10K+</Text>
                <Text fontSize="sm" color="gray.600">Plays Generated</Text>
              </VStack>
              <Divider orientation="vertical" height="50px" />
              <VStack spacing={2}>
                <Text fontSize="3xl" fontWeight="bold" color="brand.500">98%</Text>
                <Text fontSize="sm" color="gray.600">Satisfaction Rate</Text>
              </VStack>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={20} bg="brand.600" color="white">
        <Container maxW="4xl">
          <VStack spacing={8} textAlign="center">
            <Heading size="2xl">Ready to Transform Your Coaching?</Heading>
            <Text fontSize="xl" opacity={0.9}>
              Join thousands of coaches who are already using AI to build better teams.
            </Text>
            <Button
              size="lg"
              colorScheme="white"
              variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              rightIcon={<ArrowRight />}
              px={8}
              h={14}
              fontSize="lg"
              fontWeight="bold"
            >
              Get Started Free Now
            </Button>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default OptimizedLandingPage;

