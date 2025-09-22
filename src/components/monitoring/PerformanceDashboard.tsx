import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  GridItem,
  Divider,
  Collapse,
  useDisclosure,
  IconButton,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, WarningIcon, CheckIcon } from '@chakra-ui/icons';
import { performanceMonitor } from '../../services/monitoring/performance-monitor';
import { PerformanceMetrics, PerformanceAlert } from '../../services/monitoring/performance-monitor';

// ============================================
// PERFORMANCE DASHBOARD COMPONENT
// ============================================

export const PerformanceDashboard: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onToggle } = useDisclosure();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    const fetchPerformanceData = () => {
      try {
        const data = {
          coreWebVitals: performanceMonitor.getCoreWebVitals(),
          customMetrics: performanceMonitor.getPerformanceData(),
          alerts: performanceMonitor.getAlerts(),
          score: performanceMonitor.getPerformanceScore(),
        };
        setPerformanceData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
        setIsLoading(false);
      }
    };

    // Fetch initial data
    fetchPerformanceData();

    // Update every 5 seconds
    const interval = setInterval(fetchPerformanceData, 5000);

    return () => clearInterval(interval);
  }, []);

  // ============================================
  // RATING HELPERS
  // ============================================

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'green';
      case 'needs-improvement': return 'yellow';
      case 'poor': return 'red';
      default: return 'gray';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good': return <CheckIcon color="green.500" />;
      case 'needs-improvement': return <WarningIcon color="yellow.500" />;
      case 'poor': return <WarningIcon color="red.500" />;
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderCoreWebVitals = () => {
    if (!performanceData) return null;

    const vitals = performanceData.coreWebVitals;
    const vitalNames = {
      LCP: 'Largest Contentful Paint',
      FID: 'First Input Delay',
      CLS: 'Cumulative Layout Shift',
      FCP: 'First Contentful Paint',
      TTFB: 'Time to First Byte',
      INP: 'Interaction to Next Paint',
    };

    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">Core Web Vitals</Text>
        {Object.entries(vitals).map(([key, vital]) => (
          <Box key={key} p={4} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="medium">{vitalNames[key as keyof typeof vitalNames]}</Text>
              <HStack>
                {getRatingIcon(vital.rating)}
                <Badge colorScheme={getRatingColor(vital.rating)}>
                  {vital.rating}
                </Badge>
              </HStack>
            </HStack>
            <HStack>
              <Text fontSize="2xl" fontWeight="bold">
                {key === 'CLS' ? vital.value.toFixed(3) : `${Math.round(vital.value)}ms`}
              </Text>
              <Text color="gray.500" fontSize="sm">
                {new Date(vital.timestamp).toLocaleTimeString()}
              </Text>
            </HStack>
          </Box>
        ))}
      </VStack>
    );
  };

  const renderAlerts = () => {
    if (!performanceData || performanceData.alerts.length === 0) {
      return (
        <Alert status="success">
          <AlertIcon />
          <AlertTitle>No Performance Alerts</AlertTitle>
          <AlertDescription>All metrics are within acceptable thresholds.</AlertDescription>
        </Alert>
      );
    }

    return (
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="bold">Performance Alerts</Text>
          <Badge colorScheme="red">{performanceData.alerts.length}</Badge>
        </HStack>
        {performanceData.alerts.map((alert: PerformanceAlert) => (
          <Alert key={alert.id} status={alert.severity === 'high' ? 'error' : 'warning'}>
            <AlertIcon />
            <Box>
              <AlertTitle>{alert.metric} Alert</AlertTitle>
              <AlertDescription>
                Value: {alert.value}ms (Threshold: {alert.threshold}ms) - {alert.rating}
              </AlertDescription>
            </Box>
          </Alert>
        ))}
      </VStack>
    );
  };

  const renderCustomMetrics = () => {
    if (!performanceData) return null;

    const metrics = Array.from(performanceData.customMetrics.entries());
    
    if (metrics.length === 0) {
      return (
        <Text color="gray.500" textAlign="center" py={4}>
          No custom metrics available
        </Text>
      );
    }

    return (
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Metric</Th>
            <Th>Value</Th>
            <Th>Timestamp</Th>
          </Tr>
        </Thead>
        <Tbody>
          {metrics.slice(0, 10).map(([name, metric]) => (
            <Tr key={name}>
              <Td>
                <Text fontSize="sm" fontWeight="medium">
                  {name}
                </Text>
              </Td>
              <Td>
                <Text fontSize="sm">
                  {typeof metric.value === 'number' ? `${metric.value.toFixed(2)}ms` : metric.value}
                </Text>
              </Td>
              <Td>
                <Text fontSize="sm" color="gray.500">
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </Text>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  if (isLoading) {
    return (
      <Box p={6}>
        <Text>Loading performance data...</Text>
      </Box>
    );
  }

  if (!performanceData) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Failed to load performance data</AlertTitle>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">Performance Dashboard</Text>
          <Button size="sm" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </HStack>

        {/* Overall Score */}
        <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
          <Stat>
            <StatLabel>Overall Performance Score</StatLabel>
            <StatNumber color={`${getScoreColor(performanceData.score)}.500`}>
              {Math.round(performanceData.score)}/100
            </StatNumber>
            <StatHelpText>
              <StatArrow type={performanceData.score >= 80 ? 'increase' : 'decrease'} />
              {performanceData.score >= 80 ? 'Excellent' : performanceData.score >= 60 ? 'Good' : 'Needs Improvement'}
            </StatHelpText>
          </Stat>
        </Box>

        {/* Core Web Vitals */}
        <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
          {renderCoreWebVitals()}
        </Box>

        {/* Alerts */}
        <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
          {renderAlerts()}
        </Box>

        {/* Custom Metrics */}
        <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
          <HStack justify="space-between" mb={4}>
            <Text fontSize="lg" fontWeight="bold">Custom Metrics</Text>
            <IconButton
              aria-label="Toggle metrics"
              icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              onClick={onToggle}
              size="sm"
            />
          </HStack>
          <Collapse in={isOpen}>
            {renderCustomMetrics()}
          </Collapse>
        </Box>

        {/* Performance Tips */}
        <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
          <Text fontSize="lg" fontWeight="bold" mb={4}>Performance Tips</Text>
          <VStack spacing={3} align="stretch">
            <Text fontSize="sm" color="gray.600">
              • Optimize images with WebP/AVIF formats
            </Text>
            <Text fontSize="sm" color="gray.600">
              • Use lazy loading for below-the-fold content
            </Text>
            <Text fontSize="sm" color="gray.600">
              • Minimize JavaScript bundle size
            </Text>
            <Text fontSize="sm" color="gray.600">
              • Enable compression (gzip/brotli)
            </Text>
            <Text fontSize="sm" color="gray.600">
              • Use CDN for static assets
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default PerformanceDashboard;
