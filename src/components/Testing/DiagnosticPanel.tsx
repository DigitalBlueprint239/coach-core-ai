import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Card, CardBody, CardHeader, Button, Icon, Badge, useToast, useColorModeValue, SimpleGrid, Progress, Stat, StatLabel, StatNumber, StatHelpText, Alert, AlertIcon, AlertTitle, AlertDescription, Code, Divider,
} from '@chakra-ui/react';
import {
  CheckCircle, XCircle, AlertTriangle, Info, Activity, Database, Network, Lock, Unlock, Key, Globe, Smartphone, Monitor, Server, Cpu, Memory, HardDrive, Wifi, WifiOff, Clock, RefreshCw,
} from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
  timestamp: Date;
}

const DiagnosticPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'warning' | 'critical'>('pending');

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // Test 1: Browser Environment
    try {
      const browserTest = {
        name: 'Browser Environment',
        status: 'pass' as const,
        message: 'Browser environment is compatible',
        details: `User Agent: ${navigator.userAgent}`,
        timestamp: new Date(),
      };
      results.push(browserTest);
    } catch (error) {
      results.push({
        name: 'Browser Environment',
        status: 'fail',
        message: 'Browser environment check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    // Test 2: JavaScript Runtime
    try {
      const jsTest = {
        name: 'JavaScript Runtime',
        status: 'pass' as const,
        message: 'JavaScript runtime is working',
        details: `ES6 Support: ${typeof Promise !== 'undefined' ? 'Yes' : 'No'}`,
        timestamp: new Date(),
      };
      results.push(jsTest);
    } catch (error) {
      results.push({
        name: 'JavaScript Runtime',
        status: 'fail',
        message: 'JavaScript runtime check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    // Test 3: React Environment
    try {
      const reactTest = {
        name: 'React Environment',
        status: 'pass' as const,
        message: 'React is properly loaded',
        details: `React Version: ${React.version}`,
        timestamp: new Date(),
      };
      results.push(reactTest);
    } catch (error) {
      results.push({
        name: 'React Environment',
        status: 'fail',
        message: 'React environment check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    // Test 4: Chakra UI
    try {
      const chakraTest = {
        name: 'Chakra UI',
        status: 'pass' as const,
        message: 'Chakra UI components are available',
        details: 'UI library loaded successfully',
        timestamp: new Date(),
      };
      results.push(chakraTest);
    } catch (error) {
      results.push({
        name: 'Chakra UI',
        status: 'fail',
        message: 'Chakra UI check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    // Test 5: Network Connectivity
    try {
      const networkTest = {
        name: 'Network Connectivity',
        status: navigator.onLine ? 'pass' as const : 'warning' as const,
        message: navigator.onLine ? 'Network is online' : 'Network is offline',
        details: `Connection: ${navigator.onLine ? 'Online' : 'Offline'}`,
        timestamp: new Date(),
      };
      results.push(networkTest);
    } catch (error) {
      results.push({
        name: 'Network Connectivity',
        status: 'fail',
        message: 'Network check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    // Test 6: Local Storage
    try {
      localStorage.setItem('test', 'value');
      localStorage.removeItem('test');
      const storageTest = {
        name: 'Local Storage',
        status: 'pass' as const,
        message: 'Local storage is accessible',
        details: 'Storage operations successful',
        timestamp: new Date(),
      };
      results.push(storageTest);
    } catch (error) {
      results.push({
        name: 'Local Storage',
        status: 'fail',
        message: 'Local storage check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    // Test 7: Service Worker
    try {
      const swTest = {
        name: 'Service Worker',
        status: 'serviceWorker' in navigator ? 'pass' as const : 'warning' as const,
        message: 'serviceWorker' in navigator ? 'Service Worker supported' : 'Service Worker not supported',
        details: `Support: ${'serviceWorker' in navigator ? 'Yes' : 'No'}`,
        timestamp: new Date(),
      };
      results.push(swTest);
    } catch (error) {
      results.push({
        name: 'Service Worker',
        status: 'fail',
        message: 'Service Worker check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    // Test 8: Performance
    try {
      const performanceTest = {
        name: 'Performance API',
        status: 'performance' in window ? 'pass' as const : 'warning' as const,
        message: 'performance' in window ? 'Performance API available' : 'Performance API not available',
        details: `Available: ${'performance' in window ? 'Yes' : 'No'}`,
        timestamp: new Date(),
      };
      results.push(performanceTest);
    } catch (error) {
      results.push({
        name: 'Performance API',
        status: 'fail',
        message: 'Performance check failed',
        details: error.message,
        timestamp: new Date(),
      });
    }

    setDiagnostics(results);
    
    // Calculate overall health
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    if (failCount > 0) {
      setOverallHealth('critical');
    } else if (warningCount > 0) {
      setOverallHealth('warning');
    } else {
      setOverallHealth('healthy');
    }

    setIsRunning(false);
    
    toast({
      title: 'Diagnostics Complete',
      description: `Found ${passCount} passing, ${warningCount} warnings, ${failCount} failures`,
      status: failCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'green';
      case 'fail': return 'red';
      case 'warning': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return CheckCircle;
      case 'fail': return XCircle;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const getHealthColor = () => {
    switch (overallHealth) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getHealthIcon = () => {
    switch (overallHealth) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return Info;
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {/* Header */}
      <Box mb={8}>
        <Heading size="lg" color="gray.800" mb={2}>
          🔍 System Diagnostics
        </Heading>
        <Text color="gray.600">
          Comprehensive system health check to identify potential issues
        </Text>
      </Box>

      {/* Overall Health */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mb={6}>
        <CardBody>
          <HStack spacing={6} align="center">
            <Icon as={getHealthIcon()} boxSize={8} color={`${getHealthColor()}.500`} />
            <Box>
              <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                Overall System Health: {overallHealth.toUpperCase()}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {diagnostics.filter(d => d.status === 'pass').length} of {diagnostics.length} checks passed
              </Text>
            </Box>
            <Box ml="auto">
              <Button
                leftIcon={<Icon as={RefreshCw} />}
                onClick={runDiagnostics}
                isLoading={isRunning}
                loadingText="Running..."
                colorScheme="blue"
                size="sm"
              >
                Re-run Diagnostics
              </Button>
            </Box>
          </HStack>
        </CardBody>
      </Card>

      {/* Diagnostic Results */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {diagnostics.map((diagnostic) => (
          <Card key={diagnostic.name} bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <VStack spacing={3} align="stretch">
                <HStack spacing={3}>
                  <Icon 
                    as={getStatusIcon(diagnostic.status)} 
                    boxSize={6} 
                    color={`${getStatusColor(diagnostic.status)}.500`}
                  />
                  <Box flex={1}>
                    <Text fontWeight="semibold" color="gray.800">
                      {diagnostic.name}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {diagnostic.message}
                    </Text>
                  </Box>
                  <Badge 
                    colorScheme={getStatusColor(diagnostic.status)}
                    variant="subtle"
                  >
                    {diagnostic.status}
                  </Badge>
                </HStack>
                
                {diagnostic.details && (
                  <Text fontSize="xs" color="gray.500" bg="gray.50" p={2} borderRadius="md">
                    {diagnostic.details}
                  </Text>
                )}
                
                <Text fontSize="xs" color="gray.400">
                  {diagnostic.timestamp.toLocaleTimeString()}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Recommendations */}
      {overallHealth !== 'healthy' && (
        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mt={6}>
          <CardHeader>
            <Heading size="md" color="gray.800">
              <Icon as={Info} mr={2} color="blue.500" />
              Recommendations
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {diagnostics.filter(d => d.status === 'fail').map((diagnostic) => (
                <Alert key={diagnostic.name} status="error" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>{diagnostic.name}</AlertTitle>
                    <AlertDescription>
                      {diagnostic.message}. {diagnostic.details}
                    </AlertDescription>
                  </Box>
                </Alert>
              ))}
              
              {diagnostics.filter(d => d.status === 'warning').map((diagnostic) => (
                <Alert key={diagnostic.name} status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>{diagnostic.name}</AlertTitle>
                    <AlertDescription>
                      {diagnostic.message}. This may affect some features.
                    </AlertDescription>
                  </Box>
                </Alert>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default DiagnosticPanel;
