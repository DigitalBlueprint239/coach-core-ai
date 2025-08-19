import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Card, CardBody, CardHeader, Button, Icon, Badge, useToast, useColorModeValue, SimpleGrid, Grid, GridItem, Flex, Spacer, Progress, Stat, StatLabel, StatNumber, StatHelpText, Tabs, TabList, TabPanels, Tab, TabPanel, Avatar, AvatarGroup, Tag, TagLabel, TagLeftIcon, TagRightIcon, useClipboard, IconButton, Tooltip, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Alert, AlertIcon, AlertTitle, AlertDescription,
} from '@chakra-ui/react';
import {
  Users, Calendar, Video, Heart, TrendingUp, Settings, Bell, Search, Filter, Download, Upload, Plus, Eye, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, Info, Clock, MapPin, Thermometer, Droplets, Wind, Sun, Moon, Star, Award, Rocket, Lightning, Cpu, Server, Network, Lock, Unlock, Key, Chart, PieChart, LineChart, AreaChart, ScatterChart, Filter as FilterIcon, Search as SearchIcon, FilterX as FilterXIcon, SortAsc as SortAscIcon, SortDesc as SortDescIcon, MoreVertical as MoreVerticalIcon, ChevronRight as ChevronRightIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, ArrowRight as ArrowRightIcon, ArrowUp as ArrowUpIcon, ArrowDown as ArrowDownIcon, Check as CheckIcon, X as XIcon, AlertCircle as AlertCircleIcon, HelpCircle as HelpCircleIcon, Brain, Workflow, Bell as BellIcon, Clock as ClockIcon, Target, Users as UsersIcon, Calendar as CalendarIcon, MapPin as MapPinIcon, Thermometer as ThermometerIcon, Droplets as DropletsIcon, Wind as WindIcon, Sun as SunIcon, Moon as MoonIcon, Star as StarIcon, Award as AwardIcon, Rocket as RocketIcon, Lightning as LightningIcon, Cpu as CpuIcon, Server as ServerIcon, Network as NetworkIcon, Lock as LockIcon, Unlock as UnlockIcon, Key as KeyIcon, Chart as ChartIcon, PieChart as PieChartIcon, LineChart as LineChartIcon, AreaChart as AreaChartIcon, ScatterChart as ScatterChartIcon, Filter as FilterIcon, Search as SearchIcon, FilterX as FilterXIcon, SortAsc as SortAscIcon, SortDesc as SortDescIcon, MoreVertical as MoreVerticalIcon, ChevronRight as ChevronRightIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, ArrowRight as ArrowRightIcon, ArrowUp as ArrowUpIcon, ArrowDown as ArrowDownIcon, Check as CheckIcon, X as XIcon, AlertCircle as AlertCircleIcon, HelpCircle as HelpCircleIcon, ArrowUp, ArrowDown,
} from 'lucide-react';

