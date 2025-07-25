import React, { useState, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Heading,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Progress,
  Spinner,
  useToast,
  Grid,
  GridItem,
  Flex,
  Icon,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Avatar,
  AvatarGroup,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
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
  TabPanel
} from '@chakra-ui/react';
import { 
  Sparkles, 
  AlertTriangle, 
  ThumbsUp, 
  Star, 
  Filter, 
  Download, 
  Users, 
  Target, 
  Activity, 
  Calendar, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Bell, 
  Settings,
  Play,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
  Plus,
  Search,
  MoreVertical,
  Football,
  Zap,
  Brain,
  Shield,
  Route,
  Square,
  User,
  Edit3,
  Trash2,
  Save,
  Grid as GridIcon,
  List,
  Upload,
  FileText,
  Camera,
  Video,
  MessageCircle,
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

// Mock data for demonstration
const mockTeamData = {
  name: "Wildcats Varsity",
  sport: "Football",
  season: "Fall 2024",
  players: 45,
  coaches: 8,
  nextPractice: "Today, 3:00 PM",
  upcomingGame: "Friday vs. Eagles",
  recentPlays: [
    { id: 1, name: "Shotgun Pass Right", successRate: 0.78, lastUsed: "2 days ago" },
    { id: 2, name: "I-Form Run Left", successRate: 0.65, lastUsed: "1 week ago" },
    { id: 3, name: "Wildcat Formation", successRate: 0.82, lastUsed: "3 days ago" }
  ],
  playerStats: [
    { name: "QB - Johnson", position: "QB", performance: 0.85, status: "Active" },
    { name: "RB - Smith", position: "RB", performance: 0.78, status: "Active" },
    { name: "WR - Davis", position: "WR", performance: 0.72, status: "Injured" }
  ]
};

const mockAISuggestions = [
  {
    id: 1,
    type: "Practice Plan",
    title: "Focus on Passing Game",
    confidence: 0.89,
    reasoning: "Based on opponent's weak secondary and your QB's recent performance",
    action: "Generate Practice Plan"
  },
  {
    id: 2,
    type: "Play Design",
    title: "Counter to Blitz Package",
    confidence: 0.76,
    reasoning: "Opponent shows 60% blitz rate on 3rd down",
    action: "Design Play"
  },
  {
    id: 3,
    type: "Player Development",
    title: "WR Route Running",
    confidence: 0.82,
    reasoning: "Davis needs work on deep routes based on recent game film",
    action: "Create Drill"
  }
];

// AI Practice Planner Component
const AIPracticePlanner = () => {
  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const toast = useToast();

  const generatePracticePlan = async () => {
    setGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setCurrentPlan({
        focus: "Passing Game & Red Zone Efficiency",
        duration: "2 hours",
        drills: [
          { name: "QB Accuracy Drills", duration: "30 min", focus: "Deep ball accuracy" },
          { name: "WR Route Running", duration: "45 min", focus: "Crisp cuts and timing" },
          { name: "Red Zone Scenarios", duration: "45 min", focus: "End zone efficiency" }
        ],
        aiInsights: [
          "Opponent's secondary ranks 8th in conference",
          "Your QB has 78% completion rate on deep balls",
          "Red zone efficiency improved 15% this season"
        ]
      });
      setGenerating(false);
      toast({
        title: "Practice Plan Generated!",
        description: "AI has created an optimized practice plan based on your team's needs.",
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
              loadingText="AI Analyzing..."
            >
              Generate Practice Plan
            </Button>
          </VStack>
        ) : (
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontWeight="bold" color="purple.600">Focus: {currentPlan.focus}</Text>
              <Text fontSize="sm" color="gray.600">Duration: {currentPlan.duration}</Text>
            </Box>
            
            <Divider />
            
            <Box>
              <Text fontWeight="semibold" mb={2}>Drills:</Text>
              {currentPlan.drills.map((drill, index) => (
                <Box key={index} p={3} bg="gray.50" borderRadius="md" mb={2}>
                  <Text fontWeight="medium">{drill.name}</Text>
                  <Text fontSize="sm" color="gray.600">{drill.duration} • {drill.focus}</Text>
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

// Smart Playbook Component
const SmartPlaybook = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

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
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <Box textAlign="center">
              <Icon as={Football} size="48px" color="blue.500" mb={2} />
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
            >
              <Icon as={Football} size="64px" color="green.600" mb={4} />
              <Text fontSize="lg" fontWeight="semibold" color="green.700">
                Interactive Football Field
              </Text>
              <Text fontSize="sm" color="green.600" textAlign="center">
                Drag and drop players, draw routes, and design plays<br/>
                with AI-powered suggestions and analysis
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

// Team Analytics Dashboard
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
            <StatNumber>78%</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              12% from last season
            </StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Offensive Efficiency</StatLabel>
            <StatNumber>342</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              Yards per game
            </StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Defensive Rating</StatLabel>
            <StatNumber>15.2</StatNumber>
            <StatHelpText>
              <StatArrow type="decrease" />
              Points allowed per game
            </StatHelpText>
          </Stat>
          
          <Stat>
            <StatLabel>Practice Attendance</StatLabel>
            <StatNumber>94%</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              This week
            </StatHelpText>
          </Stat>
        </Grid>
        
        <Box mt={4}>
          <Text fontWeight="semibold" mb={2}>Top Performers:</Text>
          {mockTeamData.playerStats.map((player, index) => (
            <Flex key={index} justify="space-between" align="center" p={2} bg="gray.50" borderRadius="md" mb={1}>
              <Text fontSize="sm">{player.name}</Text>
              <Badge colorScheme={player.status === "Active" ? "green" : "red"}>
                {player.status}
              </Badge>
            </Flex>
          ))}
        </Box>
      </CardBody>
    </Card>
  );
};

// AI Suggestions Panel
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
                <Badge colorScheme="orange">{(suggestion.confidence * 100).toFixed(0)}%</Badge>
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

// Main Dashboard Component
const FootballCoachingDashboard = () => {
  const toast = useToast();

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" px={6} py={4}>
        <Flex justify="space-between" align="center">
          <HStack>
            <Icon as={Football} color="blue.600" boxSize={8} />
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

const App: React.FC = () => {
  return <FootballCoachingDashboard />;
};

export default App;

