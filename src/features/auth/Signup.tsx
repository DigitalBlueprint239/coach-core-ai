import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Select,
  useToast,
  Container,
  Card,
  CardBody,
  CardHeader,
  Progress,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { Play, Users, Brain, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/firebase/auth-service';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  teamName: string;
  sport: string;
  ageGroup: string;
}

const Signup: React.FC = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    teamName: '',
    sport: 'football',
    ageGroup: 'high-school',
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const steps = [
    { number: 1, title: 'Account Details', icon: Users },
    { number: 2, title: 'Team Information', icon: Trophy },
    { number: 3, title: 'Get Started', icon: Play },
  ];

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.password || !formData.confirmPassword || !formData.displayName) {
          setError('Please fill in all fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return false;
        }
        break;
      case 2:
        if (!formData.teamName) {
          setError('Please enter your team name');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      const { user, profile } = await authService.signUp(
        formData.email,
        formData.password,
        formData.displayName,
        formData.teamName,
        formData.sport,
        formData.ageGroup
      );

      toast({
        title: 'Welcome to Coach Core AI! 🎉',
        description: `Account created successfully for ${formData.teamName}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Navigate to onboarding/demo
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!error && !formData.email}>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="coach@team.com"
                size="lg"
              />
            </FormControl>

            <FormControl isRequired isInvalid={!!error && !formData.displayName}>
              <FormLabel>Full Name</FormLabel>
              <Input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="John Smith"
                size="lg"
              />
            </FormControl>

            <FormControl isRequired isInvalid={!!error && !formData.password}>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a strong password"
                size="lg"
              />
            </FormControl>

            <FormControl isRequired isInvalid={!!error && !formData.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                size="lg"
              />
            </FormControl>
          </VStack>
        );

      case 2:
        return (
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!error && !formData.teamName}>
              <FormLabel>Team Name</FormLabel>
              <Input
                type="text"
                value={formData.teamName}
                onChange={(e) => handleInputChange('teamName', e.target.value)}
                placeholder="Eagles"
                size="lg"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Sport</FormLabel>
              <Select
                value={formData.sport}
                onChange={(e) => handleInputChange('sport', e.target.value)}
                size="lg"
              >
                <option value="football">🏈 Football</option>
                <option value="basketball">🏀 Basketball</option>
                <option value="soccer">⚽ Soccer</option>
                <option value="baseball">⚾ Baseball</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Age Group</FormLabel>
              <Select
                value={formData.ageGroup}
                onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                size="lg"
              >
                <option value="youth">Youth (8-12)</option>
                <option value="middle-school">Middle School (13-14)</option>
                <option value="high-school">High School (15-18)</option>
                <option value="college">College (19-22)</option>
                <option value="adult">Adult (23+)</option>
              </Select>
            </FormControl>
          </VStack>
        );

      case 3:
        return (
          <VStack spacing={6} align="center" textAlign="center">
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
              🎯
            </Box>
            
            <VStack spacing={4}>
              <Heading size="lg" color="gray.800">
                Ready to Transform Your Coaching?
              </Heading>
              <Text fontSize="lg" color="gray.600">
                You're all set! Let's get you started with Coach Core AI's powerful features.
              </Text>
            </VStack>

            <VStack spacing={3} align="stretch" w="full">
              <HStack spacing={3} p={3} bg="blue.50" borderRadius="md">
                <Icon as={Brain} color="blue.500" />
                <Text fontSize="sm" color="blue.700">
                  AI-powered insights and recommendations
                </Text>
              </HStack>
              <HStack spacing={3} p={3} bg="green.50" borderRadius="md">
                <Icon as={Play} color="green.500" />
                <Text fontSize="sm" color="green.700">
                  Generate intelligent plays and practice plans
                </Text>
              </HStack>
              <HStack spacing={3} p={3} bg="purple.50" borderRadius="md">
                <Icon as={Users} color="purple.500" />
                <Text fontSize="sm" color="purple.700">
                  Manage your team and track progress
                </Text>
              </HStack>
            </VStack>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="md">
        <VStack spacing={8}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading size="2xl" color="brand.600">
              Join Coach Core AI
            </Heading>
            <Text fontSize="lg" color="gray.600">
              Transform your coaching with AI-powered insights
            </Text>
          </VStack>

          {/* Progress Steps */}
          <Card w="full" bg={cardBg}>
            <CardHeader pb={4}>
              <VStack spacing={4}>
                <HStack spacing={4} w="full">
                  {steps.map((step, index) => (
                    <HStack
                      key={step.number}
                      spacing={2}
                      flex={1}
                      justify="center"
                      opacity={currentStep >= step.number ? 1 : 0.5}
                    >
                      <Box
                        w={8}
                        h={8}
                        borderRadius="full"
                        bg={currentStep >= step.number ? 'brand.500' : 'gray.300'}
                        color="white"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="sm"
                        fontWeight="bold"
                      >
                        {currentStep > step.number ? '✓' : step.number}
                      </Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {step.title}
                      </Text>
                    </HStack>
                  ))}
                </HStack>
                <Progress
                  value={(currentStep / steps.length) * 100}
                  w="full"
                  colorScheme="brand"
                  size="sm"
                />
              </VStack>
            </CardHeader>

            <CardBody>
              <form onSubmit={handleSubmit}>
                <VStack spacing={6}>
                  {renderStepContent()}

                  {error && (
                    <Box
                      p={3}
                      bg="red.50"
                      color="red.700"
                      borderRadius="md"
                      w="full"
                      textAlign="center"
                    >
                      {error}
                    </Box>
                  )}

                  {/* Navigation Buttons */}
                  <HStack spacing={4} w="full" justify="space-between">
                    {currentStep > 1 && (
                      <Button
                        onClick={prevStep}
                        variant="outline"
                        size="lg"
                        w="full"
                      >
                        Back
                      </Button>
                    )}

                    {currentStep < 3 ? (
                      <Button
                        onClick={nextStep}
                        colorScheme="brand"
                        size="lg"
                        w="full"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="lg"
                        w="full"
                        isLoading={loading}
                        loadingText="Creating Account..."
                      >
                        Create Account & Get Started
                      </Button>
                    )}
                  </HStack>
                </VStack>
              </form>
            </CardBody>
          </Card>

          {/* Sign In Link */}
          <Text fontSize="sm" color="gray.600">
            Already have an account?{' '}
            <Button
              variant="link"
              color="brand.500"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </Text>
        </VStack>
      </Container>
    </Box>
  );
};

export default Signup;
