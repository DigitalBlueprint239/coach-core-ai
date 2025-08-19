import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Card,
  CardBody,
} from '@chakra-ui/react';

const SimpleTest: React.FC = () => {
  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      <VStack spacing={8} align="center" justify="center" minH="100vh">
        <Heading size="2xl" color="blue.600">
          Coach Core AI
        </Heading>
        
        <Text fontSize="lg" color="gray.600" textAlign="center">
          Welcome to the ultimate sports coaching platform
        </Text>
        
        <Card maxW="md" w="full">
          <CardBody>
            <VStack spacing={4}>
              <Text fontSize="lg" fontWeight="semibold">
                Quick Actions
              </Text>
              
              <HStack spacing={4} wrap="wrap" justify="center">
                <Button colorScheme="blue" size="lg">
                  Create Practice Plan
                </Button>
                <Button colorScheme="green" size="lg">
                  Design Play
                </Button>
                <Button colorScheme="purple" size="lg">
                  View Analytics
                </Button>
              </HStack>
              
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Your modern coaching dashboard is ready!
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default SimpleTest;