// **Head Coach Dashboard Component**
const HeadCoachDashboard: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [healthAlerts, setHealthAlerts] = useState<any[]>([]);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    // Load head coach specific data
    loadHeadCoachData();
  }, []);

  const loadHeadCoachData = async () => {
    // Simulate data loading
    setWeatherData({
      temperature: 72,
      condition: 'Sunny',
      humidity: 45,
      windSpeed: 8,
      riskLevel: 'low',
      recommendation: 'Practice can proceed outdoors as planned'
    });

    setTeamStats({
      totalPlayers: 24,
      activePlayers: 22,
      averageAge: 16.2,
      practiceAttendance: 92,
      gameRecord: '8-2',
      nextGame: 'Friday vs. Rivals'
    });

    setRecentVideos([
      { id: '1', title: 'Practice Highlights - Week 3', duration: '5:32', views: 45, uploaded: '2 hours ago' },
      { id: '2', title: 'Game Film - Last Friday', duration: '12:15', views: 67, uploaded: '1 day ago' }
    ]);

    setHealthAlerts([
      { player: 'Mike Johnson', issue: 'High heart rate during practice', severity: 'medium', time: '30 min ago' },
      { player: 'Sarah Williams', issue: 'Recovery time below normal', severity: 'low', time: '1 hour ago' }
    ]);
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      <Heading size="lg" color="gray.800" mb={6}>
        🏈 Head Coach Dashboard
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Team Size</StatLabel>
              <StatNumber color="blue.600">{teamStats?.totalPlayers || 0}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                {teamStats?.activePlayers || 0} active
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Practice Attendance</StatLabel>
              <StatNumber color="green.600">{teamStats?.practiceAttendance || 0}%</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                Excellent turnout
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Game Record</StatLabel>
              <StatNumber color="purple.600">{teamStats?.gameRecord || '0-0'}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                Next: {teamStats?.nextGame || 'TBD'}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Weather Risk</StatLabel>
              <StatNumber color={weatherData?.riskLevel === 'high' ? 'red' : weatherData?.riskLevel === 'medium' ? 'yellow' : 'green'}>
                {weatherData?.riskLevel?.toUpperCase() || 'LOW'}
              </StatNumber>
              <StatHelpText>
                {weatherData?.temperature}°F, {weatherData?.condition}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
        {/* Main Content */}
        <VStack spacing={6} align="stretch">
          {/* Weather-Aware Practice Planning */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <HStack>
                <Icon as={Thermometer} color="blue.500" />
                <Heading size="md" color="gray.800">Weather-Aware Practice Planning</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between" p={4} bg={cardBg} borderRadius="xl">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    Current Conditions
                  </Text>
                  <Badge colorScheme="green" variant="subtle">
                    {weatherData?.condition}
                  </Badge>
                </HStack>
                
                <HStack justify="space-between" p={4} bg={cardBg} borderRadius="xl">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    Temperature
                  </Text>
                  <Text color="gray.800">{weatherData?.temperature}°F</Text>
                </HStack>
                
                <HStack justify="space-between" p={4} bg={cardBg} borderRadius="xl">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    Practice Recommendation
                  </Text>
                  <Text color="gray.800" fontSize="sm">{weatherData?.recommendation}</Text>
                </HStack>
                
                <Button leftIcon={<Icon as={Calendar} />} colorScheme="blue" size="lg" borderRadius="xl">
                  Plan Practice Session
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Recent Videos */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <HStack>
                <Icon as={Video} color="purple.500" />
                <Heading size="md" color="gray.800">Recent Videos</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {recentVideos.map((video) => (
                  <HStack key={video.id} p={3} bg={cardBg} borderRadius="lg" justify="space-between">
                    <Box>
                      <Text fontWeight="semibold" color="gray.800">{video.title}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {video.duration} • {video.views} views • {video.uploaded}
                      </Text>
                    </Box>
                    <HStack spacing={2}>
                      <Button size="sm" variant="ghost" leftIcon={<Icon as={Eye} />}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" leftIcon={<Icon as={Edit} />}>
                        Edit
                      </Button>
                    </HStack>
                  </HStack>
                ))}
                <Button leftIcon={<Icon as={Plus} />} variant="outline" size="lg" borderRadius="xl">
                  Upload New Video
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Sidebar */}
        <VStack spacing={6} align="stretch">
          {/* Health Alerts */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <HStack>
                <Icon as={Heart} color="red.500" />
                <Heading size="sm" color="gray.800">Health Alerts</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {healthAlerts.map((alert, index) => (
                  <Box key={index} p={3} bg={cardBg} borderRadius="lg">
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                        {alert.player}
                      </Text>
                      <Badge 
                        colorScheme={alert.severity === 'high' ? 'red' : alert.severity === 'medium' ? 'yellow' : 'green'}
                        size="sm"
                      >
                        {alert.severity}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.600" mb={2}>
                      {alert.issue}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {alert.time}
                    </Text>
                  </Box>
                ))}
                <Button size="sm" variant="ghost" leftIcon={<Icon as={Eye} />}>
                  View All Alerts
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <Heading size="sm" color="gray.800">Quick Actions</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Button leftIcon={<Icon as={Users} />} colorScheme="blue" size="sm" borderRadius="xl">
                  Manage Roster
                </Button>
                <Button leftIcon={<Icon as={Calendar} />} colorScheme="green" size="sm" borderRadius="xl">
                  Schedule Practice
                </Button>
                <Button leftIcon={<Icon as={Video} />} colorScheme="purple" size="sm" borderRadius="xl">
                  Review Film
                </Button>
                <Button leftIcon={<Icon as={Chart} />} colorScheme="orange" size="sm" borderRadius="xl">
                  Team Analytics
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Grid>
    </Box>
  );
};

