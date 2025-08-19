import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Button,
  Icon,
  Badge,
  Input,
  Textarea,
  Select,
  useToast,
  useColorModeValue,
  SimpleGrid,
  Grid,
  GridItem,
  Flex,
  Spinner,
  Center,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  ListIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  IconButton,
  Tooltip,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import {
  Brain,
  Lightbulb,
  TrendingUp,
  Target,
  Users,
  Clock,
  Award,
  Zap,
  BookOpen,
  Play,
  Calendar,
  BarChart3,
  Plus,
  Save,
  Download,
  Share,
  Edit,
  Trash2,
  Eye,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Search,
  Filter,
  RefreshCw,
  Settings,
  User,
  Shield,
  Sword,
  Heart,
  Activity,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'performance' | 'strategy' | 'health' | 'tactical';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  createdAt: Date;
  isImplemented: boolean;
  priority: number;
  tags: string[];
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'practice' | 'game' | 'training' | 'recovery';
  confidence: number;
  expectedOutcome: string;
  implementationSteps: string[];
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isAccepted: boolean;
  createdAt: Date;
}

interface TeamPerformance {
  overallScore: number;
  offense: number;
  defense: number;
  specialTeams: number;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: Date;
}

interface PlayerInsight {
  playerId: string;
  playerName: string;
  position: string;
  performance: number;
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
  lastAssessment: Date;
}

