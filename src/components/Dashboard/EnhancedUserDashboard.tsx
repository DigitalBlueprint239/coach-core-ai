// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  VStack,
  HStack,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useToast,
  Spinner,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import {
  mcpDashboardService,
  EnhancedDashboardStats,
  RealTimeNotification,
} from '../../services/mcp/mcp-dashboard-service';

interface AnalyticsData {
  playerEngagement: number[];
  practiceEffectiveness: number[];
  gamePerformanceTrend: number[];
  attendancePatterns: { day: string; rate: number }[];
}

interface EnhancedUserDashboardProps {
  teamId?: string;
  enableRealTime?: boolean;
  showAdvancedAnalytics?: boolean;
}

const EnhancedUserDashboard: React.FC<EnhancedUserDashboardProps> = ({
  teamId: propTeamId,
  enableRealTime = true,
  showAdvancedAnalytics = true,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [stats, setStats] = useState<EnhancedDashboardStats | null>(null);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const teamId = propTeamId || user?.teamId || 'demo-team';

  // Load initial data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [statsData, notificationsData, analyticsData] = await Promise.all([
        mcpDashboardService.getEnhancedTeamStats(teamId),
        mcpDashboardService.getRealTimeNotifications(teamId),
        showAdvancedAnalytics ? mcpDashboardService.getAdvancedAnalytics(teamId) : null,
      ]);
      
      setStats(statsData);
      setNotifications(notificationsData);
      if (analyticsData) {
        setAnalytics(analyticsData);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error Loading Dashboard',
        description: 'Some data may not be up to date. Please try refreshing.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [teamId, showAdvancedAnalytics, toast]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    
    toast({
      title: 'Dashboard Refreshed',
      description: 'All data has been updated.',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Set up real-time updates
  useEffect(() => {
    loadDashboardData();
    
    if (!enableRealTime) return;

    // Subscribe to real-time stats updates
    const unsubscribeStats = mcpDashboardService.subscribeToRealTimeUpdates(
      teamId,
      (updatedStats) => {
        setStats(updatedStats);
      }
    );

    // Subscribe to real-time notifications
    const unsubscribeNotifications = mcpDashboardService.subscribeToNotifications(
      teamId,
      (notification) => {
        setNotifications(prev => [notification, ...prev.slice(0, 9)]);
        
        // Show toast for high priority notifications
        if (notification.priority === 'high' || notification.priority === 'urgent') {
          toast({
            title: notification.title,
            description: notification.message,
            status: notification.type === 'error' ? 'error' : 'info',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    );

    return () => {
      unsubscribeStats();
      unsubscribeNotifications();
    };
  }, [teamId, enableRealTime, loadDashboardData, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mcpDashboardService.cleanup();
    };
  }, []);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading your dashboard...</Text>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Dashboard Unavailable</AlertTitle>
          <AlertDescription>
            Unable to load dashboard data. Please try again later.
          </AlertDescription>
        </Alert>
      </Box>
    );
  }

  const getStatColor = (change: number) => {
    if (change > 0) return 'green';
    if (change < 0) return 'red';
    return 'gray';
  };

  const getPriorityBadgeColor = (priority: RealTimeNotification['priority']) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <Box p={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Team Dashboard</Heading>
        <Button
          leftIcon={<Icon as={() => <span>🔄</span>} />}
          onClick={handleRefresh}
          isLoading={refreshing}
          loadingText="Refreshing"
          variant="outline"
          size="sm"
        >
          Refresh
        </Button>
      </Flex>

      {/* Main Stats Grid */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={() => <span>👥</span>} />
                  <Text>Total Players</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{stats.totalPlayers}</StatNumber>
              <StatHelpText>
                <StatArrow type={stats.trends.playersChange >= 0 ? 'increase' : 'decrease'} />
                {Math.abs(stats.trends.playersChange)} this month
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={() => <span>⚡</span>} />
                  <Text>Active Practices</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{stats.activePractices}</StatNumber>
              <StatHelpText>
                <Text color="gray.500">Ongoing sessions</Text>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={() => <span>🎯</span>} />
                  <Text>Team Performance</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{stats.teamPerformance}%</StatNumber>
              <StatHelpText>
                <StatArrow type={stats.trends.performanceChange >= 0 ? 'increase' : 'decrease'} />
                {Math.abs(stats.trends.performanceChange)}% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={() => <span>📅</span>} />
                  <Text>Attendance Rate</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{stats.attendanceRate}%</StatNumber>
              <StatHelpText>
                <StatArrow type={stats.trends.attendanceChange >= 0 ? 'increase' : 'decrease'} />
                {Math.abs(stats.trends.attendanceChange)}% this month
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Real-time Metrics */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={6} mb={8}>
        <Card>
          <CardHeader>
            <Heading size="md">
              <HStack>
                <Icon as={() => <span>📊</span>} />
                <Text>Real-time Activity</Text>
              </HStack>
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Text>Active Users</Text>
                <Badge colorScheme="green">{stats.realTimeMetrics.activeUsers}</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text>Ongoing Practices</Text>
                <Badge colorScheme="blue">{stats.realTimeMetrics.ongoingPractices}</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text>Live Notifications</Text>
                <Badge colorScheme="orange">{stats.realTimeMetrics.liveNotifications}</Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">
              <HStack>
                <Icon as={() => <span>📈</span>} />
                <Text>Predictions</Text>
              </HStack>
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.500">Next Game Win Probability</Text>
                <Progress value={stats.predictions.nextGameWinProbability} colorScheme="green" />
                <Text fontSize="sm" mt={1}>{stats.predictions.nextGameWinProbability}%</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">Expected Attendance</Text>
                <Progress value={stats.predictions.expectedAttendance} colorScheme="blue" />
                <Text fontSize="sm" mt={1}>{stats.predictions.expectedAttendance}%</Text>
              </Box>
              <HStack justify="space-between">
                <Text fontSize="sm">Performance Trend</Text>
                <Badge colorScheme={getStatColor(stats.trends.performanceChange)}>
                  {stats.predictions.performanceTrend}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">
              <HStack>
                <Icon as={() => <span>🔔</span>} />
                <Text>Recent Notifications</Text>
              </HStack>
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3} maxH="200px" overflowY="auto">
              {notifications.slice(0, 5).map((notification) => (
                <Box key={notification.id} p={3} borderRadius="md" bg="gray.50">
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="semibold">
                      {notification.title}
                    </Text>
                    <Badge colorScheme={getPriorityBadgeColor(notification.priority)} size="sm">
                      {notification.priority}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.600">
                    {notification.message}
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {notification.timestamp.toLocaleTimeString()}
                  </Text>
                </Box>
              ))}
              {notifications.length === 0 && (
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  No recent notifications
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Grid>

      {/* Advanced Analytics */}
      {showAdvancedAnalytics && analytics && (
        <Card>
          <CardHeader>
            <Heading size="md">
              <HStack>
                <Icon as={() => <span>📊</span>} />
                <Text>Advanced Analytics</Text>
              </HStack>
            </Heading>
          </CardHeader>
          <CardBody>
            <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={3}>Player Engagement Trend</Text>
                <Box h="100px" bg="gray.50" borderRadius="md" p={4} display="flex" alignItems="end" justifyContent="space-between">
                  {analytics.playerEngagement.slice(-10).map((value: number, index: number) => (
                    <Box
                      key={index}
                      bg="blue.400"
                      width="8px"
                      height={`${value}%`}
                      borderRadius="sm"
                    />
                  ))}
                </Box>
              </Box>
              
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={3}>Attendance Patterns</Text>
                <VStack align="stretch" spacing={2}>
                  {analytics.attendancePatterns.slice(0, 4).map((pattern) => (
                    <HStack key={pattern.day} justify="space-between">
                      <Text fontSize="sm">{pattern.day}</Text>
                      <HStack>
                        <Progress value={pattern.rate} size="sm" width="60px" />
                        <Text fontSize="sm" width="40px">{pattern.rate}%</Text>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </Grid>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default EnhancedUserDashboard;
// @ts-nocheck
