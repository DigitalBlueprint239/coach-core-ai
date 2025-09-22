import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  useToast,
  Card,
  CardBody,
  Heading,
  Badge,
  Divider,
} from '@chakra-ui/react';
import TestUtils, { TestResult } from '../../utils/test-utils';

const AuthTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<string>('');
  const toast = useToast();

  const runAllTests = async () => {
    setIsLoading(true);
    try {
      const results = await TestUtils.runAllTests();
      setTestResults(results);

      const testSummary = TestUtils.getTestSummary(results);
      setSummary(testSummary.summary);

      if (testSummary.failed === 0) {
        toast({
          title: 'All Tests Passed! 🎉',
          description: 'All services are working correctly',
          status: 'success',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Some Tests Failed',
          description: `${testSummary.failed} out of ${testSummary.total} tests failed`,
          status: 'warning',
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Test Execution Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runIndividualTest = async (testFunction: () => Promise<TestResult>) => {
    setIsLoading(true);
    try {
      const result = await testFunction();
      setTestResults(prev => [...prev, result]);

      if (result.status === 'success') {
        toast({
          title: `${result.service} Test Passed`,
          description: result.message,
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: `${result.service} Test Failed`,
          description: result.message,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setSummary('');
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'green' : 'red';
  };

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="gray.800">
          🔧 Service Testing Panel
        </Heading>

        <Text color="gray.600">
          Use this panel to test the core Firebase services and ensure
          everything is working correctly.
        </Text>

        {/* Test Controls */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md" color="gray.800">
                Test Controls
              </Heading>

              <HStack spacing={4} wrap="wrap">
                <Button
                  colorScheme="blue"
                  onClick={() => runAllTests()}
                  isLoading={isLoading}
                  size="lg"
                >
                  🚀 Run All Tests
                </Button>

                <Button
                  colorScheme="green"
                  onClick={() =>
                    runIndividualTest(TestUtils.testFirebaseConnection)
                  }
                  isLoading={isLoading}
                >
                  🔥 Test Firebase Connection
                </Button>

                <Button
                  colorScheme="purple"
                  onClick={() =>
                    runIndividualTest(TestUtils.testWaitlistService)
                  }
                  isLoading={isLoading}
                >
                  📧 Test Waitlist Service
                </Button>

                <Button
                  colorScheme="orange"
                  onClick={() => runIndividualTest(TestUtils.testAuthService)}
                  isLoading={isLoading}
                >
                  🔐 Test Auth Service
                </Button>

                <Button variant="outline" onClick={clearResults}>
                  🗑️ Clear Results
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Test Summary */}
        {summary && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md" color="gray.800">
                  Test Summary
                </Heading>
                <Text fontSize="lg" fontWeight="medium" color="gray.700">
                  {summary}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md" color="gray.800">
                  Test Results ({testResults.length})
                </Heading>

                <VStack
                  spacing={3}
                  align="stretch"
                  maxH="500px"
                  overflowY="auto"
                >
                  {testResults.map((result, index) => (
                    <Card key={index} variant="outline">
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <HStack justify="space-between">
                            <Heading size="sm" color="gray.800">
                              {result.service}
                            </Heading>
                            <Badge colorScheme={getStatusColor(result.status)}>
                              {result.status === 'success'
                                ? '✅ PASS'
                                : '❌ FAIL'}
                            </Badge>
                          </HStack>

                          <Text color="gray.600">{result.message}</Text>

                          {result.details && (
                            <Box>
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color="gray.700"
                                mb={2}
                              >
                                Details:
                              </Text>
                              <Box
                                p={3}
                                bg="gray.50"
                                borderRadius="md"
                                fontFamily="mono"
                                fontSize="sm"
                              >
                                <pre>
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              </Box>
                            </Box>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Instructions */}
        <Card variant="outline">
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md" color="gray.800">
                📋 Testing Instructions
              </Heading>

              <VStack spacing={2} align="start">
                <Text fontSize="sm" color="gray.600">
                  • <strong>Run All Tests:</strong> Tests all services at once
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • <strong>Firebase Connection:</strong> Verifies Firebase
                  services are initialized
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • <strong>Waitlist Service:</strong> Tests adding emails to
                  Firestore waitlist
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • <strong>Auth Service:</strong> Tests authentication service
                  functionality
                </Text>
              </VStack>

              <Divider />

              <Text fontSize="sm" color="gray.500">
                <strong>Note:</strong> The waitlist test will add a test email
                to your Firestore database. You can clean this up later in the
                Firebase console.
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default AuthTest;