// **Assistant Coach Dashboard Component**
const AssistantCoachDashboard: React.FC = () => {
  const [drillStations, setDrillStations] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [playerProgress, setPlayerProgress] = useState<any[]>([]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadAssistantCoachData();
  }, []);

  const loadAssistantCoachData = async () => {
    setDrillStations([
      { id: '1', name: 'Passing Drills', players: 8, status: 'active', duration: '15 min' },
      { id: '2', name: 'Tackling Practice', players: 6, status: 'active', duration: '20 min' },
      { id: '3', name: 'Speed Training', players: 10, status: 'upcoming', duration: '10 min' }
    ]);

    setAttendance([
      { player: 'Mike Johnson', status: 'present', time: '3:00 PM', health: 'good' },
      { player: 'Sarah Williams', status: 'present', time: '3:02 PM', health: 'monitoring' },
      { player: 'Alex Brown', status: 'absent', time: 'N/A', health: 'N/A' }
    ]);

    setPlayerProgress([
      { player: 'Mike Johnson', skill: 'Passing', improvement: '+15%', trend: 'up' },
      { player: 'Sarah Williams', skill: 'Tackling', improvement: '+8%', trend: 'up' },
      { player: 'Alex Brown', skill: 'Speed', improvement: '+12%', trend: 'up' }
    ]);
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      <Heading size="lg" color="gray.800" mb={6}>
        🏃‍♂️ Assistant Coach Dashboard
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Active Stations</StatLabel>
              <StatNumber color="green.600">{drillStations.filter(s => s.status === 'active').length}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                {drillStations.length} total
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Attendance</StatLabel>
              <StatNumber color="blue.600">{attendance.filter(a => a.status === 'present').length}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                {attendance.length} expected
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Health Monitoring</StatLabel>
              <StatNumber color="orange.600">{attendance.filter(a => a.health === 'monitoring').length}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowDown} color="red.500" boxSize={4} />
                Players to watch
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Avg Progress</StatLabel>
              <StatNumber color="purple.600">+12%</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                This week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
        {/* Main Content */}
        <VStack spacing={6} align="stretch">
          {/* Drill Station Management */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <HStack>
                <Icon as={Target} color="green.500" />
                <Heading size="md" color="gray.800">Drill Station Management</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {drillStations.map((station) => (
                  <HStack key={station.id} p={4} bg={cardBg} borderRadius="lg" justify="space-between">
                    <Box>
                      <Text fontWeight="semibold" color="gray.800">{station.name}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {station.players} players • {station.duration}
                      </Text>
                    </Box>
                    <HStack spacing={2}>
                      <Badge 
                        colorScheme={station.status === 'active' ? 'green' : 'yellow'}
                        variant="subtle"
                      >
                        {station.status}
                      </Badge>
                      <Button size="sm" variant="ghost" leftIcon={<Icon as={Eye} />}>
                        Monitor
                      </Button>
                    </HStack>
                  </HStack>
                ))}
                <Button leftIcon={<Icon as={Plus} />} variant="outline" size="lg" borderRadius="xl">
                  Add New Station
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Player Progress Tracking */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <HStack>
                <Icon as={TrendingUp} color="blue.500" />
                <Heading size="md" color="gray.800">Player Progress</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {playerProgress.map((progress, index) => (
                  <HStack key={index} p={3} bg={cardBg} borderRadius="lg" justify="space-between">
                    <Box>
                      <Text fontWeight="semibold" color="gray.800">{progress.player}</Text>
                      <Text fontSize="sm" color="gray.600">{progress.skill}</Text>
                    </Box>
                    <HStack spacing={2}>
                      <Text color="green.600" fontWeight="semibold">{progress.improvement}</Text>
                      <Icon 
                        as={progress.trend === 'up' ? ArrowUp : ArrowDown} 
                        color={progress.trend === 'up' ? 'green.500' : 'red.500'}
                        boxSize={4}
                      />
                    </HStack>
                  </HStack>
                ))}
                <Button leftIcon={<Icon as={Chart} />} variant="outline" size="sm" borderRadius="xl">
                  View Detailed Progress
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Sidebar */}
        <VStack spacing={6} align="stretch">
          {/* Attendance QR Scanner */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <Heading size="sm" color="gray.800">Attendance Scanner</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Box p={4} bg={cardBg} borderRadius="lg" textAlign="center">
                  <Icon as={Search} boxSize={8} color="blue.500" mb={2} />
                  <Text fontSize="sm" color="gray.600">Scan QR Code</Text>
                  <Text fontSize="xs" color="gray.500">or enter player ID</Text>
                </Box>
                <Button leftIcon={<Icon as={Plus} />} colorScheme="blue" size="lg" borderRadius="xl">
                  Manual Entry
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardHeader>
              <Heading size="sm" color="gray.800">Quick Actions</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Button leftIcon={<Icon as={Bell} />} colorScheme="green" size="sm" borderRadius="xl">
                  Send Alert
                </Button>
                <Button leftIcon={<Icon as={Download} />} colorScheme="blue" size="sm" borderRadius="xl">
                  Export Report
                </Button>
                <Button leftIcon={<Icon as={Users} />} colorScheme="purple" size="sm" borderRadius="xl">
                  Player Check-in
                </Button>
                <Button leftIcon={<Icon as={Heart} />} colorScheme="orange" size="sm" borderRadius="xl">
                  Health Check
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Grid>
    </Box>
  );
};

