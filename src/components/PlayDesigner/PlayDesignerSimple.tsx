import React from 'react';
import { Box, VStack, Text, Heading, Button } from '@chakra-ui/react';

export const PlayDesignerSimple: React.FC = () => {
  return (
    <Box
      bg="white"
      minH="100vh"
      p={8}
      className="animate-fade-in-responsive"
    >
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="lg" color="gray.800" mb={4}>
            🏈 Play Designer - Simple Test
          </Heading>
          <Text color="gray.600" fontSize="lg">
            This is a simplified version to test if the component loads
          </Text>
        </Box>

        {/* Test Content */}
        <Box
          bg="blue.50"
          p={6}
          borderRadius="lg"
          border="2px solid"
          borderColor="blue.200"
        >
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="bold" color="blue.800">
              ✅ Component Loaded Successfully!
            </Text>
            <Text color="blue.700">
              If you can see this, the basic Play Designer component is working.
            </Text>
            <Button colorScheme="blue" size="lg">
              Test Button
            </Button>
          </VStack>
        </Box>

        {/* Canvas Placeholder */}
        <Box
          bg="green.50"
          p={6}
          borderRadius="lg"
          border="2px solid"
          borderColor="green.200"
          minH="400px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing={4}>
            <Text fontSize="2xl" fontWeight="bold" color="green.800">
              🎨 Canvas Area
            </Text>
            <Text color="green.700" textAlign="center">
              This is where the Konva.js canvas will be rendered.
              <br />
              If you see this, the component structure is working.
            </Text>
          </VStack>
        </Box>

        {/* Debug Info */}
        <Box
          bg="gray.50"
          p={4}
          borderRadius="md"
          fontSize="sm"
          color="gray.600"
        >
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>• Component: PlayDesignerSimple</Text>
          <Text>• Status: Loaded</Text>
          <Text>• Time: {new Date().toLocaleTimeString()}</Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default PlayDesignerSimple;

