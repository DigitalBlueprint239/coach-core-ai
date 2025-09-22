import React from 'react';
import { Box, Center, Text, Button } from '@chakra-ui/react';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <Center minH="400px">
      <Box textAlign="center" p={6}>
        <Text fontSize="xl" color="red.500" mb={4}>
          Something went wrong
        </Text>
        <Text color="gray.600" mb={4}>
          {error.message}
        </Text>
        <Button
          bg="blue.500"
          color="white"
          px={4}
          py={2}
          borderRadius="md"
          onClick={resetError}
          _hover={{ bg: 'blue.600' }}
        >
          Try Again
        </Button>
      </Box>
    </Center>
  );
};

export default ErrorFallback;
