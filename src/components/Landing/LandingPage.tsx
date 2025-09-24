// @ts-nocheck
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
} from '@chakra-ui/react';
import { ArrowRight, Users, Brain, Play, Trophy, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { enhancedWaitlistService } from '../../services/waitlist/enhanced-waitlist-service';
import { validateWaitlistEmail } from '../../utils/validation';
import { errorHandler } from '../../utils/error-handling';

interface WaitlistSignup {
  email: string;
  name: string;
  role: 'head-coach' | 'assistant-coach' | 'parent' | 'player';
  timestamp: Date;
}

const LandingPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'head-coach' | 'assistant-coach' | 'parent' | 'player'>('head-coach');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );
  const toast = useToast();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
    }

    // Check remaining attempts
    if (newEmail) {
      const attempts = waitlistService.getRemainingAttempts(newEmail);
      setRemainingAttempts(attempts);
    }
  };

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setValidationError('');

    // Validate email
    const validation = validateWaitlistEmail(email);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid email address');
      return;
    }

    // Validate name
    if (!name.trim()) {
      setValidationError('Please enter your name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Add to enhanced waitlist with immediate access
      const { accessToken } = await enhancedWaitlistService.addToWaitlistWithAccess({
        email,
        name: name.trim(),
        role,
        immediateAccess: true,
      });

      setIsSubmitted(true);
      toast({
        title: 'Welcome! You have immediate access! 🎉',
        description: "Let's get you started with Coach Core right now",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Redirect to demo mode
      setTimeout(() => {
        window.location.href = `/demo?token=${accessToken}`;
      }, 2000);

    } catch (error: any) {
      // Handle specific error types
      if (error.message?.includes('already on our waitlist')) {
        setValidationError('This email is already registered.');
      } else if (error.message?.includes('Too many attempts')) {
        setValidationError(
          'Too many attempts. Please wait before trying again.'
        );
      } else {
        // Use error handler for other errors
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
      description:
        'Get personalized coaching recommendations and practice plans',
    },
    {
      icon: Play,
      title: 'AI Play Generator',
      description: 'Generate intelligent football plays with AI assistance',
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

  if (isSubmitted) {
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
            >
              ✓
            </Box>
            <Heading size="2xl" color="gray.800">
              You're on the List!
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="2xl">
              Thanks for joining the Coach Core AI waitlist. We'll notify you as
              soon as we launch, and you'll get early access to our AI-powered
              coaching platform.
            </Text>
            <VStack spacing={4}>
              <Text fontSize="lg" color="gray.700" fontWeight="medium">
                What happens next?
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
                <Card>
                  <CardBody textAlign="center">
                    <Text fontWeight="bold" color="green.600">
                      Early Access
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Be first to try the platform
                    </Text>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody textAlign="center">
                    <Text fontWeight="bold" color="blue.600">
                      Launch Notification
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Get notified when we go live
                    </Text>
                  </CardBody>
                </Card>
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
            <Badge colorScheme="blue" px={4} py={2} borderRadius="full">
              🚀 Coming Soon
            </Badge>
            <Heading size="3xl" color="gray.800" maxW="4xl">
              AI-Powered Playbooks for{' '}
              <Text as="span" color="brand.600">
                Coaches
              </Text>
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="3xl">
              Transform your coaching with AI-generated practice plans, smart
              play design, and data-driven insights. Built by coaches, for
              coaches.
            </Text>

            {/* Try AI Play Generator Button */}
            <HStack spacing={4}>
              <Button
                as={Link}
                to="/ai-play-generator"
                size="lg"
                colorScheme="red"
                variant="solid"
                rightIcon={<ArrowRight />}
                px={8}
                py={6}
                fontSize="lg"
                fontWeight="bold"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
                transition="all 0.2s"
              >
                🏈 Try AI Play Generator
              </Button>
              <Text fontSize="sm" color="gray.500" maxW="xs">
                Experience the future of play design with our AI-powered generator
              </Text>
            </HStack>

            {/* Enhanced Signup Form */}
            <Box w="full" maxW="2xl">
              <form onSubmit={handleWaitlistSignup}>
                <VStack spacing={4}>
                  <HStack spacing={4} w="full">
                    <Input
                      id="waitlist-name"
                      name="name"
                      size="lg"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <Input
                      id="waitlist-email"
                      name="email"
                      size="lg"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={handleEmailChange}
                      type="email"
                      required
                      isInvalid={!!validationError}
                      errorBorderColor="red.300"
                    />
                  </HStack>
                  
                  <HStack spacing={4} w="full">
                    <Box flex={1}>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        I am a:
                      </Text>
                      <HStack spacing={2}>
                        {[
                          { value: 'head-coach', label: 'Head Coach' },
                          { value: 'assistant-coach', label: 'Assistant Coach' },
                          { value: 'parent', label: 'Parent' },
                          { value: 'player', label: 'Player' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            size="sm"
                            variant={role === option.value ? 'solid' : 'outline'}
                            colorScheme={role === option.value ? 'blue' : 'gray'}
                            onClick={() => setRole(option.value as any)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </HStack>
                    </Box>
                    <Button
                      size="lg"
                      colorScheme="brand"
                      type="submit"
                      isLoading={isSubmitting}
                      rightIcon={<ArrowRight />}
                      px={8}
                    >
                      Get Started Free
                    </Button>
                  </HStack>

                  {/* Validation Error */}
                  {validationError && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Signup Error</AlertTitle>
                        <AlertDescription>{validationError}</AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {/* Rate Limiting Info */}
                  {remainingAttempts !== null && remainingAttempts < 3 && (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <AlertDescription>
                        {remainingAttempts} attempts remaining. Please wait if
                        you need to try again.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Text fontSize="sm" color="gray.500">
                    Get immediate access to try Coach Core. No credit card required.
                  </Text>
                </VStack>
              </form>
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
                Coach Core AI combines cutting-edge technology with proven
                coaching principles to give you the tools you need to build
                winning teams.
              </Text>
            </VStack>

            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 4 }}
              spacing={8}
              w="full"
            >
              {features.map((feature, index) => (
                <Card key={index} h="full">
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

      {/* CTA Section */}
      <Box py={20} bg="brand.600" color="white">
        <Container maxW="4xl">
          <VStack spacing={8} textAlign="center">
            <Heading size="2xl">Ready to Transform Your Coaching?</Heading>
            <Text fontSize="xl" opacity={0.9}>
              Join the waitlist and be first to experience the future of
              coaching technology.
            </Text>
            <Button
              size="lg"
              colorScheme="white"
              variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              rightIcon={<ArrowRight />}
              px={8}
            >
              Join Waitlist Now
            </Button>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
