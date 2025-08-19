import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Flex,
  Text,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  HStack,
  VStack,
  Icon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Avatar,
  AvatarGroup,
  Divider,
  SimpleGrid,
  IconButton,
  Tooltip,
  useToast,
  useBreakpointValue,
  Stack,
  Image,
  IconButton as ChakraIconButton,
  Spinner,
} from '@chakra-ui/react';
import { 
  RESPONSIVE_GRIDS, 
  RESPONSIVE_SPACING, 
  RESPONSIVE_FONTS, 
  RESPONSIVE_BUTTON_SIZES, 
  RESPONSIVE_ICON_SIZES,
  RESPONSIVE_HOVER,
  RESPONSIVE_ANIMATIONS,
  useResponsive 
} from '../../utils/responsive';
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  MoreVertical,
  Play,
  BookOpen,
  BarChart3,
  Settings,
  Bell,
  Brain,
  TestTube,
  Star,
  Trophy,
  Zap,
  Shield,
  Heart,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { dashboardService, DashboardStats, RecentActivity } from '../../services/dashboard/dashboard-service';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  href: string;
  gradient: string;
}

interface ModernDashboardProps {
  onViewChange?: (view: string) => void;
  userProfile?: any;
}

const ModernDashboard: React.FC<ModernDashboardProps> = ({ onViewChange, userProfile }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    activePractices: 0,
    completedSessions: 0,
    upcomingGames: 0,
    teamPerformance: 0,
    attendanceRate: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data when component mounts or user profile changes
  useEffect(() => {
    if (userProfile) {
      loadDashboardData();
    } else {
      // If no user profile, still try to load data with fallback
      loadDashboardData();
    }
  }, [userProfile]);

  const loadDashboardData = async () => {
    // Use teamId from user profile or fallback to demo data
    const teamId = userProfile?.teamId || 'demo-team';
    
    setIsLoading(true);
    try {
      // Use the production dashboard service
      const [teamStats, teamActivities] = await Promise.all([
        dashboardService.getTeamStats(teamId),
        dashboardService.getRecentActivities(teamId, 10)
      ]);
      
      setStats(teamStats);
      setRecentActivity(teamActivities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // The service now provides fallback data, so we don't need to set empty values
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Create Practice Plan',
      description: 'Design a new practice session',
      icon: Play,
      color: 'blue',
      href: '/practice-planner',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: '2',
      title: 'Design Play',
      description: 'Create a new play in the playbook',
      icon: BookOpen,
      color: 'green',
      href: '/playbook',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: '3',
      title: 'Manage Team',
      description: 'View roster and track attendance',
      icon: Users,
      color: 'purple',
      href: '/team-management',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      id: '4',
      title: 'AI Insights',
      description: 'Get AI-powered recommendations',
      icon: Brain,
      color: 'orange',
      href: '/ai-brain',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
    {
      id: '5',
      title: 'Test Features',
      description: 'Test all implemented features',
      icon: TestTube,
      color: 'teal',
      href: '/testing',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
  ];

  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'upcoming':
        return 'blue';
      case 'in-progress':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'upcoming':
        return Clock;
      case 'in-progress':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (onViewChange) {
      onViewChange(action.href.replace('/', ''));
    }
    toast({
      title: action.title,
      description: `Navigating to ${action.title}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Enhanced Logo component with stunning visuals
  const Logo = () => (
    <Flex align="center" justify="center" mb={12}>
      <Box
        position="relative"
        textAlign="center"
        p={12}
        borderRadius="3xl"
        bg="linear-gradient(135deg, rgba(0, 204, 204, 0.08) 0%, rgba(0, 153, 153, 0.04) 100%)"
        border="3px solid"
        borderColor="primary.200"
        backdropFilter="blur(20px)"
        boxShadow="0 25px 50px rgba(0, 204, 204, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
        _before={{
          content: '""',
          position: 'absolute',
          top: '-3px',
          left: '-3px',
          right: '-3px',
          bottom: '-3px',
          borderRadius: '3xl',
          background: 'linear-gradient(45deg, #00cccc, #009999, #006666, #00cccc, #00e6e6)',
          backgroundSize: '400% 400%',
          animation: 'gradient 4s ease infinite',
          zIndex: -1,
          opacity: 0.8,
        }}
        overflow="hidden"
      >
        {/* Animated background elements */}
        <Box
          position="absolute"
          top="-50%"
          left="-50%"
          w="200%"
          h="200%"
          bg="radial-gradient(circle, primary.400 0%, transparent 70%)"
          opacity="0.1"
          animation="pulse 6s ease-in-out infinite"
        />
        
        {/* Logo Icon with enhanced effects */}
        <Box
          w={28}
          h={28}
          bg="linear-gradient(135deg, primary.500 0%, primary.600 50%, primary.700 100%)"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          mx="auto"
          mb={8}
          boxShadow="0 25px 50px rgba(0, 204, 204, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            inset: '0',
            borderRadius: 'full',
            bg: 'radial-gradient(circle, primary.400 0%, transparent 70%)',
            opacity: 0.6,
          }}
          _after={{
            content: '""',
            position: 'absolute',
            inset: '2px',
            borderRadius: 'full',
            bg: 'radial-gradient(circle, primary.300 0%, transparent 70%)',
            opacity: 0.3,
          }}
        >
          <Box
            fontSize="6xl"
            fontWeight="900"
            color="white"
            textShadow="0 6px 12px rgba(0,0,0,0.4)"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
          >
            C
          </Box>
        </Box>
        
        {/* Enhanced Brand Name */}
        <Heading
          fontSize={{ base: '5xl', md: '6xl', lg: '7xl' }}
          fontWeight="900"
          bg="linear-gradient(135deg, primary.600 0%, primary.800 50%, primary.900 100%)"
          bgClip="text"
          letterSpacing="wider"
          mb={4}
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
        >
          COACH CORE
        </Heading>
        
        {/* Enhanced Tagline */}
        <Text
          fontSize={{ base: 'xl', md: '2xl' }}
          color="dark.600"
          fontWeight="600"
          letterSpacing="wide"
          maxW="700px"
          mx="auto"
          lineHeight="1.4"
          textShadow="0 1px 2px rgba(0,0,0,0.05)"
        >
          Your complete coaching platform for team management, practice planning, and strategic development
        </Text>
      </Box>
    </Flex>
  );

  // Enhanced Welcome Section with premium visuals
  const WelcomeSection = () => (
    <Card
      bg="linear-gradient(135deg, rgba(0, 204, 204, 0.06) 0%, rgba(0, 153, 153, 0.03) 100%)"
      border="2px solid"
      borderColor="primary.100"
      borderRadius="3xl"
      p={10}
      mb={10}
      position="relative"
      overflow="hidden"
      boxShadow="0 20px 40px rgba(0, 204, 204, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '6px',
        background: 'linear-gradient(90deg, primary.500, primary.400, primary.300, primary.500)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s linear infinite',
      }}
      _after={{
        content: '""',
        position: 'absolute',
        top: '20px',
        right: '20px',
        w: '100px',
        h: '100px',
        bg: 'radial-gradient(circle, primary.200 0%, transparent 70%)',
        borderRadius: 'full',
        opacity: 0.3,
        animation: 'pulse 4s ease-in-out infinite',
      }}
    >
      <Flex direction={{ base: 'column', md: 'row' }} align="center" justify="space-between">
        <VStack align={{ base: 'center', md: 'start' }} spacing={6}>
          <Heading
            fontSize={{ base: '3xl', md: '4xl' }}
            color="dark.800"
            fontWeight="800"
            textShadow="0 2px 4px rgba(0,0,0,0.1)"
          >
            Welcome back, {userProfile?.displayName || 'Coach'}! 🏈
          </Heading>
          <Text
            fontSize="xl"
            color="dark.600"
            textAlign={{ base: 'center', md: 'left' }}
            fontWeight="500"
            lineHeight="1.5"
          >
            Ready to take your team to the next level? Here's what's happening today.
          </Text>
        </VStack>
        
        <HStack spacing={6} mt={{ base: 6, md: 0 }}>
          <Button
            leftIcon={<Icon as={Bell} />}
            variant="brand-outline"
            size="lg"
            px={8}
            py={6}
            fontSize="lg"
            fontWeight="600"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: '0 15px 30px rgba(0, 204, 204, 0.3)',
            }}
          >
            Notifications
          </Button>
          <Button
            leftIcon={<Icon as={Settings} />}
            variant="brand-outline"
            size="lg"
            px={8}
            py={6}
            fontSize="lg"
            fontWeight="600"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: '0 15px 30px rgba(0, 204, 204, 0.3)',
            }}
          >
            Settings
          </Button>
        </HStack>
      </Flex>
    </Card>
  );

  // Enhanced Stats Grid with premium card designs
  const StatsGrid = () => (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} mb={10}>
      {[
        {
          label: 'Total Players',
          value: stats.totalPlayers,
          change: `${stats.totalPlayers > 0 ? '+2' : '0'} from last month`,
          changeType: 'increase',
          color: 'blue',
          gradient: 'linear(to-br, blue.400, blue.600)',
          icon: Users,
        },
        {
          label: 'Active Practices',
          value: stats.activePractices,
          change: `${stats.activePractices > 0 ? '3' : '0'} scheduled this week`,
          changeType: 'increase',
          color: 'green',
          gradient: 'linear(to-br, green.400, green.600)',
          icon: Calendar,
        },
        {
          label: 'Completed Sessions',
          value: stats.completedSessions,
          change: `${stats.completedSessions > 0 ? '+5' : '0'} this month`,
          changeType: 'increase',
          color: 'purple',
          gradient: 'linear(to-br, purple.400, purple.600)',
          icon: CheckCircle,
        },
        {
          label: 'Upcoming Games',
          value: stats.upcomingGames,
          change: `${stats.upcomingGames > 0 ? 'Next game in 3 days' : 'No games scheduled'}`,
          changeType: stats.upcomingGames > 0 ? 'increase' : 'neutral',
          color: 'orange',
          gradient: 'linear(to-br, orange.400, orange.600)',
          icon: Target,
        },
        {
          label: 'Team Performance',
          value: `${stats.teamPerformance}%`,
          change: `${stats.teamPerformance > 0 ? '+3%' : '0%'} from last week`,
          changeType: stats.teamPerformance > 0 ? 'increase' : 'neutral',
          color: 'teal',
          gradient: 'linear(to-br, teal.400, teal.600)',
          icon: TrendingUp,
        },
        {
          label: 'Attendance Rate',
          value: `${stats.attendanceRate}%`,
          change: `${stats.attendanceRate > 0 ? '+2%' : '0%'} improvement`,
          changeType: stats.attendanceRate > 0 ? 'increase' : 'neutral',
          color: 'pink',
          gradient: 'linear(to-br, pink.400, pink.600)',
          icon: Award,
        },
      ].map((stat, index) => (
        <Card
          key={index}
          bg="white"
          borderRadius="3xl"
          border="2px solid"
          borderColor="gray.100"
          p={8}
          transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          _hover={{
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1)',
            borderColor: `${stat.color}.200`,
          }}
          position="relative"
          overflow="hidden"
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: stat.gradient,
          }}
        >
          <Flex justify="space-between" align="start" mb={6}>
            <Box
              p={4}
              borderRadius="2xl"
              bg={stat.gradient}
              color="white"
              boxShadow="0 10px 20px rgba(0, 0, 0, 0.15)"
            >
              <Icon as={stat.icon} boxSize={7} />
            </Box>
          </Flex>
          
          <Stat>
            <StatNumber fontSize="4xl" fontWeight="800" color="dark.800" mb={2}>
              {stat.value}
            </StatNumber>
            <StatLabel fontSize="lg" color="dark.600" fontWeight="600" mb={2}>
              {stat.label}
            </StatLabel>
            <StatHelpText fontSize="sm" color="dark.500" fontWeight="500">
              {stat.change}
              {stat.changeType !== 'neutral' && (
                <Icon
                  as={stat.changeType === 'increase' ? ArrowUp : ArrowDown}
                  color={stat.changeType === 'increase' ? 'green.500' : 'red.500'}
                  boxSize={5}
                  ml={2}
                />
              )}
            </StatHelpText>
          </Stat>
        </Card>
      ))}
    </SimpleGrid>
  );

  // Enhanced Quick Actions Grid with premium designs
  const QuickActionsGrid = () => (
    <Box mb={10}>
      <Heading
        fontSize="3xl"
        fontWeight="800"
        color="dark.800"
        mb={8}
        textAlign="center"
        textShadow="0 2px 4px rgba(0,0,0,0.1)"
      >
        Quick Actions
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
        {quickActions.map((action) => (
          <Card
            key={action.id}
            bg="white"
            borderRadius="3xl"
            border="2px solid"
            borderColor="gray.100"
            p={8}
            cursor="pointer"
            transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            _hover={{
              transform: 'translateY(-10px) scale(1.03)',
              boxShadow: '0 35px 70px rgba(0, 0, 0, 0.2), 0 15px 30px rgba(0, 0, 0, 0.15)',
            }}
            onClick={() => handleQuickAction(action)}
            position="relative"
            overflow="hidden"
            _before={{
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: action.gradient,
            }}
          >
            <Box
              p={5}
              borderRadius="2xl"
              bg={action.gradient}
              mb={6}
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 15px 30px rgba(0, 0, 0, 0.2)"
            >
              <Icon as={action.icon} boxSize={9} color="white" />
            </Box>
            
            <Heading fontSize="xl" fontWeight="700" color="dark.800" mb={3} lineHeight="1.3">
              {action.title}
            </Heading>
            <Text fontSize="md" color="dark.600" lineHeight="1.6" mb={6}>
              {action.description}
            </Text>
            
            <Button
              size="lg"
              variant="brand-primary"
              w="full"
              py={6}
              fontSize="lg"
              fontWeight="600"
              rightIcon={<Icon as={ArrowRight} />}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '0 15px 30px rgba(0, 204, 204, 0.4)',
              }}
            >
              Get Started
            </Button>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );

  // Enhanced Recent Activity Section
  const RecentActivitySection = () => (
    <Card bg="white" borderRadius="3xl" border="2px solid" borderColor="gray.100" shadow="lg">
      <CardHeader>
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="gray.800" fontWeight="700">
            Recent Activity
          </Heading>
          <Button
            size="sm"
            variant="ghost"
            color="blue.500"
            _hover={{ bg: 'blue.50' }}
            onClick={() => onViewChange?.('practice-planner')}
          >
            View All
          </Button>
        </Flex>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <VStack spacing={4} align="center" py={8}>
            <Spinner size="lg" color="blue.500" />
            <Text color="gray.500">Loading recent activities...</Text>
          </VStack>
        ) : recentActivity.length > 0 ? (
          <VStack spacing={4} align="stretch">
            {recentActivity.slice(0, 5).map((activity) => (
              <Flex
                key={activity.id}
                p={4}
                bg="gray.50"
                borderRadius="xl"
                align="center"
                justify="space-between"
                _hover={{ bg: 'gray.100', transform: 'translateX(4px)' }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <Flex align="center" flex={1}>
                  <Box
                    p={2}
                    borderRadius="lg"
                    bg={getActivityColor(activity.type)}
                    color="white"
                    mr={4}
                  >
                    <Icon as={getActivityIcon(activity.type)} boxSize={4} />
                  </Box>
                  <Box flex={1}>
                    <Text fontWeight="600" color="gray.800" fontSize="sm">
                      {activity.title}
                    </Text>
                    <Text color="gray.600" fontSize="xs">
                      {activity.description}
                    </Text>
                  </Box>
                </Flex>
                <Flex align="center" gap={3}>
                  <Badge
                    colorScheme={getStatusColor(activity.status)}
                    variant="subtle"
                    fontSize="xs"
                  >
                    {activity.status}
                  </Badge>
                  <Badge
                    colorScheme={getPriorityColor(activity.priority)}
                    variant="outline"
                    fontSize="xs"
                  >
                    {activity.priority}
                  </Badge>
                  <Text color="gray.500" fontSize="xs" minW="60px" textAlign="right">
                    {formatActivityTime(activity.timestamp)}
                  </Text>
                </Flex>
              </Flex>
            ))}
          </VStack>
        ) : (
          <Box textAlign="center" py={8}>
            <Icon as={Calendar} boxSize={12} color="gray.300" mb={4} />
            <Text color="gray.500" fontSize="lg" fontWeight="500">
              No recent activities
            </Text>
            <Text color="gray.400" fontSize="sm">
              Start planning practices and games to see activity here
            </Text>
          </Box>
        )}
      </CardBody>
    </Card>
  );

  // Helper functions for activity display
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'practice': return 'blue.500';
      case 'game': return 'green.500';
      case 'assessment': return 'purple.500';
      case 'player': return 'orange.500';
      case 'team': return 'teal.500';
      default: return 'gray.500';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'practice': return Calendar;
      case 'game': return Target;
      case 'assessment': return BarChart3;
      case 'player': return Users;
      case 'team': return Award;
      default: return Calendar;
    }
  };

  // getStatusColor function already defined above

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const formatActivityTime = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  return (
    <Box 
      minH="100vh" 
      bg="linear-gradient(135deg, gray.50 0%, gray.100 100%)" 
      py={10}
      position="relative"
      overflow="hidden"
    >
      {/* Background decorative elements */}
      <Box
        position="absolute"
        top="10%"
        right="5%"
        w="300px"
        h="300px"
        bg="radial-gradient(circle, primary.200 0%, transparent 70%)"
        borderRadius="full"
        opacity="0.1"
        animation="pulse 8s ease-in-out infinite"
      />
      <Box
        position="absolute"
        bottom="20%"
        left="5%"
        w="200px"
        h="200px"
        bg="radial-gradient(circle, primary.300 0%, transparent 70%)"
        borderRadius="full"
        opacity="0.08"
        animation="pulse 6s ease-in-out infinite reverse"
      />
      
      <Box maxW="7xl" mx="auto" px={6} position="relative" zIndex={1}>
        {/* Logo and Brand Section */}
        <Logo />
        
        {/* Welcome Section */}
        <WelcomeSection />
        
        {/* Stats Grid */}
        <StatsGrid />
        
        {/* Quick Actions */}
        <QuickActionsGrid />
        
        {/* Recent Activity */}
        <RecentActivitySection />
      </Box>
      
      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.05); }
        }
      `}</style>
    </Box>
  );
};

export default ModernDashboard;
