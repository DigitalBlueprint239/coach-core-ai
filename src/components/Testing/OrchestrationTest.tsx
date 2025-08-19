import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Card, CardBody, CardHeader, Button, Icon, Badge, useToast, useColorModeValue, SimpleGrid, Progress, Stat, StatLabel, StatNumber, StatHelpText, Alert, AlertIcon, AlertTitle, AlertDescription, Code, Divider,
} from '@chakra-ui/react';
import {
  Play, Pause, Stop, RotateCcw, Zap, Brain, CheckCircle, XCircle, AlertTriangle, Info, CloudRain, Video, Heart, Activity, TrendingUp, TrendingDown, Clock, Target, Users, Calendar, MapPin, Thermometer, Droplets, Wind, Sun, Moon, Star, Award, Rocket, Cpu, Server, Network, Lock, Unlock, Key, PieChart, LineChart, AreaChart, ScatterChart, ArrowUp, ArrowDown, Workflow,
} from 'lucide-react';
import intelligentDataOrchestrator from '../../services/api/intelligent-orchestrator';

interface TestResult {
  id: string;
  workflowType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
}

const OrchestrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<{ size: number; hitRate: number } | null>(null);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const workflows = await intelligentDataOrchestrator.getAllWorkflows();
      setActiveWorkflows(workflows);
      
      const stats = await intelligentDataOrchestrator.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const runWorkflowTest = async (workflowType: string) => {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testResult: TestResult = {
      id: testId,
      workflowType,
      status: 'pending',
      startTime: new Date(),
    };

    setTestResults(prev => [...prev, testResult]);
    setIsRunning(true);

    try {
      let result;
      const startTime = Date.now();

      switch (workflowType) {
        case 'weather-aware':
          result = await intelligentDataOrchestrator.executeWeatherAwarePracticePlanning(
            'football',
            'varsity',
            'Practice Plan A',
            { lat: 40.7128, lon: -74.0060 }
          );
          break;
        case 'video-analysis':
          result = await intelligentDataOrchestrator.executeVideoEnhancedPlayAnalysis(
            'play-123',
            'Hudl',
            'Quarterback Analysis'
          );
          break;
        case 'health-monitoring':
          result = await intelligentDataOrchestrator.executeRealTimeHealthMonitoring(
            'team-456',
            ['player-1', 'player-2', 'player-3']
          );
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflowType}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update test result
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { ...test, status: 'completed', endTime: new Date(), duration, result }
          : test
      ));

      toast({
        title: 'Workflow Test Completed!',
        description: `${workflowType} workflow executed successfully in ${duration}ms`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { ...test, status: 'failed', endTime: new Date(), duration, error: error.message }
          : test
      ));

      toast({
        title: 'Workflow Test Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRunning(false);
      await loadData(); // Refresh data
    }
  };

  const runAllTests = async () => {
    const workflows = ['weather-aware', 'video-analysis', 'health-monitoring'];
    
    for (const workflow of workflows) {
      await runWorkflowTest(workflow);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'running': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'failed': return XCircle;
      case 'running': return Activity;
      default: return Clock;
    }
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {/* Header */}
      <Box mb={8}>
        <Heading size="lg" color="gray.800" mb={2}>
          🧪 Intelligent Data Orchestration Engine Test
        </Heading>
        <Text color="gray.600">
          Test the core workflow automation and data orchestration capabilities
        </Text>
      </Box>

      {/* Test Controls */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mb={6}>
        <CardHeader>
          <Heading size="md" color="gray.800">
            <Icon as={Zap} mr={2} color="blue.500" />
            Test Controls
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4} justify="center">
              <Button
                leftIcon={<Icon as={Play} />}
                colorScheme="green"
                size="lg"
                onClick={() => runWorkflowTest('weather-aware')}
                isLoading={isRunning}
                loadingText="Testing..."
                borderRadius="xl"
              >
                Test Weather-Aware Workflow
              </Button>
              
              <Button
                leftIcon={<Icon as={Video} />}
                colorScheme="purple"
                size="lg"
                onClick={() => runWorkflowTest('video-analysis')}
                isLoading={isRunning}
                loadingText="Testing..."
                borderRadius="xl"
              >
                Test Video Analysis Workflow
              </Button>
              
              <Button
                leftIcon={<Icon as={Heart} />}
                colorScheme="red"
                size="lg"
                onClick={() => runWorkflowTest('health-monitoring')}
                isLoading={isRunning}
                loadingText="Testing..."
                borderRadius="xl"
              >
                Test Health Monitoring Workflow
              </Button>
            </HStack>
            
            <HStack spacing={4} justify="center">
              <Button
                leftIcon={<Icon as={Rocket} />}
                colorScheme="orange"
                size="lg"
                onClick={runAllTests}
                isLoading={isRunning}
                loadingText="Running All Tests..."
                borderRadius="xl"
              >
                Run All Tests
              </Button>
              
              <Button
                leftIcon={<Icon as={RotateCcw} />}
                variant="outline"
                size="lg"
                onClick={clearResults}
                borderRadius="xl"
              >
                Clear Results
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* System Status */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Active Workflows</StatLabel>
              <StatNumber color="blue.600">{activeWorkflows.filter(w => w.status === 'running').length}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                {activeWorkflows.length} total
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Cache Performance</StatLabel>
              <StatNumber color="green.600">
                {cacheStats ? Math.round(cacheStats.hitRate * 100) : 0}%
              </StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                Hit rate
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Test Results</StatLabel>
              <StatNumber color="purple.600">{testResults.length}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                {testResults.filter(t => t.status === 'completed').length} successful
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Test Results */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
        <CardHeader>
          <Heading size="md" color="gray.800">
            <Icon as={Chart} mr={2} color="blue.500" />
            Test Results
          </Heading>
        </CardHeader>
        <CardBody>
          {testResults.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Icon as={Info} boxSize={12} color="gray.400" mb={4} />
              <Text color="gray.500">No tests run yet</Text>
              <Text fontSize="sm" color="gray.400">Click the test buttons above to start testing</Text>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch">
              {testResults.map((test) => (
                <Card key={test.id} bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardBody>
                    <HStack spacing={4} align="center">
                      <Icon 
                        as={getStatusIcon(test.status)} 
                        boxSize={6} 
                        color={`${getStatusColor(test.status)}.500`}
                      />
                      
                      <Box flex={1}>
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="semibold" color="gray.800">
                            {test.workflowType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                          <Badge 
                            colorScheme={getStatusColor(test.status)}
                            variant="subtle"
                          >
                            {test.status}
                          </Badge>
                        </HStack>
                        
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          Started: {test.startTime.toLocaleString()}
                        </Text>
                        
                        {test.endTime && (
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            Duration: {test.duration}ms
                          </Text>
                        )}
                        
                        {test.error && (
                          <Alert status="error" borderRadius="md" mt={2}>
                            <AlertIcon />
                            <Box>
                              <AlertTitle>Error!</AlertTitle>
                              <AlertDescription>{test.error}</AlertDescription>
                            </Box>
                          </Alert>
                        )}
                        
                        {test.result && (
                          <Box mt={3}>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                              Result:
                            </Text>
                            <Code p={3} borderRadius="md" bg="gray.100" color="gray.800" fontSize="xs">
                              {JSON.stringify(test.result, null, 2)}
                            </Code>
                          </Box>
                        )}
                      </Box>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </CardBody>
      </Card>

      {/* Active Workflows */}
      {activeWorkflows.length > 0 && (
        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mt={6}>
          <CardHeader>
            <Heading size="md" color="gray.800">
              <Icon as={Workflow} mr={2} color="blue.500" />
              Active Workflows
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {activeWorkflows.map((workflow) => (
                <Box key={workflow.id} p={4} bg={cardBg} borderRadius="lg">
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="semibold" color="gray.800">
                      {workflow.workflowType}
                    </Text>
                    <Badge colorScheme="blue" variant="subtle">
                      {workflow.status}
                    </Badge>
                  </HStack>
                  
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    ID: {workflow.id}
                  </Text>
                  
                  <HStack spacing={4} fontSize="xs" color="gray.500">
                    <Text>Started: {workflow.startedAt.toLocaleString()}</Text>
                    <Text>Steps: {workflow.currentStep}/{workflow.steps.length}</Text>
                  </HStack>
                  
                  <Box mt={3}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" color="gray.600">Progress</Text>
                      <Text fontSize="xs" color="gray.600">
                        {Math.round((workflow.currentStep / workflow.steps.length) * 100)}%
                      </Text>
                    </HStack>
                    <Progress 
                      value={(workflow.currentStep / workflow.steps.length) * 100} 
                      colorScheme="blue"
                      borderRadius="full"
                    />
                  </Box>
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default OrchestrationTest;
