import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Progress,
  Badge,
  Icon,
  useBreakpointValue,
  useColorModeValue,
  Tooltip,
  Button,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Info,
} from 'lucide-react';
import { RESPONSIVE_SPACING, RESPONSIVE_FONTS } from '../../utils/responsive';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
  networkLatency: number;
}

interface PerformanceMonitorProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 0,
    networkLatency: 0,
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { isOpen, onToggle } = useDisclosure();

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const spacing = useBreakpointValue(RESPONSIVE_SPACING.md);
  const headingSize = useBreakpointValue(RESPONSIVE_FONTS.md);
  const textSize = useBreakpointValue(RESPONSIVE_FONTS.sm);

  const measurePerformance = useCallback(() => {
    const startTime = performance.now();

    // Measure render time
    const renderStart = performance.now();
    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStart;

      // Measure memory usage (if available)
      const memory = (performance as any).memory;
      const memoryUsage = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;

      // Measure FPS
      let frameCount = 0;
      let lastTime = performance.now();

      const measureFPS = () => {
        frameCount++;
        const currentTime = performance.now();

        if (currentTime - lastTime >= 1000) {
          const fps = Math.round(
            (frameCount * 1000) / (currentTime - lastTime)
          );

          setMetrics(prev => ({
            ...prev,
            renderTime,
            memoryUsage,
            fps,
          }));

          frameCount = 0;
          lastTime = currentTime;
        }

        if (isMonitoring) {
          requestAnimationFrame(measureFPS);
        }
      };

      requestAnimationFrame(measureFPS);
    });

    // Measure load time
    const loadTime = performance.now() - startTime;
    setMetrics(prev => ({ ...prev, loadTime }));
  }, [isMonitoring]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    measurePerformance();
  }, [measurePerformance]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const getPerformanceScore = useCallback(() => {
    let score = 100;

    if (metrics.loadTime > 1000) score -= 20;
    if (metrics.renderTime > 16) score -= 15;
    if (metrics.memoryUsage > 100) score -= 15;
    if (metrics.fps < 30) score -= 20;
    if (metrics.networkLatency > 200) score -= 10;

    return Math.max(0, score);
  }, [metrics]);

  const getPerformanceColor = useCallback((score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    if (score >= 50) return 'orange';
    return 'red';
  }, []);

  const getPerformanceLabel = useCallback((score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  }, []);

  useEffect(() => {
    if (autoRefresh && isMonitoring) {
      const interval = setInterval(measurePerformance, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isMonitoring, refreshInterval, measurePerformance]);

  useEffect(() => {
    // Initial measurement
    measurePerformance();
  }, [measurePerformance]);

  const performanceScore = getPerformanceScore();
  const performanceColor = getPerformanceColor(performanceScore);
  const performanceLabel = getPerformanceLabel(performanceScore);

  return (
    <Box
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={spacing}
      className="animate-fade-in-responsive"
    >
      <VStack spacing={spacing} align="stretch">
        <HStack justify="space-between" align="center">
          <HStack spacing={2}>
            <Icon as={Activity} color="blue.500" />
            <Heading size={headingSize} color="gray.800">
              Performance Monitor
            </Heading>
          </HStack>

          <HStack spacing={2}>
            <Badge colorScheme={performanceColor} variant="subtle">
              {performanceScore}/100
            </Badge>
            <Badge colorScheme={performanceColor} variant="outline">
              {performanceLabel}
            </Badge>
          </HStack>
        </HStack>

        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize={textSize} color="gray.600">
              Overall Performance
            </Text>
            <Text fontSize={textSize} fontWeight="semibold" color="gray.800">
              {performanceScore}%
            </Text>
          </HStack>
          <Progress
            value={performanceScore}
            colorScheme={performanceColor}
            borderRadius="full"
            size="sm"
          />
        </Box>

        <HStack spacing={2}>
          <Button
            size={{ base: 'sm', md: 'md' }}
            colorScheme={isMonitoring ? 'red' : 'green'}
            variant="outline"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            leftIcon={<Icon as={isMonitoring ? Activity : Zap} />}
            flex={1}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Button>

          {showDetails && (
            <Button
              size={{ base: 'sm', md: 'md' }}
              variant="ghost"
              onClick={onToggle}
              leftIcon={<Icon as={Info} />}
            >
              Details
            </Button>
          )}
        </HStack>

        {showDetails && (
          <Collapse in={isOpen} animateOpacity>
            <VStack spacing={3} align="stretch" pt={2}>
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">
                    Load Time
                  </Text>
                  <Text fontSize="xs" color="gray.700">
                    {metrics.loadTime.toFixed(2)}ms
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(100, (metrics.loadTime / 1000) * 100)}
                  colorScheme={metrics.loadTime > 1000 ? 'red' : 'green'}
                  size="xs"
                  borderRadius="full"
                />
              </Box>

              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">
                    Render Time
                  </Text>
                  <Text fontSize="xs" color="gray.700">
                    {metrics.renderTime.toFixed(2)}ms
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(100, (metrics.renderTime / 16) * 100)}
                  colorScheme={metrics.renderTime > 16 ? 'red' : 'green'}
                  size="xs"
                  borderRadius="full"
                />
              </Box>

              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">
                    Memory Usage
                  </Text>
                  <Text fontSize="xs" color="gray.700">
                    {metrics.memoryUsage.toFixed(1)}MB
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(100, (metrics.memoryUsage / 100) * 100)}
                  colorScheme={metrics.memoryUsage > 100 ? 'red' : 'green'}
                  size="xs"
                  borderRadius="full"
                />
              </Box>

              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">
                    FPS
                  </Text>
                  <Text fontSize="xs" color="gray.700">
                    {metrics.fps}
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(100, (metrics.fps / 60) * 100)}
                  colorScheme={
                    metrics.fps < 30
                      ? 'red'
                      : metrics.fps < 50
                        ? 'yellow'
                        : 'green'
                  }
                  size="xs"
                  borderRadius="full"
                />
              </Box>
            </VStack>
          </Collapse>
        )}
      </VStack>
    </Box>
  );
};

export default PerformanceMonitor;