// **Main Role-Based Dashboard Component**
const RoleBasedDashboard: React.FC = () => {
  const [userRole, setUserRole] = useState<string>('head-coach');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const roles = [
    { id: 'head-coach', name: 'Head Coach', icon: Users, color: 'blue' },
    { id: 'assistant-coach', name: 'Assistant Coach', icon: Target, color: 'green' },
    { id: 'player', name: 'Player', icon: Star, color: 'purple' },
    { id: 'parent', name: 'Parent/Guardian', icon: Heart, color: 'red' },
    { id: 'athletic-director', name: 'Athletic Director', icon: Award, color: 'orange' },
    { id: 'team-manager', name: 'Team Manager', icon: Settings, color: 'gray' }
  ];

  const renderDashboard = () => {
    switch (userRole) {
      case 'head-coach':
        return <HeadCoachDashboard />;
      case 'assistant-coach':
        return <AssistantCoachDashboard />;
      case 'player':
        return <Box p={6} textAlign="center"><Text>Player Dashboard - Coming Soon</Text></Box>;
      case 'parent':
        return <Box p={6} textAlign="center"><Text>Parent Dashboard - Coming Soon</Text></Box>;
      case 'athletic-director':
        return <Box p={6} textAlign="center"><Text>Athletic Director Dashboard - Coming Soon</Text></Box>;
      case 'team-manager':
        return <Box p={6} textAlign="center"><Text>Team Manager Dashboard - Coming Soon</Text></Box>;
      default:
        return <HeadCoachDashboard />;
    }
  };

  const currentRole = roles.find(r => r.id === userRole);

  return (
    <Box>
      {/* Role Selector Header */}
      <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} p={4}>
        <HStack justify="space-between" maxW="8xl" mx="auto">
          <HStack spacing={4}>
            <Icon as={currentRole?.icon} color={`${currentRole?.color}.500`} boxSize={6} />
            <Text fontWeight="semibold" color="gray.800">
              {currentRole?.name} Dashboard
            </Text>
          </HStack>
          
          <Button
            leftIcon={<Icon as={Settings} />}
            variant="outline"
            size="sm"
            onClick={() => setIsRoleModalOpen(true)}
            borderRadius="xl"
          >
            Change Role
          </Button>
        </HStack>
      </Box>

      {/* Dashboard Content */}
      {renderDashboard()}

      {/* Role Selection Modal */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} size="md">
        <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.300" />
        <ModalContent bg={bgColor} borderRadius="2xl" shadow="2xl" border="1px" borderColor={borderColor}>
          <ModalHeader>Select Your Role</ModalHeader>
          <ModalBody>
            <SimpleGrid columns={2} spacing={4}>
              {roles.map((role) => (
                <Button
                  key={role.id}
                  leftIcon={<Icon as={role.icon} />}
                  colorScheme={role.id === userRole ? role.color : 'gray'}
                  variant={role.id === userRole ? 'solid' : 'outline'}
                  size="lg"
                  height="80px"
                  flexDirection="column"
                  onClick={() => {
                    setUserRole(role.id);
                    setIsRoleModalOpen(false);
                  }}
                  borderRadius="xl"
                >
                  <Text fontSize="sm" fontWeight="bold" mb={1}>
                    {role.name}
                  </Text>
                </Button>
              ))}
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default RoleBasedDashboard;
