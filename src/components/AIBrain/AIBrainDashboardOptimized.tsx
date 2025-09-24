// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
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
  Stepper,
  Step,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepStatus,
  StepTitle,
  StepDescription,
  useSteps,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tag,
  TagLabel,
  TagCloseButton,
  Kbd,
  Code,
  Link,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Stack,
  useBreakpointValue,
} from '@chakra-ui/react';
import SafeBoundary from '../common/SafeBoundary';
import { useAuth } from '../../hooks/useAuth';
import {
  RESPONSIVE_GRIDS,
  RESPONSIVE_SPACING,
  RESPONSIVE_FONTS,
  useResponsive,
} from '../../utils/responsive';
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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  MessageSquare,
  Bell,
  QrCode,
  FileText,
  Database,
  Copy,
  ExternalLink,
  RotateCcw,
  Undo2,
  Redo2,
  Layers,
  Palette,
  Move,
  MousePointer,
  PenTool,
  Eraser,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  TrendingDown,
  Minus,
  Equal,
  AlertCircle,
  Clock4,
  CalendarDays,
  Trophy,
  Medal,
  Crown,
  Flame,
  Snowflake,
  Droplets,
  Sun,
  Cloud,
  Wind,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  CloudHail,
  CloudDrizzle,
  CloudRainWind,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface AIInsight {
  id: string;
  type:
    | 'performance'
    | 'strategy'
    | 'health'
    | 'tactical'
    | 'mental'
    | 'physical';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  createdAt: Date;
  isImplemented: boolean;
  priority: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  estimatedImpact: 'low' | 'medium' | 'high';
  implementationSteps: string[];
  relatedMetrics: string[];
  tags: string[];
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  confidence: number;
  category:
    | 'practice'
    | 'game'
    | 'training'
    | 'recovery'
    | 'nutrition'
    | 'mental';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: 'low' | 'medium' | 'high';
  estimatedImpact: 'low' | 'medium' | 'high';
  implementationSteps: string[];
  expectedOutcome: string;
  riskAssessment: string;
  alternatives: string[];
  isAccepted: boolean;
  isImplemented: boolean;
  implementationProgress: number;
  createdAt: Date;
  deadline?: Date;
}

interface TeamPerformance {
  id: string;
  date: Date;
  overallScore: number;
  offenseScore: number;
  defenseScore: number;
  specialTeamsScore: number;
  conditioningScore: number;
  mentalScore: number;
  notes: string;
  trends: {
    direction: 'up' | 'down' | 'stable';
    change: number;
    period: string;
  }[];
}

interface PlayerInsight {
  id: string;
  playerId: string;
  playerName: string;
  insight: string;
  confidence: number;
  category: 'performance' | 'health' | 'mental' | 'technical' | 'tactical';
  priority: 'low' | 'medium' | 'high';
  recommendations: string[];
  createdAt: Date;
}

interface WorkflowStep {
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
}

interface RealTimeMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  status: 'good' | 'warning' | 'critical';
  lastUpdated: Date;
}

