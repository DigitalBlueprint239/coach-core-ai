// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
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
  Avatar,
  AvatarGroup,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Flex,
  Spacer,
  Divider,
  IconButton,
  Tooltip,
  Skeleton,
  SkeletonText,
} from '@chakra-ui/react';
import {
  Users,
  Play,
  BookOpen,
  Brain,
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
  Trophy,
  Target,
  Clock,
  Zap,
  Star,
  Activity,
  BarChart3,
  Settings,
  Bell,
  Search,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Modern card component with animations
const AnimatedCard = ({ children, delay = 0, ...props }: any) => (
  <Card
    {...props}
    opacity={0}
    transform="translateY(20px)"
    animation={`fadeIn 0.6s ease-out ${delay}ms forwards`}
    _hover={{
      transform: 'translateY(-4px)',
      boxShadow: 'xl',
    }}
    transition="all 0.3s ease-in-out"
  >
    {children}
  </Card>
);

// Quick action button component
const QuickActionButton = ({ icon, title, description, color, href, onClick }: any) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  return (
    <Card
      as={href ? Link : 'button'}
      to={href}
      onClick={onClick}
      bg={bgColor}
      border="1px solid"
      borderColor="gray.200"
      cursor="pointer"
      transition="all 0.2s ease-in-out"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'lg',
        bg: hoverBg,
      }}
      _active={{
        transform: 'translateY(0)',
      }}
    >
      <CardBody>
        <VStack spacing={3} align="center">
          <Box
            p={3}
            borderRadius="xl"
            bg={`${color}.100`}
            color={`${color}.600`}
          >
            <Icon as={icon} boxSize={6} />
          </Box>
          <VStack spacing={1} align="center">
            <Text fontWeight="600" fontSize="sm" textAlign="center">
              {title}
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              {description}
            </Text>
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

// Statistics card component
const StatCard = ({ label, value, change, trend, icon, color, delay = 0 }: any) => (
  <AnimatedCard delay={delay}>
    <CardBody>
      <HStack justify="space-between" align="start">
        <VStack align="start" spacing={2}>
          <Text fontSize="sm" color="gray.500" fontWeight="500">
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="700" color="gray.900">
            {value}
          </Text>
          {change && (
            <HStack spacing={1}>
              <StatArrow type={trend === 'up' ? 'increase' : 'decrease'} />
              <Text fontSize="sm" color={trend === 'up' ? 'success.500' : 'error.500'}>
                {change}
              </Text>
            </HStack>
          )}
        </VStack>
        <Box
          p={2}
          borderRadius="lg"
          bg={`${color}.100`}
          color={`${color}.600`}
        >
          <Icon as={icon} boxSize={5} />
        </Box>
      </HStack>
    </CardBody>
  </AnimatedCard>
);

// Recent activity item component
const ActivityItem = ({ type, title, time, status, icon }: any) => {
  const statusColors = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
  };
  
  return (
    <HStack spacing={3} py={2}>
      <Box
        p={2}
        borderRadius="lg"
        bg="gray.100"
        color="gray.600"
      >
        <Icon as={icon} boxSize={4} />
      </Box>
      <VStack align="start" spacing={0} flex={1}>
        <Text fontSize="sm" fontWeight="500">
          {title}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {time}
        </Text>
      </VStack>
      <Badge
        colorScheme={statusColors[status] || 'gray'}
        size="sm"
        borderRadius="full"
      >
        {status}
      </Badge>
    </HStack>
  );
};

