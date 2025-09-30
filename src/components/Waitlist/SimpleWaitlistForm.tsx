/* eslint-env browser */
/* global window, navigator, setTimeout */
import React, { useEffect, useState } from 'react';
import {
  Box,
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
  HStack,
  Link,
  Progress,
  Spinner,
  ScaleFade,
  Divider,
  Badge,
} from '@chakra-ui/react';
import { Mail, CheckCircle, Share2, Copy, ArrowRight, Sparkles } from 'lucide-react';
import { simpleWaitlistService } from '../../services/waitlist/simple-waitlist-service';
import { functions } from '../../services/firebase/firebase-config';
import { httpsCallable } from 'firebase/functions';
import { useSearchParams } from 'react-router-dom';

const SimpleWaitlistForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const toast = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferredBy(refParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const loadWaitlistStats = async () => {
      try {
        const callable = httpsCallable(functions, 'getWaitlistStats');
        const result = await callable();
        if (!isMounted) return;
        const data = result.data as { totalCount?: number };
        setWaitlistCount(data?.totalCount ?? 0);
      } catch (statsError) {
        console.error('Error fetching waitlist stats:', statsError);
        if (isMounted) {
          setWaitlistCount(null);
        }
      }
    };

    loadWaitlistStats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (waitlistCount === null) return;

    const interval = setInterval(() => {
      setWaitlistCount(prev => {
        if (prev === null) return prev;
        return prev + Math.floor(Math.random() * 2);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [waitlistCount]);

  const generateReferralCode = (value: string) => {
    const base = value.split('@')[0] ?? 'coach';
    return `${base.replace(/[^a-z0-9]/gi, '').toLowerCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setSubmissionStep('processing');
    setProgress(0);
    setError('');

    // Simulate progress steps
    const progressSteps = [
      { step: 'Validating email...', progress: 25 },
      { step: 'Securing your spot...', progress: 50 },
      { step: 'Generating referral code...', progress: 75 },
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

      const referral = generateReferralCode(email.trim().toLowerCase());

      await simpleWaitlistService.addToWaitlist(email, 'website', {
        referralCode: referral,
        referredBy: referredBy || null,
      });
      
      setSubmissionStep('success');
      setIsSubmitted(true);
      setEmail('');
      setReferralCode(referral);
      
      toast({
        title: 'Success!',
        description: "You're on the list! We'll notify you when we launch.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setSubmissionStep('error');
      setError(error.message || 'Something went wrong. Please try again.');
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRetry = () => {
    setSubmissionStep('form');
    setError('');
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
    
    const origin = window.location.origin;
    const shareLink = referralCode
      ? `${origin}/waitlist?ref=${encodeURIComponent(referralCode)}`
      : `${origin}/waitlist`;

      try {
        await navigator.clipboard.writeText(shareLink);
        toast({
          title: 'Referral link copied! 🎉',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (clipboardError) {
        toast({
          title: 'Copy failed',
          description: 'You can manually highlight and copy the link.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
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
              {error || 'We encountered an error processing your request.'}
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://coach-core-ai.web.app';
    const shareLink = referralCode
      ? `${origin}/waitlist?ref=${encodeURIComponent(referralCode)}`
      : `${origin}/waitlist`;

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
                {referralCode && (
                  <Badge colorScheme="blue" px={4} py={2} fontSize="sm" borderRadius="full">
                    <Icon as={Sparkles} mr={1} />
                    Referral Code: {referralCode}
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
          {waitlistCount !== null && (
            <Text fontSize="lg" color="blue.600" fontWeight="semibold">
              Join {waitlistCount}+ coaches already on the waitlist
            </Text>
          )}
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
            <FormControl isInvalid={!!error}>
              <FormLabel htmlFor="email" fontSize="sm" fontWeight="medium">
                Email Address
              </FormLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@example.com"
                size="lg"
                borderRadius="xl"
              />
              <FormErrorMessage>{error}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              width="full"
              borderRadius="xl"
              isLoading={submissionStep !== 'form'}
              loadingText="Securing your spot..."
              leftIcon={<Icon as={Mail} />}
              isDisabled={submissionStep !== 'form'}
            >
              Join Waitlist
            </Button>

            <Text fontSize="xs" color="gray.500" textAlign="center">
              We'll notify you when Coach Core AI launches.
            </Text>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
};

export default SimpleWaitlistForm;
