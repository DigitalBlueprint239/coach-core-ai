import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Icon,
  Heading,
  Flex,
  Grid,
  Avatar,
  AvatarGroup,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import {
  Brain,
  Users,
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Award,
  Zap,
  Play,
  Settings,
  Bell,
  MessageCircle,
  BarChart3,
  Activity,
  Crown,
  Shield,
  Sparkles,
  Rocket,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PersonalizedDashboardProps {
  userRole: 'player' | 'coach' | 'parent';
  teamName: string;
  userName: string;
}

const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({
  userRole,
  teamName,
  userName
}) => {
  const { theme } = useTheme();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with real data from Firebase
  const mockData = {
    player: {
      stats: {
        gamesPlayed: 12,
        winRate: 0.75,
        performance: 0.82,
        attendance: 0.95
      },
      achievements: [
        { id: 1, title: 'First Goal', icon: Trophy, color: 'yellow' },
        { id: 2, title: 'Perfect Attendance', icon: Star, color: 'green' },
        { id: 3, title: 'Team Player', icon: Users, color: 'blue' }
      ],
      upcomingEvents: [
        { id: 1, type: 'practice', time: 'Today, 3:00 PM', title: 'Team Practice' },
        { id: 2, type: 'game', time: 'Friday, 7:00 PM', title: 'vs. Eagles' }
      ]
    },
    coach: {
      teamStats: {
        totalPlayers: 45,
        activePlayers: 42,
        winRate: 0.78,
        practiceAttendance: 0.92
      },
      recentActivity: [
        { id: 1, type: 'play', title: 'Created new play', time: '2 hours ago' },
        { id: 2, type: 'practice', title: 'Scheduled practice', time: '1 day ago' }
      ]
    },
    parent: {
      childStats: {
        gamesAttended: 10,
        practices: 15,
        improvement: 0.15
      },
      upcomingEvents: [
        { id: 1, type: 'game', time: 'Friday, 7:00 PM', title: 'Home Game' },
        { id: 2, type: 'practice', time: 'Saturday, 9:00 AM', title: 'Extra Practice' }
      ]
    }
  };

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleSpecificContent = () => {
    switch (userRole) {
      case 'player':
        return <PlayerDashboard data={mockData.player} />;
      case 'coach':
        return <CoachDashboard data={mockData.coach} />;
      case 'parent':
        return <ParentDashboard data={mockData.parent} />;
      default:
        return <PlayerDashboard data={mockData.player} />;
    }
  };

  if (isLoading) {
    return (
      <Box className="team-gradient-hero" minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <VStack spacing={6}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Icon as={Brain} w={12} h={12} color="white" />
            </motion.div>
            <Text color="white" fontSize="xl" fontWeight="bold">
              Loading your personalized experience...
            </Text>
          </VStack>
        </motion.div>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="var(--team-surface-50)">
      {/* Hero Section */}
      <Box 
        className="team-gradient-hero"
        position="relative"
        overflow="hidden"
        py={20}
        px={8}
      >
        {/* Animated background elements */}
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            background: [
              'radial-gradient(circle at 20% 80%, var(--team-primary) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 20%, var(--team-accent) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 80%, var(--team-primary) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        
        <Box position="relative" zIndex={1} maxW="7xl" mx="auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <VStack spacing={6} textAlign="center">
              <HStack spacing={4}>
                <Avatar 
                  size="lg" 
                  name={teamName}
                  bg="var(--team-primary)"
                  color="white"
                  className="team-glow"
                />
                <VStack align="start" spacing={1}>
                  <Text color="white" fontSize="2xl" fontWeight="bold">
                    {teamName}
                  </Text>
                  <Badge colorScheme="whiteAlpha" variant="solid">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Badge>
                </VStack>
              </HStack>
              
              <Heading 
                size="2xl" 
                color="white" 
                className="team-glow-text"
                fontWeight="extrabold"
              >
                {getGreeting()}, {userName}! 👋
              </Heading>
              
              <Text color="whiteAlpha.900" fontSize="lg" maxW="2xl">
                Welcome to your personalized {teamName} experience. 
                Everything is tailored just for you.
              </Text>
              
              <HStack spacing={4} mt={4}>
                <Button
                  leftIcon={<Icon as={Rocket} />}
                  size="lg"
                  bg="white"
                  color="var(--team-primary)"
                  _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                  className="team-glow"
                >
                  Get Started
                </Button>
                <Button
                  leftIcon={<Icon as={Settings} />}
                  size="lg"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.300"
                  _hover={{ bg: 'whiteAlpha.100' }}
                >
                  Customize
                </Button>
              </HStack>
            </VStack>
          </motion.div>
        </Box>
      </Box>

      {/* Main Content */}
      <Box maxW="7xl" mx="auto" px={8} py={12}>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {getRoleSpecificContent()}
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
};

// Player Dashboard Component
const PlayerDashboard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <VStack spacing={8} align="stretch">
      {/* Quick Stats */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={6}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="team-gradient-card" p={6}>
            <Stat>
              <StatLabel color="var(--team-text-secondary)">Games Played</StatLabel>
              <StatNumber color="var(--team-text-primary)" fontSize="3xl">
                {data.stats.gamesPlayed}
              </StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                23.36%
              </StatHelpText>
            </Stat>
          </Card>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="team-gradient-card" p={6}>
            <Stat>
              <StatLabel color="var(--team-text-secondary)">Win Rate</StatLabel>
              <StatNumber color="var(--team-text-primary)" fontSize="3xl">
                {(data.stats.winRate * 100).toFixed(0)}%
              </StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                8.5%
              </StatHelpText>
            </Stat>
          </Card>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="team-gradient-card" p={6}>
            <Stat>
              <StatLabel color="var(--team-text-secondary)">Performance</StatLabel>
              <StatNumber color="var(--team-text-primary)" fontSize="3xl">
                {(data.stats.performance * 100).toFixed(0)}%
              </StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                12.3%
              </StatHelpText>
            </Stat>
          </Card>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="team-gradient-card" p={6}>
            <Stat>
              <StatLabel color="var(--team-text-secondary)">Attendance</StatLabel>
              <StatNumber color="var(--team-text-primary)" fontSize="3xl">
                {(data.stats.attendance * 100).toFixed(0)}%
              </StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                5.2%
              </StatHelpText>
            </Stat>
          </Card>
        </motion.div>
      </Grid>

      {/* Achievements and Upcoming Events */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={8}>
        <Card className="team-gradient-card">
          <CardHeader>
            <HStack>
              <Icon as={Trophy} color="var(--team-primary)" />
              <Heading size="md">Recent Achievements</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {data.achievements.map((achievement: any) => (
                <motion.div
                  key={achievement.id}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <HStack p={3} bg="var(--team-surface-100)" borderRadius="md">
                    <Icon as={achievement.icon} color={`${achievement.color}.500`} />
                    <Text fontWeight="medium">{achievement.title}</Text>
                  </HStack>
                </motion.div>
              ))}
            </VStack>
          </CardBody>
        </Card>

        <Card className="team-gradient-card">
          <CardHeader>
            <HStack>
              <Icon as={Calendar} color="var(--team-primary)" />
              <Heading size="md">Upcoming Events</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {data.upcomingEvents.map((event: any) => (
                <motion.div
                  key={event.id}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <HStack p={3} bg="var(--team-surface-100)" borderRadius="md">
                    <Icon 
                      as={event.type === 'practice' ? Clock : Play} 
                      color="var(--team-accent)" 
                    />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="medium">{event.title}</Text>
                      <Text fontSize="sm" color="var(--team-text-secondary)">
                        {event.time}
                      </Text>
                    </VStack>
                  </HStack>
                </motion.div>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </Grid>
    </VStack>
  );
};

// Coach Dashboard Component
const CoachDashboard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <VStack spacing={8} align="stretch">
      {/* Team Overview */}
      <Card className="team-gradient-card">
        <CardHeader>
          <HStack>
            <Icon as={Users} color="var(--team-primary)" />
            <Heading size="md">Team Overview</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={6}>
            <Stat>
              <StatLabel>Total Players</StatLabel>
              <StatNumber>{data.teamStats.totalPlayers}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Active Players</StatLabel>
              <StatNumber>{data.teamStats.activePlayers}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Win Rate</StatLabel>
              <StatNumber>{(data.teamStats.winRate * 100).toFixed(0)}%</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Practice Attendance</StatLabel>
              <StatNumber>{(data.teamStats.practiceAttendance * 100).toFixed(0)}%</StatNumber>
            </Stat>
          </Grid>
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="team-gradient-card" p={6} textAlign="center">
            <Icon as={Brain} w={12} h={12} color="var(--team-primary)" mb={4} />
            <Heading size="md" mb={2}>Create Play</Heading>
            <Text color="var(--team-text-secondary)" mb={4}>
              Design new plays with AI assistance
            </Text>
            <Button className="team-gradient-button" size="sm">
              Get Started
            </Button>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="team-gradient-card" p={6} textAlign="center">
            <Icon as={Calendar} w={12} h={12} color="var(--team-accent)" mb={4} />
            <Heading size="md" mb={2}>Schedule Practice</Heading>
            <Text color="var(--team-text-secondary)" mb={4}>
              Plan and organize team practices
            </Text>
            <Button className="team-gradient-button" size="sm">
              Schedule
            </Button>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="team-gradient-card" p={6} textAlign="center">
            <Icon as={BarChart3} w={12} h={12} color="var(--team-secondary)" mb={4} />
            <Heading size="md" mb={2}>Analytics</Heading>
            <Text color="var(--team-text-secondary)" mb={4}>
              View detailed team performance
            </Text>
            <Button className="team-gradient-button" size="sm">
              View Reports
            </Button>
          </Card>
        </motion.div>
      </Grid>
    </VStack>
  );
};

// Parent Dashboard Component
const ParentDashboard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <VStack spacing={8} align="stretch">
      {/* Child Progress */}
      <Card className="team-gradient-card">
        <CardHeader>
          <HStack>
            <Icon as={TrendingUp} color="var(--team-primary)" />
            <Heading size="md">Child's Progress</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
            <Stat>
              <StatLabel>Games Attended</StatLabel>
              <StatNumber>{data.childStats.gamesAttended}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Practices</StatLabel>
              <StatNumber>{data.childStats.practices}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Improvement</StatLabel>
              <StatNumber>+{(data.childStats.improvement * 100).toFixed(0)}%</StatNumber>
            </Stat>
          </Grid>
        </CardBody>
      </Card>

      {/* Upcoming Events */}
      <Card className="team-gradient-card">
        <CardHeader>
          <HStack>
            <Icon as={Calendar} color="var(--team-primary)" />
            <Heading size="md">Upcoming Events</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {data.upcomingEvents.map((event: any) => (
              <HStack key={event.id} p={3} bg="var(--team-surface-100)" borderRadius="md">
                <Icon as={event.type === 'game' ? Trophy : Clock} color="var(--team-accent)" />
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontWeight="medium">{event.title}</Text>
                  <Text fontSize="sm" color="var(--team-text-secondary)">
                    {event.time}
                  </Text>
                </VStack>
                <Button size="sm" variant="outline">
                  Details
                </Button>
              </HStack>
            ))}
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default PersonalizedDashboard; 