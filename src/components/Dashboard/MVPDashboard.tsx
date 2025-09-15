import React, { useMemo, useCallback, memo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { Users, Play, BookOpen, Brain, Plus, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePerformance } from '../../hooks/usePerformance';

// Memoized quick action item component
const QuickActionItem = memo<{
  title: string;
  description: string;
  icon: any;
  color: string;
  action: () => void;
}>(({ title, description, icon: IconComponent, color, action }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');

  return (
    <Card
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'lg',
        bg: hoverBgColor,
      }}
      onClick={action}
    >
      <CardBody>
        <VStack spacing={3} align="center">
          <Icon as={IconComponent} boxSize={8} color={`${color}.500`} />
          <VStack spacing={1} align="center">
            <Text fontWeight="semibold" fontSize="lg">
              {title}
            </Text>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              {description}
            </Text>
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  );
});

QuickActionItem.displayName = 'QuickActionItem';

// Memoized stat card component
const StatCard = memo<{
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down';
}>(({ label, value, change, trend }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const trendColor = trend === 'up' ? 'green.500' : 'red.500';

  return (
    <Card bg={bgColor} border="1px" borderColor={borderColor}>
      <CardBody>
        <VStack spacing={2} align="center">
          <Text fontSize="sm" color="gray.600" textAlign="center">
            {label}
          </Text>
          <Text fontSize="3xl" fontWeight="bold" color="gray.800">
            {value}
          </Text>
          <HStack spacing={1}>
            <Icon
              as={trend === 'up' ? 'arrow-up' : 'arrow-down'}
              color={trendColor}
              boxSize={4}
            />
            <Text fontSize="sm" color={trendColor}>
              {change}
            </Text>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

const MVPDashboard: React.FC = React.memo(() => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Performance monitoring
  const { performanceData, trackInteraction } = usePerformance({
    componentName: 'MVPDashboard',
    trackRenders: true,
    trackInteractions: true,
    enableLogging: __DEV__,
  });

  // Memoized quick actions to prevent unnecessary re-renders
  const quickActions = useMemo(() => [
    {
      title: 'Add Player',
      description: 'Add a new player to your team',
      icon: Users,
      color: 'blue',
      action: () => {
        const startTime = performance.now();
        navigate('/team');
        trackInteraction('navigate_to_team', performance.now() - startTime);
      },
    },
    {
      title: 'Create Play',
      description: 'Design a new play in the play designer',
      icon: Play,
      color: 'green',
      action: () => {
        const startTime = performance.now();
        navigate('/play-designer');
        trackInteraction('navigate_to_play_designer', performance.now() - startTime);
      },
    },
    {
      title: 'View Playbook',
      description: 'Browse your saved plays',
      icon: BookOpen,
      color: 'purple',
      action: () => {
        const startTime = performance.now();
        navigate('/playbook');
        trackInteraction('navigate_to_playbook', performance.now() - startTime);
      },
    },
    {
      title: 'AI Insights',
      description: 'Get AI-powered coaching insights',
      icon: Brain,
      color: 'orange',
      action: () => {
        const startTime = performance.now();
        navigate('/ai-brain');
        trackInteraction('navigate_to_ai_brain', performance.now() - startTime);
      },
    },
  ], [navigate, trackInteraction]);

  // Memoized stats to prevent unnecessary re-renders
  const stats = useMemo(() => [
    {
      label: 'Team Members',
      value: profile?.teamSize || 0,
      change: '+2 this week',
      trend: 'up' as const,
    },
    {
      label: 'Saved Plays',
      value: profile?.totalPlays || 0,
      change: '+5 this week',
      trend: 'up' as const,
    },
    {
      label: 'Practice Plans',
      value: profile?.totalPracticePlans || 0,
      change: '+3 this week',
      trend: 'up' as const,
    },
  ], [profile]);

  // Memoized color values
  const colors = useMemo(() => ({
    bgColor: useColorModeValue('white', 'gray.800'),
    borderColor: useColorModeValue('gray.200', 'gray.700'),
  }), []);

  // Performance monitoring display (only in development)
  const performanceDisplay = __DEV__ ? (
    <Box
      position="fixed"
      top={4}
      right={4}
      bg="blackAlpha.800"
      color="white"
      p={3}
      borderRadius="md"
      fontSize="xs"
      zIndex={1000}
    >
      <Text>Score: {performanceData.performanceScore}/100</Text>
      <Text>Renders: {performanceData.renderCount}</Text>
      <Text>Avg: {performanceData.avgRenderTime}ms</Text>
    </Box>
  ) : null;

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {performanceDisplay}
      
      {/* Welcome Header */}
      <VStack spacing={6} align="stretch" mb={8}>
        <Box>
          <Heading size="2xl" color="gray.800" mb={2}>
            Welcome back, {profile?.displayName || 'Coach'}! 👋
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Your {profile?.teamName || 'team'} is ready for today's practice
          </Text>
        </Box>

        {/* Quick Stats */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </SimpleGrid>

        {/* Quick Actions */}
        <Box>
          <Heading size="lg" mb={4} color="gray.700">
            Quick Actions
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            {quickActions.map((action, index) => (
              <QuickActionItem key={index} {...action} />
            ))}
          </SimpleGrid>
        </Box>

        {/* Recent Activity Section */}
        <Box>
          <HStack justify="space-between" align="center" mb={4}>
            <Heading size="lg" color="gray.700">
              Recent Activity
            </Heading>
            <Button
              rightIcon={<ArrowRight />}
              variant="ghost"
              colorScheme="blue"
              size="sm"
            >
              View All
            </Button>
          </HStack>
          
          <Card bg={colors.bgColor} border="1px" borderColor={colors.borderColor}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text color="gray.600">No recent activity</Text>
                  <Badge colorScheme="gray" variant="subtle">
                    New
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  Your recent activities will appear here
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </Box>
      </VStack>
    </Box>
  );
});

MVPDashboard.displayName = 'MVPDashboard';

export default MVPDashboard;