// Main dashboard component
const ModernDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Color values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Quick actions data
  const quickActions = useMemo(() => [
    {
      icon: Users,
      title: 'Add Player',
      description: 'Add new team member',
      color: 'blue',
      href: '/team',
    },
    {
      icon: Play,
      title: 'Create Play',
      description: 'Design new play',
      color: 'green',
      href: '/play-designer',
    },
    {
      icon: BookOpen,
      title: 'Plan Practice',
      description: 'Schedule practice',
      color: 'purple',
      href: '/practice',
    },
    {
      icon: Brain,
      title: 'AI Assistant',
      description: 'Get AI insights',
      color: 'orange',
      href: '/ai-brain',
    },
  ], []);

  // Statistics data
  const stats = useMemo(() => [
    {
      label: 'Total Players',
      value: '24',
      change: '+3 this week',
      trend: 'up',
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Practice Plans',
      value: '12',
      change: '+2 this month',
      trend: 'up',
      icon: BookOpen,
      color: 'green',
    },
    {
      label: 'Games Played',
      value: '8',
      change: '2 wins',
      trend: 'up',
      icon: Trophy,
      color: 'yellow',
    },
    {
      label: 'AI Insights',
      value: '15',
      change: '+5 today',
      trend: 'up',
      icon: Brain,
      color: 'purple',
    },
  ], []);

  // Recent activity data
  const recentActivity = useMemo(() => [
    {
      type: 'practice',
      title: 'Practice plan created',
      time: '2 hours ago',
      status: 'completed',
      icon: BookOpen,
    },
    {
      type: 'player',
      title: 'New player added',
      time: '4 hours ago',
      status: 'completed',
      icon: Users,
    },
    {
      type: 'game',
      title: 'Game scheduled',
      time: '1 day ago',
      status: 'pending',
      icon: Calendar,
    },
    {
      type: 'ai',
      title: 'AI analysis completed',
      time: '2 days ago',
      status: 'completed',
      icon: Brain,
    },
  ], []);

  // Upcoming events data
  const upcomingEvents = useMemo(() => [
    {
      title: 'Practice Session',
      time: 'Today, 4:00 PM',
      type: 'practice',
      color: 'green',
    },
    {
      title: 'Team Meeting',
      time: 'Tomorrow, 10:00 AM',
      type: 'meeting',
      color: 'blue',
    },
    {
      title: 'Game vs Eagles',
      time: 'Friday, 7:00 PM',
      type: 'game',
      color: 'red',
    },
  ], []);

  if (isLoading) {
    return (
      <Box p={6} bg={bgColor} minH="100vh">
        <VStack spacing={6} align="stretch">
          <Skeleton height="40px" />
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height="120px" />
            ))}
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            <Skeleton height="300px" />
            <Skeleton height="300px" />
          </SimpleGrid>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6} bg={bgColor} minH="100vh">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Flex align="center" justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="xl" color="gray.900">
              Welcome back, {profile?.displayName || 'Coach'}! 👋
            </Heading>
            <Text color="gray.600" fontSize="lg">
              Here's what's happening with your team today
            </Text>
          </VStack>
          <HStack spacing={3}>
            <IconButton
              aria-label="Search"
              icon={<Icon as={Search} />}
              variant="ghost"
              size="lg"
            />
            <IconButton
              aria-label="Notifications"
              icon={<Icon as={Bell} />}
              variant="ghost"
              size="lg"
            />
            <IconButton
              aria-label="Settings"
              icon={<Icon as={Settings} />}
              variant="ghost"
              size="lg"
            />
          </HStack>
        </Flex>

        {/* Statistics Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} delay={index * 100} />
          ))}
        </SimpleGrid>

        {/* Main Content Grid */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Quick Actions */}
          <AnimatedCard delay={400}>
            <CardHeader>
              <Flex align="center" justify="space-between">
                <Heading size="md">Quick Actions</Heading>
                <Button variant="ghost" size="sm" rightIcon={<Icon as={ArrowRight} />}>
                  View All
                </Button>
              </Flex>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={2} spacing={4}>
                {quickActions.map((action, index) => (
                  <QuickActionButton key={index} {...action} />
                ))}
              </SimpleGrid>
            </CardBody>
          </AnimatedCard>

          {/* Recent Activity */}
          <AnimatedCard delay={500}>
            <CardHeader>
              <Flex align="center" justify="space-between">
                <Heading size="md">Recent Activity</Heading>
                <Button variant="ghost" size="sm" rightIcon={<Icon as={ArrowRight} />}>
                  View All
                </Button>
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack spacing={0} align="stretch">
                {recentActivity.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))}
              </VStack>
            </CardBody>
          </AnimatedCard>
        </SimpleGrid>

        {/* Bottom Row */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Upcoming Events */}
          <AnimatedCard delay={600}>
            <CardHeader>
              <Heading size="md">Upcoming Events</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {upcomingEvents.map((event, index) => (
                  <HStack key={index} spacing={3} p={3} bg="gray.50" borderRadius="lg">
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bg={`${event.color}.500`}
                    />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="500" fontSize="sm">
                        {event.title}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {event.time}
                      </Text>
                    </VStack>
                    <Icon as={Clock} boxSize={4} color="gray.400" />
                  </HStack>
                ))}
              </VStack>
            </CardBody>
          </AnimatedCard>

          {/* Team Performance */}
          <AnimatedCard delay={700}>
            <CardHeader>
              <Heading size="md">Team Performance</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Overall Progress</Text>
                  <Text fontSize="sm" fontWeight="600" color="green.500">85%</Text>
                </HStack>
                <Progress value={85} colorScheme="green" size="lg" borderRadius="full" />
                
                <Divider />
                
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Skill Development</Text>
                  <Text fontSize="sm" fontWeight="600" color="blue.500">72%</Text>
                </HStack>
                <Progress value={72} colorScheme="blue" size="lg" borderRadius="full" />
                
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Team Chemistry</Text>
                  <Text fontSize="sm" fontWeight="600" color="purple.500">91%</Text>
                </HStack>
                <Progress value={91} colorScheme="purple" size="lg" borderRadius="full" />
              </VStack>
            </CardBody>
          </AnimatedCard>
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default ModernDashboard;
// @ts-nocheck
