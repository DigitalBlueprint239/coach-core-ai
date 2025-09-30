/* eslint-env browser */
/* global window, navigator, setTimeout */
import React, { useState } from 'react';
import {
  VStack,
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
  FormErrorMessage,
  Icon,
  Select,
  Checkbox,
  Alert,
  AlertIcon,
  Badge,
  Progress,
  HStack,
  Box,
  Spinner,
  ScaleFade,
  Divider,
} from '@chakra-ui/react';
import { Mail, CheckCircle, Users, Share2, Copy, ArrowRight, Sparkles } from 'lucide-react';
import { enhancedWaitlistService } from '../../services/waitlist/enhanced-waitlist-service';

interface EnhancedWaitlistFormProps {
  onSuccess?: (data: { waitlistId: string; accessToken?: string }) => void;
  onError?: (error: string) => void;
  showRoleSelection?: boolean;
  showNameField?: boolean;
  enableDemoAccess?: boolean;
  variant?: 'simple' | 'enhanced' | 'full';
}

const EnhancedWaitlistForm: React.FC<EnhancedWaitlistFormProps> = ({ 
  onSuccess, 
  onError, 
  showRoleSelection = true,
  showNameField = true,
  enableDemoAccess = true,
  variant = 'enhanced',
}) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'head-coach' as 'head-coach' | 'assistant-coach' | 'parent' | 'player',
    immediateAccess: false,
  });
  const [submissionStep, setSubmissionStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [progress, setProgress] = useState(0);
  const [submissionData, setSubmissionData] = useState<{ waitlistId: string; accessToken?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (showNameField && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmissionStep('processing');
    setProgress(0);
    setErrors({});

    // Simulate progress steps
    const progressSteps = [
      { step: 'Validating information...', progress: 20 },
      { step: 'Securing your spot...', progress: 50 },
      { step: 'Setting up your account...', progress: 80 },
      { step: 'Finalizing...', progress: 100 },
    ];

    try {
      // Animate progress
      for (const { progress: progressValue } of progressSteps) {
        setProgress(progressValue);
        await new Promise(resolve => {
          if (typeof window !== 'undefined') {
            setTimeout(resolve, 300);
          } else {
            resolve(undefined);
          }
        });
      }

      let result;

      if (variant === 'enhanced' && enableDemoAccess) {
        // Use enhanced service with demo access
        result = await enhancedWaitlistService.addToWaitlistWithAccess({
          email: formData.email.trim(),
          name: formData.name.trim(),
          role: formData.role,
          immediateAccess: formData.immediateAccess,
        });
      } else {
        // Use simple waitlist service
        const { simpleWaitlistService } = await import('../../services/waitlist/simple-waitlist-service');
        const waitlistId = await simpleWaitlistService.addToWaitlist(
          formData.email.trim(),
          'enhanced-form',
          {
            name: formData.name.trim(),
            role: formData.role,
            immediateAccess: formData.immediateAccess,
          }
        );
        result = { waitlistId, accessToken: undefined };
      }

      setSubmissionData(result);
      setSubmissionStep('success');
      
      // Reset form for potential new submissions
      setFormData({
        email: '',
        name: '',
        role: 'head-coach',
        immediateAccess: false,
      });
      
      const successMessage = result.accessToken 
        ? "You're on the list with demo access! Check your email for next steps."
        : "You're on the list! We'll notify you when we launch.";
      
      toast({
        title: 'Success!',
        description: successMessage,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onSuccess?.(result);
    } catch (error: unknown) {
      const errorMessage = (error as Error).message || 'Something went wrong. Please try again.';
      setSubmissionStep('error');
      setErrors({ submit: errorMessage });
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      onError?.(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRetry = () => {
    setSubmissionStep('form');
    setErrors({});
    setProgress(0);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    const shareText = "I just joined the Coach Core AI waitlist! 🏈 Ready to revolutionize my coaching with AI-powered tools.";
    const shareUrl = `${window.location.origin}/waitlist`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Coach Core AI Waitlist',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // Share cancelled or failed
      }
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast({
          title: 'Link copied!',
          description: 'Share link copied to clipboard',
          status: 'success',
          duration: 3000,
        });
      } catch (error) {
        // Clipboard not available
      }
    }
  };

  const copyReferralLink = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    const referralCode = submissionData?.waitlistId ? `ref-${submissionData.waitlistId.slice(-6)}` : 'coach-core';
    const shareUrl = `${window.location.origin}/waitlist?ref=${referralCode}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Referral link copied!',
        description: 'Share this link to move up the waitlist',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      // Clipboard not available
    }
  };

  // Processing state
  if (submissionStep === 'processing') {
    return (
      <Card maxW="md" mx="auto" shadow="xl">
        <CardBody textAlign="center" py={12}>
          <VStack spacing={6}>
            <Box position="relative">
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <Icon 
                as={Sparkles} 
                position="absolute" 
                top="50%" 
                left="50%" 
                transform="translate(-50%, -50%)"
                boxSize={6} 
                color="blue.400" 
              />
            </Box>
            <VStack spacing={2}>
              <Heading size="md" color="gray.700">
                Securing your spot...
              </Heading>
              <Text color="gray.500" fontSize="sm">
                This will just take a moment
              </Text>
            </VStack>
            <Box w="full" maxW="300px">
              <Progress 
                value={progress} 
                colorScheme="blue" 
                size="sm" 
                borderRadius="full"
                bg="gray.100"
              />
            </Box>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  // Error state
  if (submissionStep === 'error') {
    return (
      <Card maxW="md" mx="auto" bg="red.50" borderColor="red.200">
          <CardBody textAlign="center" py={8}>
          <VStack spacing={4}>
            <Icon as={CheckCircle} boxSize={12} color="red.500" />
            <Heading size="lg" color="red.700" mb={2}>
              Oops! Something went wrong
            </Heading>
            <Text color="red.600" mb={4}>
              {errors.submit || 'We encountered an error processing your request.'}
            </Text>
            <HStack spacing={3}>
              <Button 
                colorScheme="red" 
                variant="outline" 
                onClick={handleRetry}
                leftIcon={<Icon as={ArrowRight} />}
              >
                Try Again
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  // Success state
  if (submissionStep === 'success') {
    return (
      <ScaleFade in={true} initialScale={0.9}>
        <Card maxW="md" mx="auto" bg="green.50" borderColor="green.200" shadow="xl">
          <CardBody textAlign="center" py={8}>
            <VStack spacing={6}>
              <Box position="relative">
                <Icon as={CheckCircle} boxSize={16} color="green.500" />
                <Icon 
                  as={Sparkles} 
                  position="absolute" 
                  top="-2" 
                  right="-2" 
                  boxSize={6} 
                  color="yellow.400" 
                  animation="pulse 2s infinite"
                />
              </Box>
              
              <VStack spacing={3}>
                <Heading size="xl" color="green.700" fontWeight="bold">
                  Welcome to the future! 🎉
                </Heading>
                <Text color="green.600" fontSize="lg" fontWeight="medium">
                  You&apos;re officially on the Coach Core AI waitlist
                </Text>
                {submissionData?.accessToken && (
                  <Badge colorScheme="blue" px={4} py={2} fontSize="sm" borderRadius="full">
                    <Icon as={Sparkles} mr={1} />
                    Demo Access Granted
                  </Badge>
                )}
              </VStack>

              <Divider />

              <VStack spacing={4} w="full">
                <Heading size="sm" color="gray.700">
                  What happens next?
                </Heading>
                <VStack spacing={2} w="full" textAlign="left">
                  <HStack spacing={3} w="full">
                    <Box w={6} h={6} bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                      <Text fontSize="xs" fontWeight="bold" color="blue.600">1</Text>
                    </Box>
                    <Text fontSize="sm" color="gray.600">
                      Check your email for confirmation and next steps
                    </Text>
                  </HStack>
                  <HStack spacing={3} w="full">
                    <Box w={6} h={6} bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                      <Text fontSize="xs" fontWeight="bold" color="blue.600">2</Text>
                    </Box>
                    <Text fontSize="sm" color="gray.600">
                      Get early access when we launch (coming soon!)
                  </Text>
                  </HStack>
                  <HStack spacing={3} w="full">
                    <Box w={6} h={6} bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                      <Text fontSize="xs" fontWeight="bold" color="blue.600">3</Text>
                </Box>
                    <Text fontSize="sm" color="gray.600">
                      Share with fellow coaches to move up the list
                    </Text>
                  </HStack>
                </VStack>
              </VStack>

              <Divider />

              <VStack spacing={3} w="full">
                <Heading size="sm" color="gray.700">
                  Help us spread the word
                </Heading>
                <HStack spacing={3} w="full">
                  <Button 
                    colorScheme="blue" 
                    variant="outline" 
                    size="sm" 
                    leftIcon={<Icon as={Share2} />}
                    onClick={handleShare}
                    flex={1}
                  >
                    Share
                  </Button>
                <Button
                  colorScheme="green"
                    variant="outline" 
                  size="sm"
                    leftIcon={<Icon as={Copy} />}
                    onClick={copyReferralLink}
                    flex={1}
                >
                    Copy Link
                </Button>
                </HStack>
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  Every referral moves you closer to early access
                </Text>
              </VStack>

              <Button 
                colorScheme="green" 
                size="lg" 
                onClick={handleRetry}
                leftIcon={<Icon as={ArrowRight} />}
                w="full"
              >
                Add Another Email
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </ScaleFade>
    );
  }

  return (
    <Card maxW="md" mx="auto" shadow="xl">
      <CardHeader textAlign="center" pb={4}>
        <VStack spacing={3}>
          <Icon as={Mail} boxSize={8} color="blue.500" />
          <Heading size="lg" color="gray.800">
            Join the Waitlist
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Be the first to experience the future of coaching with AI
          </Text>
        </VStack>
      </CardHeader>
      
      <CardBody pt={0}>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            {errors.submit && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {errors.submit}
              </Alert>
            )}

            <FormControl isInvalid={!!errors.email}>
                    <FormLabel htmlFor="email" fontSize="sm" fontWeight="medium">
                      Email Address
                    </FormLabel>
                    <Input
                      id="email"
                      type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="coach@example.com"
                      size="lg"
                      borderRadius="xl"
                    />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
                  </FormControl>

            {showNameField && (
              <FormControl isInvalid={!!errors.name}>
                    <FormLabel htmlFor="name" fontSize="sm" fontWeight="medium">
                      Full Name
                    </FormLabel>
                    <Input
                      id="name"
                      type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your full name"
                      size="lg"
                      borderRadius="xl"
                    />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
                  </FormControl>
            )}

            {showRoleSelection && (
              <FormControl>
                <FormLabel htmlFor="role" fontSize="sm" fontWeight="medium">
                  Your Role
                    </FormLabel>
                    <Select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                      size="lg"
                      borderRadius="xl"
                    >
                  <option value="head-coach">Head Coach</option>
                  <option value="assistant-coach">Assistant Coach</option>
                  <option value="parent">Parent</option>
                  <option value="player">Player</option>
                    </Select>
                  </FormControl>
            )}

            {enableDemoAccess && (
              <FormControl>
                    <Checkbox
                  isChecked={formData.immediateAccess}
                  onChange={(e) => handleInputChange('immediateAccess', e.target.checked)}
                      colorScheme="blue"
                    >
                  <Text fontSize="sm">
                    I&apos;d like immediate demo access (24-hour trial)
                      </Text>
                    </Checkbox>
                  </FormControl>
            )}

                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
              width="full"
              borderRadius="xl"
              isLoading={submissionStep !== 'form'}
              loadingText="Securing your spot..."
              leftIcon={<Icon as={formData.immediateAccess ? Users : Mail} />}
              isDisabled={submissionStep !== 'form'}
            >
              {formData.immediateAccess ? 'Get Demo Access' : 'Join Waitlist'}
                    </Button>

            <Text fontSize="xs" color="gray.500" textAlign="center">
              {enableDemoAccess 
                ? "Demo access includes full features for 24 hours. We&apos;ll notify you about the full launch."
                : "We&apos;ll notify you when Coach Core AI launches."
              }
            </Text>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
};

export default EnhancedWaitlistForm;
