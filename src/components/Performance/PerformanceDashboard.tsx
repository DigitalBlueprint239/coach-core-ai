import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Progress,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  BarChart3,
  Clock,
  Target,
} from 'lucide-react';
import { performanceMonitor } from '../../services/monitoring/performance-monitor';

interface PerformanceDashboardProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { isOpen, onToggle } = useDisclosure();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  // Refresh performance data
  const refreshData = useCallback(() => {
    const data = performanceMonitor.generatePerformanceReport();
    setPerformanceData(data);
    setLastRefresh(new Date());
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    refreshData();
    const interval = setInterval(refreshData, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Performance score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };

  // Performance status
  const getPerformanceStatus = (score: number) => {
    if (score >= 80) return { status: 'Excellent', icon: CheckCircle, color: 'green' };
    if (score >= 60) return { status: 'Good', icon: Info, color: 'blue' };
    if (score >= 40) return { status: 'Fair', icon: AlertTriangle, color: 'orange' };
    return { status: 'Poor', icon: AlertTriangle, color: 'red' };
  };

  // Memoized performance metrics
  const metrics = useMemo(() => {
    if (!performanceData) return null;

    const { summary } = performanceData;
    const status = getPerformanceStatus(summary.performanceScore);

    return {
      summary,
      status,
      recommendations: performanceData.recommendations || [],
      recentMetrics: performanceData.recentMetrics || [],
      recentInteractions: performanceData.recentInteractions || [],
    };
  }, [performanceData]);

  if (!metrics) {
    return (
      <Card bg={bgColor} border="1px" borderColor={borderColor}>
        <CardBody>
          <VStack spacing={4}>
            <Text>Loading performance data...</Text>
            <Button onClick={refreshData} leftIcon={<RefreshCw />}>
              Refresh
            </Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  const { summary, status, recommendations, recentMetrics, recentInteractions } = metrics;
  const StatusIcon = status.icon;

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <HStack spacing={3}>
          <Box p={2} bg={`${status.color}.100`} borderRadius="full">
            <StatusIcon color={`${status.color}.600`} size={24} />
          </Box>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color={textColor}>
              Performance Dashboard
            </Heading>
            <Text color={mutedTextColor}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Text>
          </VStack>
        </HStack>
        
        <HStack spacing={3}>
          <Button
            onClick={refreshData}
            leftIcon={<RefreshCw />}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          <Button
            onClick={onToggle}
            leftIcon={<BarChart3 />}
            variant="outline"
            size="sm"
          >
            {isOpen ? 'Hide' : 'Show'} Details
          </Button>
        </HStack>
      </HStack>

      {/* Performance Score Card */}
      <Card bg={bgColor} border="1px" borderColor={borderColor}>
        <CardHeader>
          <HStack justify="space-between" align="center">
            <Heading size="md" color={textColor}>
              Overall Performance Score
            </Heading>
            <Badge colorScheme={status.color} variant="subtle" fontSize="md">
              {status.status}
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between" align="center">
              <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                {summary.performanceScore}/100
              </Text>
              <Box p={3} bg={`${status.color}.100`} borderRadius="full">
                <Target color={`${status.color}.600`} size={32} />
              </Box>
            </HStack>
            
            <Progress
              value={summary.performanceScore}
              colorScheme={status.color}
              size="lg"
              borderRadius="full"
            />
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <VStack spacing={2} align="center">
                <Text fontSize="sm" color={mutedTextColor}>
                  Avg Render Time
                </Text>
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                  {summary.avgRenderTime}ms
                </Text>
              </VStack>
              
              <VStack spacing={2} align="center">
                <Text fontSize="sm" color={mutedTextColor}>
                  Avg Response Time
                </Text>
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                  {summary.avgResponseTime}ms
                </Text>
              </VStack>
              
              <VStack spacing={2} align="center">
                <Text fontSize="sm" color={mutedTextColor}>
                  Total Metrics
                </Text>
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                  {summary.totalMetrics}
                </Text>
              </VStack>
            </SimpleGrid>
          </VStack>
        </CardBody>
      </Card>

      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Card bg={bgColor} border="1px" borderColor={borderColor}>
          <CardHeader>
            <HStack spacing={2}>
              <Activity color="blue.500" size={20} />
              <Heading size="md" color={textColor}>
                Render Performance
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text color={mutedTextColor}>Slow Renders</Text>
                <Badge colorScheme={summary.slowRenders > 5 ? 'red' : 'green'}>
                  {summary.slowRenders}
                </Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text color={mutedTextColor}>Total Renders</Text>
                <Text fontWeight="semibold">{summary.totalMetrics}</Text>
              </HStack>
              
              <HStack justify="space-between">
                <Text color={mutedTextColor}>Performance</Text>
                <Badge colorScheme={summary.slowRenders > 5 ? 'red' : 'green'}>
                  {summary.slowRenders > 5 ? 'Needs Attention' : 'Good'}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor}>
          <CardHeader>
            <HStack spacing={2}>
              <Zap color="orange.500" size={20} />
              <Heading size="md" color={textColor}>
                Interaction Performance
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text color={mutedTextColor}>Slow Interactions</Text>
                <Badge colorScheme={summary.slowInteractions > 5 ? 'red' : 'green'}>
                  {summary.slowInteractions}
                </Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text color={mutedTextColor}>Total Interactions</Text>
                <Text fontWeight="semibold">{summary.totalInteractions}</Text>
              </HStack>
              
              <HStack justify="space-between">
                <Text color={mutedTextColor}>Performance</Text>
                <Badge colorScheme={summary.slowInteractions > 5 ? 'red' : 'green'}>
                  {summary.slowInteractions > 5 ? 'Needs Attention' : 'Good'}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card bg={bgColor} border="1px" borderColor={borderColor}>
          <CardHeader>
            <HStack spacing={2}>
              <AlertTriangle color="yellow.500" size={20} />
              <Heading size="md" color={textColor}>
                Performance Recommendations
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {recommendations.map((recommendation, index) => (
                <Alert key={index} status="info" variant="left-accent">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Recommendation {index + 1}</AlertTitle>
                    <AlertDescription>{recommendation}</AlertDescription>
                  </Box>
                </Alert>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Detailed Metrics (Collapsible) */}
      <Collapse in={isOpen}>
        <VStack spacing={6} align="stretch">
          {/* Recent Component Renders */}
          {recentMetrics.length > 0 && (
            <Card bg={bgColor} border="1px" borderColor={borderColor}>
              <CardHeader>
                <HStack spacing={2}>
                  <Clock color="purple.500" size={20} />
                  <Heading size="md" color={textColor}>
                    Recent Component Renders
                  </Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Component</Th>
                      <Th>Render Time</Th>
                      <Th>Status</Th>
                      <Th>Timestamp</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentMetrics.map((metric: any, index: number) => (
                      <Tr key={index}>
                        <Td>{metric.componentName}</Td>
                        <Td>{metric.renderTime.toFixed(2)}ms</Td>
                        <Td>
                          <Badge
                            colorScheme={metric.renderTime > 16 ? 'red' : 'green'}
                            variant="subtle"
                          >
                            {metric.renderTime > 16 ? 'Slow' : 'Fast'}
                          </Badge>
                        </Td>
                        <Td>{new Date(metric.timestamp).toLocaleTimeString()}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          )}

          {/* Recent User Interactions */}
          {recentInteractions.length > 0 && (
            <Card bg={bgColor} border="1px" borderColor={borderColor}>
              <CardHeader>
                <HStack spacing={2}>
                  <TrendingUp color="green.500" size={20} />
                  <Heading size="md" color={textColor}>
                    Recent User Interactions
                  </Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Action</Th>
                      <Th>Component</Th>
                      <Th>Response Time</Th>
                      <Th>Status</Th>
                      <Th>Timestamp</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentInteractions.map((interaction: any, index: number) => (
                      <Tr key={index}>
                        <Td>{interaction.action}</Td>
                        <Td>{interaction.componentName || 'N/A'}</Td>
                        <Td>{interaction.responseTime.toFixed(2)}ms</Td>
                        <Td>
                          <Badge
                            colorScheme={interaction.success ? 'green' : 'red'}
                            variant="subtle"
                          >
                            {interaction.success ? 'Success' : 'Failed'}
                          </Badge>
                        </Td>
                        <Td>{new Date(interaction.timestamp).toLocaleTimeString()}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Collapse>
    </VStack>
  );
};

export default PerformanceDashboard;


