import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Select,
  ProgressCard,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';

interface ProgressAnalyticsProps {
  userId: string;
  metricType: string;
  timeRange: {
    start: Date;
    end: Date;
  };
}

interface PlayerMetric {
  name: string;
  currentValue: number;
  maxValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  category: string;
}

const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({ 
  userId, 
  metricType, 
  timeRange 
}) => {
  const [selectedMetric, setSelectedMetric] = useState(metricType);
  const [playerMetrics, setPlayerMetrics] = useState<PlayerMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading player metrics
    const loadMetrics = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics: PlayerMetric[] = [
        {
          name: 'Speed',
          currentValue: 85,
          maxValue: 100,
          unit: ' mph',
          trend: 'up',
          changePercent: 12,
          category: 'Physical'
        },
        {
          name: 'Agility',
          currentValue: 78,
          maxValue: 100,
          unit: ' score',
          trend: 'up',
          changePercent: 8,
          category: 'Physical'
        },
        {
          name: 'Passing Accuracy',
          currentValue: 92,
          maxValue: 100,
          unit: '%',
          trend: 'stable',
          changePercent: 2,
          category: 'Technical'
        },
        {
          name: 'Team Communication',
          currentValue: 65,
          maxValue: 100,
          unit: ' score',
          trend: 'up',
          changePercent: 15,
          category: 'Mental'
        },
        {
          name: 'Game Awareness',
          currentValue: 88,
          maxValue: 100,
          unit: ' score',
          trend: 'up',
          changePercent: 6,
          category: 'Mental'
        },
        {
          name: 'Stamina',
          currentValue: 72,
          maxValue: 100,
          unit: ' score',
          trend: 'down',
          changePercent: -3,
          category: 'Physical'
        }
      ];
      
      setPlayerMetrics(mockMetrics);
      setIsLoading(false);
    };

    loadMetrics();
  }, [userId, selectedMetric, timeRange]);

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'green';
      case 'down': return 'red';
      case 'stable': return 'blue';
      default: return 'gray';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Physical': return 'red';
      case 'Technical': return 'blue';
      case 'Mental': return 'purple';
      default: return 'gray';
    }
  };

  const overallProgress = playerMetrics.length > 0 
    ? Math.round(playerMetrics.reduce((sum, metric) => sum + metric.currentValue, 0) / playerMetrics.length)
    : 0;

  return (
    <Box
      bg="white"
      borderRadius="lg"
      boxShadow="base"
      p={6}
      border="1px solid"
      borderColor="gray.200"
    >
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" color="brand.600" mb={2}>
            Player Progress Analytics
          </Heading>
          <Text color="gray.600">
            Track and analyze player development across multiple metrics
          </Text>
        </Box>

        <HStack spacing={4}>
          <Box flex={1}>
            <Text fontWeight="medium" mb={2}>Metric Type</Text>
            <Select 
              value={selectedMetric} 
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <option value="speed">Speed</option>
              <option value="agility">Agility</option>
              <option value="strength">Strength</option>
              <option value="endurance">Endurance</option>
              <option value="technical">Technical Skills</option>
              <option value="mental">Mental Game</option>
            </Select>
          </Box>
          
          <Box flex={1}>
            <Text fontWeight="medium" mb={2}>Time Range</Text>
            <Text fontSize="sm" color="gray.600">
              {timeRange.start.toLocaleDateString()} - {timeRange.end.toLocaleDateString()}
            </Text>
          </Box>
        </HStack>

        {/* Overall Progress Summary */}
        <Box
          bg="gray.50"
          borderRadius="md"
          p={4}
          border="1px solid"
          borderColor="gray.200"
        >
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="medium">Overall Progress</Text>
            <Badge colorScheme="blue" variant="subtle">
              {playerMetrics.length} Metrics Tracked
            </Badge>
          </HStack>
          
          <Stat>
            <StatLabel>Average Performance</StatLabel>
            <StatNumber color="brand.600">{overallProgress}%</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              +5.2% from last month
            </StatHelpText>
          </Stat>
        </Box>

        {/* Individual Metrics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {playerMetrics.map((metric, index) => (
            <Box
              key={index}
              bg="white"
              borderRadius="md"
              p={4}
              border="1px solid"
              borderColor="gray.200"
              _hover={{ boxShadow: 'md' }}
              transition="all 0.2s"
            >
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="medium">{metric.name}</Text>
                  <Badge 
                    colorScheme={getCategoryColor(metric.category)} 
                    variant="subtle"
                    size="sm"
                  >
                    {metric.category}
                  </Badge>
                </HStack>
                
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="2xl" fontWeight="bold" color="brand.600">
                      {metric.currentValue}{metric.unit}
                    </Text>
                    <Badge 
                      colorScheme={getTrendColor(metric.trend)} 
                      variant="subtle"
                    >
                      {metric.trend === 'up' ? '+' : ''}{metric.changePercent}%
                    </Badge>
                  </HStack>
                  
                  <Progress 
                    value={metric.currentValue} 
                    colorScheme={getTrendColor(metric.trend)}
                    size="sm"
                    borderRadius="full"
                  />
                  
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Target: {metric.maxValue}{metric.unit}
                  </Text>
                </Box>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>

        {/* AI Insights */}
        <Box
          bg="blue.50"
          borderRadius="md"
          p={4}
          border="1px solid"
          borderColor="blue.200"
        >
          <Text fontWeight="medium" color="blue.700" mb={2}>
            AI Insights
          </Text>
          <Text fontSize="sm" color="blue.800">
            Player shows strong improvement in technical skills (+12%) and mental game (+15%). 
            Focus on stamina training as it shows a slight decline (-3%). 
            Recommended: Increase endurance drills and recovery sessions.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default ProgressAnalytics; 