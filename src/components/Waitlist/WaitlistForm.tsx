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
  FormErrorMessage,
  Spinner,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/firebase-config';

interface WaitlistFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const WaitlistForm: React.FC<WaitlistFormProps> = ({ onSuccess, onError }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Add to Firestore waitlist collection
      await addDoc(collection(db, 'waitlist'), {
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        source: 'website',
        status: 'pending',
      });

      setIsSubmitted(true);
      setEmail('');
      
      toast({
        title: 'Success!',
        description: 'You\'ve been added to the waitlist. We\'ll notify you when we launch!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      const errorMessage = 'Failed to join waitlist. Please try again.';
      setError(errorMessage);
      
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

  if (isSubmitted) {
    return (
      <Card maxW="md" mx="auto" bg="green.50" borderColor="green.200">
        <CardBody textAlign="center" py={8}>
          <Icon as={CheckCircle} boxSize={12} color="green.500" mb={4} />
          <Heading size="lg" color="green.700" mb={2}>
            You're on the list!
          </Heading>
          <Text color="green.600">
            We'll notify you as soon as Coach Core AI is ready for you.
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card maxW="md" mx="auto" shadow="lg">
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
            <FormControl isInvalid={!!error}>
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
                _placeholder={{
                  color: 'gray.400',
                }}
              />
              <FormErrorMessage>{error}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              width="full"
              borderRadius="xl"
              isLoading={isLoading}
              loadingText="Joining..."
              leftIcon={<Icon as={Mail} />}
              _hover={{
                transform: 'translateY(-1px)',
                boxShadow: 'lg',
              }}
              _active={{
                transform: 'translateY(0)',
              }}
            >
              Join Waitlist
            </Button>

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

export default WaitlistForm;
