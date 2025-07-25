import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
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
  SimpleGrid,
  Heading,
  Container,
  useColorModeValue,
  Flex,
  Spacer,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Grid,
  GridItem,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import {
  User,
  BarChart3,
  BookOpen,
  MessageCircle,
  Settings,
  Search,
  CirclePlay,
  Brain,
  Shield,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  Bell,
  Sparkles,
  AlertTriangle,
  ThumbsUp,
  Star,
  Filter,
  Download,
  Target,
  Activity,
  Calendar,
  Mail,
  MessageSquare,
  Smartphone,
  Play,
  Trophy,
  ChevronRight,
  Plus,
  MoreVertical,
  Zap,
  Route,
  Square,
  Edit3,
  Trash2,
  Save,
  Grid as GridIcon,
  List as ListIcon,
  Upload,
  FileText,
  Camera,
  Video,
  Send,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Globe,
  Heart,
  Gift,
  DollarSign,
  Monitor,
  Headphones,
  HelpCircle,
  Bug,
  Lightbulb,
  RotateCcw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Menu as MenuIcon,
  Flag,
  Home
} from 'lucide-react';

// Mock data for sophisticated football coaching features
const mockTeamData = {
  name: "Wildcats Varsity",
  sport: "Football",
  season: "Fall 2024",
  players: 45,
  coaches: 8,
  nextPractice: "Today, 3:00 PM",
  upcomingGame: "Friday vs. Eagles",
  recentPlays: [
    { id: 1, name: "Shotgun Pass Right", successRate: 0.78, lastUsed: "2 days ago", type: "pass" },
    { id: 2, name: "I-Form Run Left", successRate: 0.65, lastUsed: "1 week ago", type: "run" },
    { id: 3, name: "Wildcat Formation", successRate: 0.82, lastUsed: "3 days ago", type: "special" }
  ],
  playerStats: [
    { name: "QB - Johnson", position: "QB", performance: 0.85, status: "Active", recentTrend: "+12%" },
    { name: "RB - Smith", position: "RB", performance: 0.78, status: "Active", recentTrend: "+8%" },
    { name: "WR - Davis", position: "WR", performance: 0.72, status: "Injured", recentTrend: "-5%" }
  ],
  teamMetrics: {
    winRate: 0.78,
    offensiveEfficiency: 342,
    defensiveRating: 15.2,
    practiceAttendance: 0.94,
    redZoneEfficiency: 0.68,
    turnoverMargin: 12
  }
};

const mockAISuggestions = [
  {
    id: 1,
    type: "Practice Plan",
    title: "Focus on Passing Game",
    confidence: 0.89,
    reasoning: "Based on opponent's weak secondary (ranks 8th in conference) and your QB's recent 78% completion rate on deep balls",
    action: "Generate Practice Plan",
    priority: "high"
  },
  {
    id: 2,
    type: "Play Design",
    title: "Counter to Blitz Package",
    confidence: 0.76,
    reasoning: "Opponent shows 60% blitz rate on 3rd down. Your QB has struggled against pressure (45% completion rate)",
    action: "Design Play",
    priority: "medium"
  },
  {
    id: 3,
    type: "Player Development",
    title: "WR Route Running",
    confidence: 0.82,
    reasoning: "Davis needs work on deep routes based on recent game film. Only 3/8 deep ball attempts completed",
    action: "Create Drill",
    priority: "high"
  }
];

const mockRecentActivity = [
  { id: 1, type: "practice", title: "Practice Plan Generated", time: "2 hours ago", status: "completed" },
  { id: 2, type: "play", title: "New Play Added: Counter Blitz", time: "4 hours ago", status: "completed" },
  { id: 3, type: "analytics", title: "Game Film Analyzed", time: "1 day ago", status: "completed" },
  { id: 4, type: "roster", title: "Player Status Updated", time: "2 days ago", status: "pending" }
];