const AIBrainDashboard: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance>({
    overallScore: 78,
    offense: 82,
    defense: 75,
    specialTeams: 70,
    trend: 'improving',
    lastUpdated: new Date(),
  });
  const [playerInsights, setPlayerInsights] = useState<PlayerInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  
  const { isOpen: isInsightModalOpen, onOpen: onInsightModalOpen, onClose: onInsightModalClose } = useDisclosure();
  const { isOpen: isRecommendationModalOpen, onOpen: onRecommendationModalOpen, onClose: onRecommendationModalClose } = useDisclosure();
  
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Sample insights
  const sampleInsights: AIInsight[] = [
    {
      id: '1',
      type: 'performance',
      title: 'Defensive Line Gap Control',
      description: 'Analysis shows defensive linemen are consistently getting pushed out of their gaps, leading to 23% of opponent rushing yards. Recommend focusing on hand placement and leverage drills.',
      confidence: 87,
      impact: 'high',
      category: 'Defense',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      isImplemented: false,
      priority: 1,
      tags: ['defense', 'line', 'gaps', 'rushing'],
    },
    {
      id: '2',
      type: 'strategy',
      title: 'Third Down Conversion Optimization',
      description: 'Current third down conversion rate is 34%. AI analysis suggests implementing more play-action passes on 3rd and short situations could improve this to 42%.',
      confidence: 92,
      impact: 'high',
      category: 'Offense',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      isImplemented: true,
      priority: 2,
      tags: ['offense', 'third-down', 'play-action', 'conversion'],
    },
    {
      id: '3',
      type: 'health',
      title: 'Recovery Time Optimization',
      description: 'Player fatigue analysis indicates optimal recovery periods between high-intensity sessions should be 48-72 hours instead of current 24-36 hours.',
      confidence: 78,
      impact: 'medium',
      category: 'Health & Fitness',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      isImplemented: false,
      priority: 3,
      tags: ['health', 'recovery', 'fatigue', 'optimization'],
    },
  ];

  // Sample recommendations
  const sampleRecommendations: AIRecommendation[] = [
    {
      id: '1',
      title: 'Implement Gap Control Drills',
      description: 'Focus on defensive line technique with specific drills targeting hand placement, leverage, and gap responsibility.',
      type: 'practice',
      confidence: 89,
      expectedOutcome: 'Reduce opponent rushing yards by 15-20% within 3 weeks',
      implementationSteps: [
        'Schedule 20-minute gap control session twice per week',
        'Use blocking sleds and dummies for realistic scenarios',
        'Implement video review of gap control during games',
        'Track gap control success rate weekly',
      ],
      estimatedTime: 20,
      difficulty: 'medium',
      isAccepted: false,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Enhanced Play-Action Package',
      description: 'Develop 3-4 new play-action concepts specifically designed for 3rd and short situations.',
      type: 'game',
      confidence: 91,
      expectedOutcome: 'Improve 3rd down conversion rate from 34% to 42%',
      implementationSteps: [
        'Design 3-4 new play-action routes',
        'Practice timing and execution 3 times per week',
        'Implement in scrimmage situations',
        'Use in games starting week 3',
      ],
      estimatedTime: 30,
      difficulty: 'hard',
      isAccepted: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  // Sample player insights
  const samplePlayerInsights: PlayerInsight[] = [
    {
      playerId: '1',
      playerName: 'Mike Johnson',
      position: 'QB',
      performance: 85,
      trend: 'improving',
      recommendations: [
        'Continue working on deep ball accuracy',
        'Focus on pocket presence under pressure',
        'Improve decision-making on 3rd down',
      ],
      lastAssessment: new Date(),
    },
    {
      playerId: '2',
      playerName: 'David Smith',
      position: 'MLB',
      performance: 72,
      trend: 'declining',
      recommendations: [
        'Increase speed and agility training',
        'Focus on pass coverage skills',
        'Improve tackling technique in open field',
      ],
      lastAssessment: new Date(),
    },
  ];

  useEffect(() => {
    setInsights(sampleInsights);
    setRecommendations(sampleRecommendations);
    setPlayerInsights(samplePlayerInsights);
  }, []);

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const newInsight: AIInsight = {
        id: Date.now().toString(),
        type: 'performance',
        title: 'New AI-Generated Insight',
        description: 'This is a newly generated insight based on recent performance data and AI analysis.',
        confidence: Math.floor(Math.random() * 30) + 70, // 70-100
        impact: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
        category: 'AI Analysis',
        createdAt: new Date(),
        isImplemented: false,
        priority: Math.floor(Math.random() * 5) + 1,
        tags: ['ai-generated', 'performance'],
      };
      
      setInsights(prev => [newInsight, ...prev]);
      setIsGenerating(false);
      
      toast({
        title: 'New Insight Generated',
        description: 'AI has analyzed your team data and generated a new insight',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }, 2000);
  };

  const handleAcceptRecommendation = (recommendationId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === recommendationId ? { ...rec, isAccepted: true } : rec
      )
    );
    
    toast({
      title: 'Recommendation Accepted',
      description: 'This recommendation has been added to your implementation plan',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleImplementInsight = (insightId: string) => {
    setInsights(prev => 
      prev.map(insight => 
        insight.id === insightId ? { ...insight, isImplemented: true } : insight
      )
    );
    
    toast({
      title: 'Insight Implemented',
      description: 'This insight has been marked as implemented',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return Activity;
      case 'strategy': return Brain;
      case 'health': return Heart;
      case 'tactical': return Target;
      default: return Info;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingUp;
      case 'stable': return TrendingUp;
      default: return TrendingUp;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'green';
      case 'declining': return 'red';
      case 'stable': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Box minH="100vh" bg={bgColor} p={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg" color="brand.600">
            AI Brain Dashboard
          </Heading>
          <Text color="gray.600" fontSize="sm">
            AI-powered insights and recommendations for your coaching decisions
          </Text>
        </VStack>
        
        <HStack spacing={4}>
          <Button
            leftIcon={<Icon as={RefreshCw} />}
            variant="outline"
            colorScheme="brand"
            onClick={() => window.location.reload()}
          >
            Refresh Data
          </Button>
          <Button
            leftIcon={<Icon as={Brain} />}
            colorScheme="brand"
            variant="gradient"
            isLoading={isGenerating}
            loadingText="Analyzing..."
            onClick={handleGenerateInsights}
          >
            Generate Insights
          </Button>
        </HStack>
      </Flex>

      {/* Performance Overview */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                Overall Performance
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="bold" color="brand.600">
                {teamPerformance.overallScore}%
              </StatNumber>
              <StatHelpText color={getTrendColor(teamPerformance.trend)} fontSize="sm">
                <Icon as={teamPerformance.trend === 'improving' ? ArrowUp : ArrowDown} color={getTrendColor(teamPerformance.trend)} boxSize={4} />
                {teamPerformance.trend}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                Offense
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="bold" color="green.600">
                {teamPerformance.offense}%
              </StatNumber>
              <StatHelpText color="green.500" fontSize="sm">
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +3% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                Defense
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="bold" color="blue.600">
                {teamPerformance.defense}%
              </StatNumber>
              <StatHelpText color="red.500" fontSize="sm">
                <Icon as={ArrowDown} color="red.500" boxSize={4} />
                -2% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                Special Teams
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="bold" color="purple.600">
                {teamPerformance.specialTeams}%
              </StatNumber>
              <StatHelpText color="green.500" fontSize="sm">
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +5% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Tabs variant="enclosed" colorScheme="brand" mb={6}>
        <TabList>
          <Tab>AI Insights</Tab>
          <Tab>Recommendations</Tab>
          <Tab>Player Analysis</Tab>
          <Tab>AI Chat</Tab>
        </TabList>
        
        <TabPanels>
          {/* AI Insights Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="md" color="gray.800">
                  AI-Generated Insights ({insights.length})
                </Heading>
                <Badge colorScheme="blue" variant="subtle">
                  {insights.filter(i => !i.isImplemented).length} Pending
                </Badge>
              </Flex>
              
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {insights.map((insight) => (
                  <Card
                    key={insight.id}
                    variant="elevated"
                    bg={cardBg}
                    border="1px"
                    borderColor={borderColor}
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg',
                    }}
                    transition="all 0.2s"
                    cursor="pointer"
                    onClick={() => {
                      setSelectedInsight(insight);
                      onInsightModalOpen();
                    }}
                  >
                    <CardHeader pb={2}>
                      <VStack align="start" spacing={2}>
                        <Flex justify="space-between" align="center" w="full">
                          <HStack spacing={2}>
                            <Icon as={getTypeIcon(insight.type)} boxSize={5} color="brand.500" />
                            <Heading size="sm" color="gray.800">
                              {insight.title}
                            </Heading>
                          </HStack>
                          <Badge colorScheme={getImpactColor(insight.impact)} variant="solid">
                            {insight.impact.toUpperCase()}
                          </Badge>
                        </Flex>
                        
                        <HStack spacing={2}>
                          <Badge colorScheme="blue" variant="subtle">
                            {insight.category}
                          </Badge>
                          <Badge colorScheme="green" variant="subtle">
                            {insight.confidence}% confidence
                          </Badge>
                          <Badge colorScheme="orange" variant="subtle">
                            Priority {insight.priority}
                          </Badge>
                        </HStack>
                      </VStack>
                    </CardHeader>
                    
                    <CardBody pt={0}>
                      <VStack spacing={3} align="start">
                        <Text fontSize="sm" color="gray.600" noOfLines={3}>
                          {insight.description}
                        </Text>
                        
                        <HStack spacing={2} w="full" justify="space-between">
                          <Text fontSize="xs" color="gray.500">
                            {insight.createdAt.toLocaleDateString()}
                          </Text>
                          
                          <HStack spacing={2}>
                            {insight.isImplemented ? (
                              <Badge colorScheme="green" variant="subtle">
                                Implemented
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                colorScheme="brand"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImplementInsight(insight.id);
                                }}
                              >
                                Mark Implemented
                              </Button>
                            )}
                          </HStack>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </TabPanel>
          
          {/* Recommendations Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Heading size="md" color="gray.800">
                AI Recommendations ({recommendations.length})
              </Heading>
              
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {recommendations.map((recommendation) => (
                  <Card
                    key={recommendation.id}
                    variant="elevated"
                    bg={cardBg}
                    border="1px"
                    borderColor={borderColor}
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg',
                    }}
                    transition="all 0.2s"
                    cursor="pointer"
                    onClick={() => {
                      setSelectedRecommendation(recommendation);
                      onRecommendationModalOpen();
                    }}
                  >
                    <CardHeader pb={2}>
                      <VStack align="start" spacing={2}>
                        <Flex justify="space-between" align="center" w="full">
                          <Heading size="sm" color="gray.800">
                            {recommendation.title}
                          </Heading>
                          <Badge colorScheme={recommendation.isAccepted ? 'green' : 'blue'} variant="solid">
                            {recommendation.isAccepted ? 'Accepted' : 'New'}
                          </Badge>
                        </Flex>
                        
                        <HStack spacing={2}>
                          <Badge colorScheme="blue" variant="subtle">
                            {recommendation.type}
                          </Badge>
                          <Badge colorScheme="green" variant="subtle">
                            {recommendation.confidence}% confidence
                          </Badge>
                          <Badge colorScheme="orange" variant="subtle">
                            {recommendation.difficulty}
                          </Badge>
                        </HStack>
                      </VStack>
                    </CardHeader>
                    
                    <CardBody pt={0}>
                      <VStack spacing={3} align="start">
                        <Text fontSize="sm" color="gray.600" noOfLines={2}>
                          {recommendation.description}
                        </Text>
                        
                        <Box w="full">
                          <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={1}>
                            Expected Outcome:
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {recommendation.expectedOutcome}
                          </Text>
                        </Box>
                        
                        <HStack spacing={2} w="full" justify="space-between">
                          <HStack spacing={1}>
                            <Icon as={Clock} boxSize={4} />
                            <Text fontSize="xs">{recommendation.estimatedTime} min</Text>
                          </HStack>
                          
                          {!recommendation.isAccepted && (
                            <Button
                              size="sm"
                              colorScheme="brand"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptRecommendation(recommendation.id);
                              }}
                            >
                              Accept
                            </Button>
                          )}
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </TabPanel>
          
          {/* Player Analysis Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Heading size="md" color="gray.800">
                Player Performance Insights ({playerInsights.length})
              </Heading>
              
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {playerInsights.map((player) => (
                  <Card
                    key={player.playerId}
                    variant="elevated"
                    bg={cardBg}
                    border="1px"
                    borderColor={borderColor}
                  >
                    <CardHeader pb={2}>
                      <VStack align="start" spacing={2}>
                        <Flex justify="space-between" align="center" w="full">
                          <Heading size="sm" color="gray.800">
                            {player.playerName}
                          </Heading>
                          <Badge colorScheme="blue" variant="subtle">
                            {player.position}
                          </Badge>
                        </Flex>
                        
                        <HStack spacing={2}>
                          <Badge colorScheme="green" variant="subtle">
                            {player.performance}% performance
                          </Badge>
                          <Badge colorScheme={getTrendColor(player.trend)} variant="subtle">
                            {player.trend}
                          </Badge>
                        </HStack>
                      </VStack>
                    </CardHeader>
                    
                    <CardBody pt={0}>
                      <VStack spacing={3} align="start">
                        <Box w="full">
                          <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={2}>
                            AI Recommendations:
                          </Text>
                          <List spacing={1}>
                            {player.recommendations.map((rec, index) => (
                              <ListItem key={index} fontSize="xs" color="gray.600">
                                <ListIcon as={CheckCircle} color="green.500" />
                                {rec}
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                        
                        <Text fontSize="xs" color="gray.500">
                          Last assessed: {player.lastAssessment.toLocaleDateString()}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </TabPanel>

          {/* AI Chat Interface */}
          <TabPanel>
            <Card variant="elevated" bg={cardBg}>
              <CardHeader>
                <Heading size="md" color="brand.600">
                  <Icon as={Brain} mr={2} />
                  AI Coaching Assistant
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Ask me anything about coaching, practice planning, or team strategy
                </Text>
              </CardHeader>
              <CardBody>
                <AIChatInterface />
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Insight Details Modal */}
      <Modal isOpen={isInsightModalOpen} onClose={onInsightModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Insight Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedInsight && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Title
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold">
                    {selectedInsight.title}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Description
                  </Text>
                  <Text fontSize="md">
                    {selectedInsight.description}
                  </Text>
                </Box>
                
                <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                      Confidence
                    </Text>
                    <Text fontSize="lg" color="green.600">
                      {selectedInsight.confidence}%
                    </Text>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                      Impact
                    </Text>
                    <Badge colorScheme={getImpactColor(selectedInsight.impact)} size="lg">
                      {selectedInsight.impact.toUpperCase()}
                    </Badge>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                      Priority
                    </Text>
                    <Text fontSize="lg" color="orange.600">
                      {selectedInsight.priority}
                    </Text>
                  </Box>
                </Grid>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Tags
                  </Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {selectedInsight.tags.map((tag, index) => (
                      <Badge key={index} colorScheme="gray" variant="subtle">
                        {tag}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onInsightModalClose}>
              Close
            </Button>
            {selectedInsight && !selectedInsight.isImplemented && (
              <Button
                colorScheme="brand"
                onClick={() => {
                  handleImplementInsight(selectedInsight.id);
                  onInsightModalClose();
                }}
              >
                Mark as Implemented
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Recommendation Details Modal */}
      <Modal isOpen={isRecommendationModalOpen} onClose={onRecommendationModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Recommendation Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRecommendation && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Title
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold">
                    {selectedRecommendation.title}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Description
                  </Text>
                  <Text fontSize="md">
                    {selectedRecommendation.description}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Expected Outcome
                  </Text>
                  <Text fontSize="md" color="green.600">
                    {selectedRecommendation.expectedOutcome}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Implementation Steps
                  </Text>
                  <List spacing={2}>
                    {selectedRecommendation.implementationSteps.map((step, index) => (
                      <ListItem key={index} fontSize="md">
                        <ListIcon as={CheckCircle} color="green.500" />
                        {step}
                      </ListItem>
                    ))}
                  </List>
                </Box>
                
                <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                      Time Required
                    </Text>
                    <Text fontSize="lg">
                      {selectedRecommendation.estimatedTime} min
                    </Text>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                      Difficulty
                    </Text>
                    <Badge colorScheme="orange" size="lg">
                      {selectedRecommendation.difficulty}
                    </Badge>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                      Confidence
                    </Text>
                    <Text fontSize="lg" color="green.600">
                      {selectedRecommendation.confidence}%
                    </Text>
                  </Box>
                </Grid>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRecommendationModalClose}>
              Close
            </Button>
            {selectedRecommendation && !selectedRecommendation.isAccepted && (
              <Button
                colorScheme="brand"
                onClick={() => {
                  handleAcceptRecommendation(selectedRecommendation.id);
                  onRecommendationModalClose();
                }}
              >
                Accept Recommendation
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// AI Chat Interface Component
const AIChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: `Hello Coach! I'm your AI coaching assistant. I can help you with practice planning, team analysis, strategy development, and more. What would you like to work on today?`,
      timestamp: new Date()
    }]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Simulate AI response (in production, this would call the actual AI service)
      setTimeout(() => {
        const aiResponse = generateAIResponse(inputValue);
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
      }, 1500);
    } catch (error) {
      console.error('AI response error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setIsTyping(false);
    }
  };

  const generateAIResponse = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();
    
    // Simple rule-based responses (in production, this would be AI-generated)
    let response = '';
    
    if (lowerInput.includes('practice') || lowerInput.includes('drill')) {
      response = `Great question about practice planning! For effective practices, I recommend:\n\n1. Start with a 10-15 minute dynamic warm-up\n2. Focus on 2-3 main objectives per session\n3. Include both individual skills and team drills\n4. End with a 5-10 minute cool-down\n\nWould you like me to generate a specific practice plan for your team?`;
    } else if (lowerInput.includes('defense') || lowerInput.includes('tackling')) {
      response = `Defensive fundamentals are crucial! Here are key points:\n\n1. Emphasize proper tackling technique (Heads Up Tackling)\n2. Focus on gap control and assignment responsibility\n3. Practice pursuit angles and open-field tackling\n4. Build communication between defensive players\n\nSafety first - always ensure proper form before adding intensity.`;
    } else if (lowerInput.includes('offense') || lowerInput.includes('scoring')) {
      response = `Offensive success comes from:\n\n1. Solid fundamentals (blocking, ball handling, route running)\n2. Understanding defensive schemes and how to attack them\n3. Consistent execution of basic plays\n4. Adapting to what the defense gives you\n\nWhat specific offensive area would you like to focus on?`;
    } else if (lowerInput.includes('team') || lowerInput.includes('chemistry')) {
      response = `Team chemistry is built through:\n\n1. Regular team-building activities\n2. Clear communication and expectations\n3. Celebrating individual and team successes\n4. Addressing conflicts constructively\n5. Building trust through shared experiences\n\nRemember, great teams are built both on and off the field!`;
    } else {
      response = `That's an interesting question! As your AI coaching assistant, I'm here to help with:\n\n• Practice planning and drill selection\n• Game strategy and analysis\n• Player development and motivation\n• Team management and communication\n• Performance optimization\n\nCould you be more specific about what you'd like to know?`;
    }

    return {
      id: Date.now().toString(),
      type: 'ai' as const,
      content: response,
      timestamp: new Date()
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="500px">
      {/* Messages */}
      <Box 
        flex={1} 
        overflowY="auto" 
        p={4} 
        bg="gray.50" 
        borderRadius="lg"
        border="1px"
        borderColor="gray.200"
      >
        <VStack spacing={4} align="stretch">
          {messages.map((message) => (
            <Box
              key={message.id}
              alignSelf={message.type === 'user' ? 'flex-end' : 'flex-start'}
              maxW="80%"
            >
              <Box
                bg={message.type === 'user' ? 'blue.500' : 'white'}
                color={message.type === 'user' ? 'white' : 'gray.800'}
                p={3}
                borderRadius="lg"
                boxShadow="sm"
                border={message.type === 'ai' ? '1px' : 'none'}
                borderColor="gray.200"
              >
                <Text fontSize="sm" whiteSpace="pre-line">
                  {message.content}
                </Text>
                <Text 
                  fontSize="xs" 
                  opacity={0.7} 
                  mt={2}
                  textAlign="right"
                >
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </Box>
            </Box>
          ))}
          
          {isTyping && (
            <Box alignSelf="flex-start">
              <Box
                bg="white"
                p={3}
                borderRadius="lg"
                boxShadow="sm"
                border="1px"
                borderColor="gray.200"
              >
                <HStack spacing={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="gray.600">
                    AI is thinking...
                  </Text>
                </HStack>
              </Box>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input */}
      <HStack spacing={3}>
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me about practice planning, team strategy, player development, or anything coaching-related..."
          size="lg"
          borderRadius="xl"
          resize="none"
          rows={3}
          disabled={isTyping}
          _focus={{
            borderColor: 'blue.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
          }}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isTyping}
          colorScheme="blue"
          size="lg"
          borderRadius="xl"
          px={8}
          leftIcon={<Icon as={Brain} />}
        >
          {isTyping ? 'Sending...' : 'Send'}
        </Button>
      </HStack>

      {/* Quick Prompts */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
          Try asking about:
        </Text>
        <HStack spacing={2} flexWrap="wrap">
          {[
            'How do I improve team tackling?',
            'What drills work best for 12-year-olds?',
            'How can I motivate my players?',
            'What\'s a good practice structure?'
          ].map((prompt, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => setInputValue(prompt)}
              fontSize="xs"
              borderRadius="full"
            >
              {prompt}
            </Button>
          ))}
        </HStack>
      </Box>
    </VStack>
  );
};

export default AIBrainDashboard;