const AIBrainDashboardOptimized: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(
    []
  );
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [playerInsights, setPlayerInsights] = useState<PlayerInsight[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetric[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(
    null
  );
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<AIRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true); // New state for loading

  // Workflow progress
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowStep[]>([
    {
      title: 'Data Collection',
      description: 'Gather performance and team data',
      isCompleted: false,
      isRequired: true,
    },
    {
      title: 'AI Analysis',
      description: 'Process data and generate insights',
      isCompleted: false,
      isRequired: true,
    },
    {
      title: 'Insight Generation',
      description: 'Create actionable recommendations',
      isCompleted: false,
      isRequired: true,
    },
    {
      title: 'Priority Management',
      description: 'Rank and organize insights',
      isCompleted: false,
      isRequired: false,
    },
    {
      title: 'Implementation Tracking',
      description: 'Monitor progress and outcomes',
      isCompleted: false,
      isRequired: false,
    },
  ]);

  // AI settings
  const [aiConfidence, setAiConfidence] = useState(75);
  const [aiSensitivity, setAiSensitivity] = useState(50);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [notificationLevel, setNotificationLevel] = useState<
    'low' | 'medium' | 'high'
  >('medium');

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  const { profile } = useAuth();

  // Load AI insights from Firestore
  useEffect(() => {
    if (profile?.teamId) {
      loadAIInsights();
    }
  }, [profile]);

  const loadAIInsights = async () => {
    if (!profile?.teamId) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to get AI insights from Firestore
      // For now, we'll use empty arrays that will be populated when backend is ready
      const fetchedInsights: AIInsight[] = [];
      const fetchedRecommendations: AIRecommendation[] = [];
      const fetchedTeamPerformance: TeamPerformance[] = [];
      const fetchedPlayerInsights: PlayerInsight[] = [];
      const fetchedRealTimeMetrics: RealTimeMetric[] = [];

      setInsights(fetchedInsights);
      setRecommendations(fetchedRecommendations);
      setTeamPerformance(fetchedTeamPerformance);
      setPlayerInsights(fetchedPlayerInsights);
      setRealTimeMetrics(fetchedRealTimeMetrics);

      // Update workflow progress based on actual data
      if (fetchedInsights.length > 0) {
        updateWorkflowProgress(0, true);
      }
      if (fetchedRecommendations.length > 0) {
        updateWorkflowProgress(1, true);
      }
    } catch (error) {
      console.error('Error loading AI insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI insights. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setInsights([]);
      setRecommendations([]);
      setTeamPerformance([]);
      setPlayerInsights([]);
      setRealTimeMetrics([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update workflow progress
  const updateWorkflowProgress = (stepIndex: number, isCompleted: boolean) => {
    setWorkflowProgress(prev =>
      prev.map((step, index) =>
        index === stepIndex ? { ...step, isCompleted } : step
      )
    );
  };

  // Generate AI insights
  const generateInsights = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const newInsight: AIInsight = {
        id: `insight-${Date.now()}`,
        type: 'strategy',
        title: 'Dynamic Formation Adjustment',
        description:
          'Based on recent game analysis, the team shows better performance when switching between 3-4 and 4-3 defensive formations based on opponent tendencies.',
        confidence: 85 + Math.floor(Math.random() * 15),
        impact: 'medium',
        category: 'Defensive Strategy',
        createdAt: new Date(),
        isImplemented: false,
        priority: insights.length + 1,
        estimatedEffort: 'medium',
        estimatedImpact: 'medium',
        implementationSteps: [
          'Analyze opponent formation preferences',
          'Practice formation transitions',
          'Develop formation-specific play calls',
          'Train players on multiple positions',
        ],
        relatedMetrics: [
          'Formation Success Rate',
          'Defensive Efficiency',
          'Opponent Scoring',
        ],
        tags: ['defense', 'formation', 'strategy', 'adaptation'],
      };

      setInsights(prev => [newInsight, ...prev]);
      updateWorkflowProgress(2, true);

      toast({
        title: 'New Insight Generated!',
        description: 'AI has identified a new strategic opportunity.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate new insights. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [insights, toast]);

  // Accept recommendation
  const acceptRecommendation = (recommendationId: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === recommendationId ? { ...rec, isAccepted: true } : rec
      )
    );

    toast({
      title: 'Recommendation Accepted!',
      description: 'Start implementing the suggested improvements.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Update implementation progress
  const updateProgress = (recommendationId: string, progress: number) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === recommendationId
          ? { ...rec, implementationProgress: progress }
          : rec
      )
    );

    if (progress >= 100) {
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId ? { ...rec, isImplemented: true } : rec
        )
      );

      toast({
        title: 'Implementation Complete!',
        description: 'Recommendation has been fully implemented.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Get priority color
  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'red';
    if (priority <= 3) return 'orange';
    if (priority <= 5) return 'yellow';
    return 'green';
  };

  // Get impact color
  const getImpactColor = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency: 'low' | 'medium' | 'high' | 'critical') => {
    switch (urgency) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  // Get status color
  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'critical':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      case 'stable':
        return Equal;
      default:
        return Equal;
    }
  };

  return (
    <SafeBoundary>
      <Box p={6} maxW="8xl" mx="auto">
        {/* Header with Progress */}
        <Box mb={8}>
          <Flex justify="space-between" align="center" mb={6}>
            <Box>
              <Heading size="lg" color="gray.800" mb={2}>
                AI Brain Dashboard
              </Heading>
              <Text color="gray.600">
                Intelligent insights and recommendations powered by AI
              </Text>
            </Box>

            <HStack spacing={4}>
              <Button
                leftIcon={<Icon as={HelpCircle} />}
                variant="ghost"
                onClick={() => setShowHelp(!showHelp)}
                size="sm"
              >
                Help
              </Button>
              <Button
                leftIcon={<Icon as={Settings} />}
                variant="ghost"
                size="sm"
              >
                Settings
              </Button>
            </HStack>
          </Flex>

          {/* Workflow Progress */}
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Stepper
                index={workflowProgress.filter(step => step.isCompleted).length}
                colorScheme="blue"
                size="sm"
              >
                {workflowProgress.map((step, index) => (
                  <Step key={index}>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>
                    <Box flexShrink="0">
                      <StepTitle>{step.title}</StepTitle>
                      <StepDescription>{step.description}</StepDescription>
                    </Box>
                  </Step>
                ))}
              </Stepper>
            </CardBody>
          </Card>
        </Box>

        {/* Help Panel */}
        {showHelp && (
          <Alert status="info" borderRadius="xl" mb={6}>
            <AlertIcon />
            <Box>
              <AlertTitle>Quick Tips</AlertTitle>
              <AlertDescription>
                <List spacing={2} mt={2}>
                  <ListItem>
                    <ListIcon as={CheckCircle2} color="green.500" />
                    AI insights improve with more data and feedback
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircle2} color="green.500" />
                    Prioritize high-impact, low-effort recommendations
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircle2} color="green.500" />
                    Track implementation progress for better outcomes
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircle2} color="green.500" />
                    Regular performance monitoring enhances AI accuracy
                  </ListItem>
                </List>
              </AlertDescription>
            </Box>
          </Alert>
        )}

        <Tabs
          variant="enclosed"
          colorScheme="blue"
          index={
            activeTab === 'overview'
              ? 0
              : activeTab === 'insights'
                ? 1
                : activeTab === 'recommendations'
                  ? 2
                  : 3
          }
          onChange={index =>
            setActiveTab(
              index === 0
                ? 'overview'
                : index === 1
                  ? 'insights'
                  : index === 2
                    ? 'recommendations'
                    : 'performance'
            )
          }
        >
          <TabList>
            <Tab>
              <Icon as={BarChart3} mr={2} />
              Overview
            </Tab>
            <Tab>
              <Icon as={Lightbulb} mr={2} />
              Insights
            </Tab>
            <Tab>
              <Icon as={Target} mr={2} />
              Recommendations
            </Tab>
            <Tab>
              <Icon as={TrendingUp} mr={2} />
              Performance
            </Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <Grid
                templateColumns={useBreakpointValue(RESPONSIVE_GRIDS['2'])}
                gap={useBreakpointValue(RESPONSIVE_SPACING.xl)}
              >
                {/* Main Content */}
                <VStack
                  spacing={useBreakpointValue(RESPONSIVE_SPACING.lg)}
                  align="stretch"
                >
                  {/* AI Generation */}
                  <Card
                    bg={bgColor}
                    border="1px"
                    borderColor={borderColor}
                    shadow="sm"
                  >
                    <CardHeader>
                      <Heading size="md" color="gray.800">
                        <Icon as={Brain} mr={2} color="purple.500" />
                        AI-Powered Analysis
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        Generate new insights and recommendations based on your
                        team's data
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Button
                          leftIcon={<Icon as={Sparkles} />}
                          colorScheme="purple"
                          size="lg"
                          onClick={generateInsights}
                          isLoading={isGenerating}
                          loadingText="Analyzing Data..."
                          borderRadius="xl"
                          bg="linear-gradient(135deg, purple.500 0%, blue.600 100%)"
                          _hover={{
                            transform: 'translateY(-2px)',
                            shadow: 'lg',
                          }}
                          _active={{
                            transform: 'translateY(0)',
                          }}
                          transition="all 0.2s"
                        >
                          Generate AI Insights
                        </Button>

                        <HStack
                          justify="space-between"
                          p={4}
                          bg={cardBg}
                          borderRadius="xl"
                        >
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            color="gray.700"
                          >
                            AI Confidence Level
                          </Text>
                          <Badge colorScheme="green" variant="subtle">
                            {aiConfidence}%
                          </Badge>
                        </HStack>

                        <HStack
                          justify="space-between"
                          p={4}
                          bg={cardBg}
                          borderRadius="xl"
                        >
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            color="gray.700"
                          >
                            Auto-Generation
                          </Text>
                          <Switch
                            isChecked={autoGenerate}
                            onChange={e => setAutoGenerate(e.target.checked)}
                            colorScheme="purple"
                          />
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Real-Time Metrics */}
                  <Card
                    bg={bgColor}
                    border="1px"
                    borderColor={borderColor}
                    shadow="sm"
                  >
                    <CardHeader>
                      <Heading size="md" color="gray.800">
                        <Icon as={Activity} mr={2} color="blue.500" />
                        Real-Time Metrics
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        Live monitoring of key team performance indicators
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid
                        columns={{ base: 1, md: 2, lg: 3 }}
                        spacing={4}
                      >
                        {realTimeMetrics.map((metric, index) => (
                          <Card
                            key={`${metric.name}-${index}`}
                            bg={cardBg}
                            border="1px"
                            borderColor={borderColor}
                            p={4}
                          >
                            <VStack spacing={3} align="stretch">
                              <HStack justify="space-between">
                                <Text
                                  fontSize="sm"
                                  fontWeight="semibold"
                                  color="gray.700"
                                >
                                  {metric.name}
                                </Text>
                                <Icon
                                  as={getTrendIcon(metric.trend)}
                                  color={
                                    metric.trend === 'up'
                                      ? 'green.500'
                                      : metric.trend === 'down'
                                        ? 'red.500'
                                        : 'gray.500'
                                  }
                                  boxSize={4}
                                />
                              </HStack>

                              <HStack justify="space-between">
                                <Text
                                  fontSize="2xl"
                                  fontWeight="bold"
                                  color="gray.800"
                                >
                                  {metric.value}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  {metric.unit}
                                </Text>
                              </HStack>

                              <HStack justify="space-between">
                                <Badge
                                  colorScheme={getStatusColor(metric.status)}
                                  variant="subtle"
                                  size="sm"
                                >
                                  {metric.status}
                                </Badge>
                                <Text fontSize="xs" color="gray.500">
                                  {metric.change > 0 ? '+' : ''}
                                  {metric.change}%
                                </Text>
                              </HStack>

                              <Text
                                fontSize="xs"
                                color="gray.500"
                                textAlign="right"
                              >
                                Updated{' '}
                                {metric.lastUpdated.toLocaleTimeString()}
                              </Text>
                            </VStack>
                          </Card>
                        ))}
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  {/* Recent Insights */}
                  <Card
                    bg={bgColor}
                    border="1px"
                    borderColor={borderColor}
                    shadow="sm"
                  >
                    <CardHeader>
                      <Heading size="md" color="gray.800">
                        <Icon as={Lightbulb} mr={2} color="yellow.500" />
                        Recent Insights
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        Latest AI-generated insights and observations
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {isLoading ? (
                          <VStack spacing={4} align="center" py={8}>
                            <Box
                              w={12}
                              h={12}
                              bg="primary.100"
                              borderRadius="full"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon
                                as={Clock}
                                boxSize={6}
                                color="primary.600"
                              />
                            </Box>
                            <Text
                              fontSize="md"
                              color="gray.600"
                              fontWeight="500"
                            >
                              Loading AI insights...
                            </Text>
                          </VStack>
                        ) : insights.length === 0 ? (
                          <VStack spacing={4} align="center" py={8}>
                            <Box
                              w={12}
                              h={12}
                              bg="gray.100"
                              borderRadius="full"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon as={Brain} boxSize={6} color="gray.500" />
                            </Box>
                            <VStack spacing={2} align="center">
                              <Text
                                fontSize="md"
                                color="gray.600"
                                fontWeight="500"
                              >
                                No AI insights yet
                              </Text>
                              <Text
                                fontSize="sm"
                                color="gray.500"
                                textAlign="center"
                              >
                                AI insights will appear as you use the system
                                and collect data
                              </Text>
                            </VStack>
                            <Button
                              variant="brand-primary"
                              leftIcon={<Icon as={BarChart3} />}
                              onClick={() => setActiveTab('performance')}
                            >
                              View Performance Data
                            </Button>
                          </VStack>
                        ) : (
                          insights.slice(0, 3).map(insight => (
                            <Card
                              key={insight.id}
                              bg={cardBg}
                              border="1px"
                              borderColor={borderColor}
                              cursor="pointer"
                              _hover={{
                                borderColor: 'blue.300',
                                transform: 'translateY(-2px)',
                                shadow: 'md',
                              }}
                              transition="all 0.2s"
                              onClick={() => setSelectedInsight(insight)}
                            >
                              <CardBody p={4}>
                                <HStack justify="space-between" mb={3}>
                                  <Badge colorScheme="blue" variant="subtle">
                                    {insight.category}
                                  </Badge>
                                  <HStack spacing={2}>
                                    <Badge
                                      colorScheme={getPriorityColor(
                                        insight.priority
                                      )}
                                      size="sm"
                                    >
                                      Priority {insight.priority}
                                    </Badge>
                                    <Badge
                                      colorScheme={getImpactColor(
                                        insight.impact
                                      )}
                                      size="sm"
                                    >
                                      {insight.impact} Impact
                                    </Badge>
                                  </HStack>
                                </HStack>

                                <Text
                                  fontWeight="semibold"
                                  color="gray.800"
                                  mb={2}
                                >
                                  {insight.title}
                                </Text>

                                <Text
                                  fontSize="sm"
                                  color="gray.600"
                                  mb={3}
                                  noOfLines={2}
                                >
                                  {insight.description}
                                </Text>

                                <HStack justify="space-between">
                                  <HStack spacing={2}>
                                    <Text fontSize="xs" color="gray.500">
                                      Confidence: {insight.confidence}%
                                    </Text>
                                    <Text fontSize="xs" color="gray.500">
                                      Effort: {insight.estimatedEffort}
                                    </Text>
                                  </HStack>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    rightIcon={<Icon as={ArrowRight} />}
                                  >
                                    View Details
                                  </Button>
                                </HStack>
                              </CardBody>
                            </Card>
                          ))
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>

                {/* Sidebar - Quick Stats & Actions */}
                <VStack
                  spacing={useBreakpointValue(RESPONSIVE_SPACING.lg)}
                  align="stretch"
                >
                  {/* AI Performance Stats */}
                  <Card
                    bg={bgColor}
                    border="1px"
                    borderColor={borderColor}
                    shadow="sm"
                    position="sticky"
                    top={6}
                  >
                    <CardHeader>
                      <Stack
                        direction={{ base: 'column', sm: 'row' }}
                        align={{ base: 'center', sm: 'start' }}
                        spacing={2}
                      >
                        <Icon as={Brain} color="purple.500" boxSize={5} />
                        <Heading
                          size={useBreakpointValue(RESPONSIVE_FONTS.md)}
                          color="gray.800"
                          textAlign={{ base: 'center', sm: 'left' }}
                        >
                          AI Performance
                        </Heading>
                      </Stack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Stat>
                          <StatLabel color="gray.600">Total Insights</StatLabel>
                          <StatNumber color="purple.600">
                            {insights.length}
                          </StatNumber>
                          <StatHelpText>
                            <Icon as={ArrowUp} color="green.500" boxSize={4} />+
                            {insights.filter(i => !i.isImplemented).length} new
                          </StatHelpText>
                        </Stat>

                        <Stat>
                          <StatLabel color="gray.600">
                            Active Recommendations
                          </StatLabel>
                          <StatNumber color="blue.600">
                            {
                              recommendations.filter(
                                r => r.isAccepted && !r.isImplemented
                              ).length
                            }
                          </StatNumber>
                          <StatHelpText>
                            <Icon as={ArrowUp} color="green.500" boxSize={4} />
                            {
                              recommendations.filter(r => r.isImplemented)
                                .length
                            }{' '}
                            completed
                          </StatHelpText>
                        </Stat>

                        <Stat>
                          <StatLabel color="gray.600">
                            Implementation Rate
                          </StatLabel>
                          <StatNumber color="green.600">
                            {recommendations.length > 0
                              ? Math.round(
                                  (recommendations.filter(r => r.isImplemented)
                                    .length /
                                    recommendations.length) *
                                    100
                                )
                              : 0}
                            %
                          </StatNumber>
                          <StatHelpText>
                            <Icon as={ArrowUp} color="green.500" boxSize={4} />
                            +5% this week
                          </StatHelpText>
                        </Stat>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Quick Actions */}
                  <Card
                    bg={bgColor}
                    border="1px"
                    borderColor={borderColor}
                    shadow="sm"
                  >
                    <CardHeader>
                      <Stack
                        direction={{ base: 'column', sm: 'row' }}
                        align={{ base: 'center', sm: 'start' }}
                        spacing={2}
                      >
                        <Icon as={Zap} color="blue.500" boxSize={5} />
                        <Heading
                          size={useBreakpointValue(RESPONSIVE_FONTS.md)}
                          color="gray.800"
                          textAlign={{ base: 'center', sm: 'left' }}
                        >
                          Quick Actions
                        </Heading>
                      </Stack>
                    </CardHeader>
                    <CardBody>
                      <VStack
                        spacing={useBreakpointValue(RESPONSIVE_SPACING.sm)}
                        align="stretch"
                      >
                        <Button
                          leftIcon={<Icon as={BarChart3} />}
                          variant="outline"
                          onClick={() => setActiveTab('performance')}
                          size={{ base: 'md', md: 'lg' }}
                          borderRadius="xl"
                          w="full"
                        >
                          View Performance
                        </Button>

                        <Button
                          leftIcon={<Icon as={Target} />}
                          variant="outline"
                          onClick={() => setActiveTab('recommendations')}
                          size={{ base: 'md', md: 'lg' }}
                          borderRadius="xl"
                          w="full"
                        >
                          Manage Recommendations
                        </Button>

                        <Button
                          leftIcon={<Icon as={Download} />}
                          variant="outline"
                          size={{ base: 'md', md: 'lg' }}
                          borderRadius="xl"
                          w="full"
                        >
                          Export Report
                        </Button>

                        <Button
                          leftIcon={<Icon as={Share} />}
                          variant="outline"
                          size={{ base: 'md', md: 'lg' }}
                          borderRadius="xl"
                          w="full"
                        >
                          Share Insights
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Smart Tips */}
                  <Card
                    bg={bgColor}
                    border="1px"
                    borderColor={borderColor}
                    shadow="sm"
                  >
                    <CardHeader>
                      <Heading size="md" color="gray.800">
                        <Icon as={Info} mr={2} color="blue.500" />
                        Smart Tips
                      </Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Box p={3} bg={cardBg} borderRadius="lg">
                          <Text
                            fontSize="sm"
                            color="gray.700"
                            fontWeight="medium"
                          >
                            🧠 AI insights improve with more data and feedback
                          </Text>
                        </Box>
                        <Box p={3} bg={cardBg} borderRadius="lg">
                          <Text
                            fontSize="sm"
                            color="gray.700"
                            fontWeight="medium"
                          >
                            🎯 Prioritize high-impact, low-effort
                            recommendations
                          </Text>
                        </Box>
                        <Box p={3} bg={cardBg} borderRadius="lg">
                          <Text
                            fontSize="sm"
                            color="gray.700"
                            fontWeight="medium"
                          >
                            📊 Track implementation progress for better outcomes
                          </Text>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </Grid>
            </TabPanel>

            {/* Insights Tab */}
            <TabPanel>
              <Box textAlign="center" py={12}>
                <Icon as={Lightbulb} boxSize={16} color="gray.400" mb={4} />
                <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                  AI Insights
                </Text>
                <Text color="gray.500">
                  Detailed analysis and strategic insights. Coming soon with
                  comprehensive insight management and implementation tracking.
                </Text>
              </Box>
            </TabPanel>

            {/* Recommendations Tab */}
            <TabPanel>
              <Box textAlign="center" py={12}>
                <Icon as={Target} boxSize={16} color="gray.400" mb={4} />
                <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                  AI Recommendations
                </Text>
                <Text color="gray.500">
                  Actionable recommendations with implementation guides. Coming
                  soon with priority management and progress tracking.
                </Text>
              </Box>
            </TabPanel>

            {/* Performance Tab */}
            <TabPanel>
              <Box textAlign="center" py={12}>
                <Icon as={TrendingUp} boxSize={16} color="gray.400" mb={4} />
                <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                  Performance Analytics
                </Text>
                <Text color="gray.500">
                  Team and individual performance tracking with trend analysis.
                  Coming soon with detailed charts and predictive analytics.
                </Text>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </SafeBoundary>
  );
};

export default AIBrainDashboardOptimized;
// @ts-nocheck
