import React from 'react';
import { Box, Container, VStack, Heading, Text, Stack } from '@chakra-ui/react';
import SimpleWaitlistForm from '../components/Waitlist/SimpleWaitlistForm';

const WaitlistLandingPage: React.FC = () => {
  return (
    <Box minH="100vh" bg="gray.50" py={20}>
      <Container maxW="6xl">
        <VStack spacing={12}>
          <VStack spacing={6} textAlign="center" maxW="3xl">
            <Heading
              as="h1"
              size="2xl"
              bgGradient="linear(to-r, blue.500, purple.600)"
              bgClip="text"
              fontWeight="extrabold"
            >
              Transform Your Coaching with AI
            </Heading>
            <Text fontSize="xl" color="gray.600">
              Coach Core AI helps you create better practice plans, design winning plays, 
              and manage your team - all powered by artificial intelligence.
            </Text>
          </VStack>

          <SimpleWaitlistForm />

          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={8}
            pt={8}
            maxW="5xl"
          >
            <Box flex={1} textAlign="center" p={6}>
              <Text fontSize="3xl" mb={2}>⚡</Text>
              <Heading size="md" mb={2}>Save Time</Heading>
              <Text color="gray.600">
                Generate practice plans in minutes, not hours
              </Text>
            </Box>
            <Box flex={1} textAlign="center" p={6}>
              <Text fontSize="3xl" mb={2}>🎯</Text>
              <Heading size="md" mb={2}>Better Strategy</Heading>
              <Text color="gray.600">
                AI-powered play design and game planning
              </Text>
            </Box>
            <Box flex={1} textAlign="center" p={6}>
              <Text fontSize="3xl" mb={2}>📊</Text>
              <Heading size="md" mb={2}>Track Progress</Heading>
              <Text color="gray.600">
                Monitor player development and team performance
              </Text>
            </Box>
          </Stack>
        </VStack>
      </Container>
    </Box>
  );
};

export default WaitlistLandingPage;
