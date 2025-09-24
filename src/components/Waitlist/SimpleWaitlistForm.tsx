import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { Mail, CheckCircle } from 'lucide-react';
import { simpleWaitlistService } from '../../services/waitlist/simple-waitlist-service';

const SimpleWaitlistForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await simpleWaitlistService.addToWaitlist(email);
      setIsSubmitted(true);
      setEmail('');
      
      toast({
        title: 'Success!',
        description: "You're on the list! We'll notify you when we launch.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setError(error.message || 'Something went wrong. Please try again.');
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
            We'll notify you as soon as Coach Core AI is ready.
          </Text>
        </CardBody>
      </Card>
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
              isLoading={isLoading}
              loadingText="Joining..."
              leftIcon={<Icon as={Mail} />}
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