// AI Practice Planner Component with Real Functionality
const AIPracticePlanner = () => {
  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const toast = useToast();

  const generatePracticePlan = async () => {
    setGenerating(true);
    // Simulate sophisticated AI analysis
    setTimeout(() => {
      const plan = {
        focus: "Passing Game & Red Zone Efficiency",
        duration: "2 hours 15 minutes",
        intensity: "High",
        drills: [
          { name: "QB Accuracy Drills", duration: "30 min", focus: "Deep ball accuracy", aiReasoning: "QB Johnson shows 78% completion rate on deep balls vs opponent's weak secondary" },
          { name: "WR Route Running", duration: "45 min", focus: "Crisp cuts and timing", aiReasoning: "Davis needs work on deep routes - only 3/8 attempts completed recently" },
          { name: "Red Zone Scenarios", duration: "45 min", focus: "End zone efficiency", aiReasoning: "Team red zone efficiency at 68% - need to improve to 75%+" },
          { name: "Blitz Recognition", duration: "15 min", focus: "Pressure handling", aiReasoning: "Opponent blitzes 60% on 3rd down - QB needs better recognition" }
        ],
        aiInsights: [
          "Opponent's secondary ranks 8th in conference (allowing 245 passing yards/game)",
          "Your QB has 78% completion rate on deep balls (vs 45% against pressure)",
          "Red zone efficiency improved 15% this season but still below target",
          "WR Davis shows 0.3s slower release on deep routes vs film from 2 weeks ago"
        ],
        recommendations: [
          "Focus 70% of practice on passing game",
          "Include 3 blitz recognition scenarios",
          "Add 15 minutes of red zone work",
          "Individual QB session for pressure handling"
        ]
      };
      
      setCurrentPlan(plan);
      setGenerating(false);
      
      toast({
        title: "AI Practice Plan Generated!",
        description: "AI analyzed 47 data points to create this optimized plan.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }, 3000);
  };

  return (
    <Card>
      <CardHeader>
        <Flex align="center" justify="space-between">
          <HStack>
            <Icon as={Brain} color="purple.500" />
            <Heading size="md">AI Practice Planner</Heading>
          </HStack>
          <Badge colorScheme="purple">AI Powered</Badge>
        </Flex>
      </CardHeader>
      <CardBody>
        {!currentPlan ? (
          <VStack spacing={4}>
            <Text color="gray.600" textAlign="center">
              Generate intelligent practice plans based on your team's performance, 
              upcoming opponents, and player development needs.
            </Text>
            <Button
              leftIcon={<Sparkles />}
              colorScheme="purple"
              size="lg"
              onClick={generatePracticePlan}
              isLoading={generating}
              loadingText="AI Analyzing 47 Data Points..."
            >
              Generate Practice Plan
            </Button>
          </VStack>
        ) : (
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontWeight="bold" color="purple.600">Focus: {currentPlan.focus}</Text>
              <Text fontSize="sm" color="gray.600">Duration: {currentPlan.duration} • Intensity: {currentPlan.intensity}</Text>
            </Box>
            
            <Divider />
            
            <Box>
              <Text fontWeight="semibold" mb={2}>AI-Recommended Drills:</Text>
              {currentPlan.drills.map((drill, index) => (
                <Box key={index} p={3} bg="gray.50" borderRadius="md" mb={2}>
                  <Text fontWeight="medium">{drill.name}</Text>
                  <Text fontSize="sm" color="gray.600">{drill.duration} • {drill.focus}</Text>
                  <Text fontSize="xs" color="purple.600" mt={1}>AI: {drill.aiReasoning}</Text>
                </Box>
              ))}
            </Box>
            
            <Box>
              <Text fontWeight="semibold" mb={2}>AI Insights:</Text>
              {currentPlan.aiInsights.map((insight, index) => (
                <Text key={index} fontSize="sm" color="gray.700" mb={1}>
                  • {insight}
                </Text>
              ))}
            </Box>
            
            <Box>
              <Text fontWeight="semibold" mb={2}>Recommendations:</Text>
              {currentPlan.recommendations.map((rec, index) => (
                <Text key={index} fontSize="sm" color="blue.600" mb={1}>
                  • {rec}
                </Text>
              ))}
            </Box>
            
            <Button
              leftIcon={<Download />}
              variant="outline"
              colorScheme="purple"
            >
              Export Plan
            </Button>
          </VStack>
        )}
      </CardBody>
    </Card>
  );
};

// Smart Playbook Component with Interactive Features
const SmartPlaybook = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedPlay, setSelectedPlay] = useState(null);

  return (
    <>
      <Card cursor="pointer" onClick={onOpen} _hover={{ shadow: "lg" }}>
        <CardHeader>
          <Flex align="center" justify="space-between">
            <HStack>
              <Icon as={Route} color="blue.500" />
              <Heading size="md">Smart Playbook</Heading>
            </HStack>
            <Badge colorScheme="blue">Interactive</Badge>
          </Flex>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <Box textAlign="center">
              <Icon as={CirclePlay} size="48px" color="blue.500" mb={2} />
              <Text fontWeight="semibold">Interactive Play Designer</Text>
              <Text fontSize="sm" color="gray.600">
                Design, visualize, and analyze plays with AI assistance
              </Text>
            </Box>
            
            <Box w="full">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Recent Plays:</Text>
              {mockTeamData.recentPlays.map((play) => (
                <Flex key={play.id} justify="space-between" align="center" p={2} bg="gray.50" borderRadius="md" mb={1}>
                  <Text fontSize="sm">{play.name}</Text>
                  <Badge colorScheme={play.successRate > 0.7 ? "green" : "orange"}>
                    {(play.successRate * 100).toFixed(0)}%
                  </Badge>
                </Flex>
              ))}
            </Box>
            
            <Button
              leftIcon={<Play />}
              colorScheme="blue"
              size="sm"
              w="full"
            >
              Open Play Designer
            </Button>
          </VStack>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Smart Playbook Designer</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs>
              <TabList>
                <Tab>Field Designer</Tab>
                <Tab>Play Library</Tab>
                <Tab>AI Suggestions</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Box
                    w="full"
                    h="400px"
                    bg="green.100"
                    borderRadius="lg"
                    border="2px dashed"
                    borderColor="green.300"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                    position="relative"
                  >
                    <Icon as={CirclePlay} size="64px" color="green.600" mb={4} />
                    <Text fontSize="lg" fontWeight="semibold" color="green.700">
                      Interactive Football Field
                    </Text>
                    <Text fontSize="sm" color="green.600" textAlign="center">
                      Drag and drop players, draw routes, and design plays<br/>
                      with AI-powered suggestions and analysis
                    </Text>
                    
                    {/* Simulated field elements */}
                    <Box position="absolute" top="20%" left="20%" bg="white" p={2} borderRadius="md" border="2px solid" borderColor="blue.500">
                      <Text fontSize="xs" fontWeight="bold">QB</Text>
                    </Box>
                    <Box position="absolute" top="30%" left="40%" bg="white" p={2} borderRadius="md" border="2px solid" borderColor="red.500">
                      <Text fontSize="xs" fontWeight="bold">WR</Text>
                    </Box>
                    <Box position="absolute" top="50%" left="30%" bg="white" p={2} borderRadius="md" border="2px solid" borderColor="green.500">
                      <Text fontSize="xs" fontWeight="bold">RB</Text>
                    </Box>
                  </Box>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    {mockTeamData.recentPlays.map((play) => (
                      <Card key={play.id} p={4}>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">{play.name}</Text>
                            <Text fontSize="sm" color="gray.600">Last used: {play.lastUsed}</Text>
                          </VStack>
                          <HStack>
                            <Badge colorScheme={play.successRate > 0.7 ? "green" : "orange"}>
                              {(play.successRate * 100).toFixed(0)}%
                            </Badge>
                            <IconButton size="sm" icon={<Edit3 />} aria-label="Edit play" />
                          </HStack>
                        </Flex>
                      </Card>
                    ))}
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    {mockAISuggestions.filter(s => s.type === "Play Design").map((suggestion) => (
                      <Alert key={suggestion.id} status="info">
                        <AlertIcon />
                        <Box>
                          <AlertTitle>{suggestion.title}</AlertTitle>
                          <AlertDescription>{suggestion.reasoning}</AlertDescription>
                        </Box>
                      </Alert>
                    ))}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

// Advanced Team Analytics Dashboard
const TeamAnalytics = () => {
  return (
    <Card>
      <CardHeader>
        <Flex align="center" justify="space-between">
          <HStack>
            <Icon as={TrendingUp} color="green.500" />
            <Heading size="md">Team Analytics</Heading>
          </HStack>
          <Badge colorScheme="green">Live Data</Badge>
        </Flex>
      </CardHeader>
      <CardBody>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <Stat>
            <StatLabel>Win Rate</StatLabel>
            <StatNumber>{(mockTeamData.teamMetrics.winRate * 100).toFixed(0)}%</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              12% from last season
            </StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Offensive Efficiency</StatLabel>
            <StatNumber>{mockTeamData.teamMetrics.offensiveEfficiency}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              Yards per game
            </StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Defensive Rating</StatLabel>
            <StatNumber>{mockTeamData.teamMetrics.defensiveRating}</StatNumber>
            <StatHelpText>
              <StatArrow type="decrease" />
              Points allowed per game
            </StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Practice Attendance</StatLabel>
            <StatNumber>{(mockTeamData.teamMetrics.practiceAttendance * 100).toFixed(0)}%</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              This week
            </StatHelpText>
          </Stat>
        </Grid>
        
        <Box mt={4}>
          <Text fontWeight="semibold" mb={2}>Player Performance Trends:</Text>
          {mockTeamData.playerStats.map((player, index) => (
            <Flex key={index} justify="space-between" align="center" p={2} bg="gray.50" borderRadius="md" mb={1}>
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="medium">{player.name}</Text>
                <Text fontSize="xs" color="gray.600">{player.position}</Text>
              </VStack>
              <HStack>
                <Text fontSize="sm" fontWeight="medium">{(player.performance * 100).toFixed(0)}%</Text>
                <Badge colorScheme={player.status === "Active" ? "green" : "red"}>
                  {player.status}
                </Badge>
                <Text fontSize="xs" color={player.recentTrend.includes('+') ? "green.500" : "red.500"}>
                  {player.recentTrend}
                </Text>
              </HStack>
            </Flex>
          ))}
        </Box>
      </CardBody>
    </Card>
  );
};

// AI Suggestions Panel with Priority Levels
const AISuggestions = () => {
  return (
    <Card>
      <CardHeader>
        <Flex align="center" justify="space-between">
          <HStack>
            <Icon as={Zap} color="orange.500" />
            <Heading size="md">AI Insights</Heading>
          </HStack>
          <Badge colorScheme="orange">Real-time</Badge>
        </Flex>
      </CardHeader>
      <CardBody>
        <VStack spacing={3} align="stretch">
          {mockAISuggestions.map((suggestion) => (
            <Box key={suggestion.id} p={3} border="1px" borderColor="gray.200" borderRadius="md">
              <Flex justify="space-between" align="start" mb={2}>
                <Text fontWeight="semibold" color="orange.600">{suggestion.title}</Text>
                <HStack>
                  <Badge colorScheme="orange">{(suggestion.confidence * 100).toFixed(0)}%</Badge>
                  <Badge colorScheme={suggestion.priority === "high" ? "red" : "yellow"}>
                    {suggestion.priority}
                  </Badge>
                </HStack>
              </Flex>
              <Text fontSize="sm" color="gray.600" mb={2}>{suggestion.reasoning}</Text>
              <Button size="sm" colorScheme="orange" variant="outline">
                {suggestion.action}
              </Button>
            </Box>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};

// Recent Activity Feed
const RecentActivity = () => {
  return (
    <Card>
      <CardHeader>
        <Heading size="md">Recent Activity</Heading>
      </CardHeader>
      <CardBody>
        <VStack spacing={3} align="stretch">
          {mockRecentActivity.map((activity) => (
            <Flex key={activity.id} justify="space-between" align="center" p={2} bg="gray.50" borderRadius="md">
              <HStack>
                <Icon 
                  as={activity.type === "practice" ? Brain : activity.type === "play" ? Route : activity.type === "analytics" ? BarChart3 : Users} 
                  color="blue.500" 
                  size={16} 
                />
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="medium">{activity.title}</Text>
                  <Text fontSize="xs" color="gray.600">{activity.time}</Text>
                </VStack>
              </HStack>
              <Badge colorScheme={activity.status === "completed" ? "green" : "yellow"}>
                {activity.status}
              </Badge>
            </Flex>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};

// Main Dashboard Component
const FootballCoachingDashboard = () => {
  const toast = useToast();

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" px={6} py={4}>
        <Flex justify="space-between" align="center">
          <HStack>
            <Icon as={CirclePlay} color="blue.600" boxSize={8} />
            <VStack align="start" spacing={0}>
              <Heading size="lg" color="blue.600">{mockTeamData.name}</Heading>
              <Text fontSize="sm" color="gray.600">{mockTeamData.sport} • {mockTeamData.season}</Text>
            </VStack>
          </HStack>
          
          <HStack spacing={4}>
            <HStack>
              <Icon as={Users} color="gray.500" />
              <Text fontSize="sm">{mockTeamData.players} Players</Text>
            </HStack>
            <HStack>
              <Icon as={Trophy} color="gray.500" />
              <Text fontSize="sm">{mockTeamData.coaches} Coaches</Text>
            </HStack>
            <IconButton
              icon={<Bell />}
              variant="ghost"
              aria-label="Notifications"
            />
            <IconButton
              icon={<Settings />}
              variant="ghost"
              aria-label="Settings"
            />
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box p={6}>
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
          {/* Left Column - Main Features */}
          <VStack spacing={6} align="stretch">
            <AIPracticePlanner />
            <SmartPlaybook />
            <TeamAnalytics />
          </VStack>
          
          {/* Right Column - Sidebar */}
          <VStack spacing={6} align="stretch">
            <AISuggestions />
            <RecentActivity />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <Heading size="md">Quick Actions</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3}>
                  <Button leftIcon={<Calendar />} colorScheme="blue" size="sm" w="full">
                    Schedule Practice
                  </Button>
                  <Button leftIcon={<Users />} colorScheme="green" size="sm" w="full">
                    Manage Roster
                  </Button>
                  <Button leftIcon={<Video />} colorScheme="purple" size="sm" w="full">
                    Review Film
                  </Button>
                  <Button leftIcon={<MessageCircle />} colorScheme="orange" size="sm" w="full">
                    Team Chat
                  </Button>
                </VStack>
              </CardBody>
            </Card>
            
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <Heading size="md">Upcoming</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <Text fontWeight="semibold" color="blue.700">Practice</Text>
                    <Text fontSize="sm" color="blue.600">{mockTeamData.nextPractice}</Text>
                  </Box>
                  <Box p={3} bg="red.50" borderRadius="md">
                    <Text fontWeight="semibold" color="red.700">Game</Text>
                    <Text fontSize="sm" color="red.600">{mockTeamData.upcomingGame}</Text>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </Grid>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ChakraProvider>
      <FootballCoachingDashboard />
    </ChakraProvider>
  );
}

export default App;

