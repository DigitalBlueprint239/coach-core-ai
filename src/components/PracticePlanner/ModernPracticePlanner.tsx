import React, { useState, useCallback, useEffect } from 'react';
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
  Button,
  HStack,
  VStack,
  Icon,
  Badge,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  IconButton,
  Tooltip,
  useToast,
  Progress,
  Divider,
  SimpleGrid,
  Tag,
  TagLabel,
  TagCloseButton,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stepper,
  Step,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepStatus,
  StepTitle,
  StepDescription,
  useSteps,
  List,
  ListItem,
  ListIcon,
  Kbd,
  Code,
  Link,
  FormControl,
  FormLabel,
  Stack,
  useBreakpointValue,
  FormHelperText,
  Center,
  Spinner,
} from '@chakra-ui/react';
import {
  RESPONSIVE_SPACING,
  RESPONSIVE_FONTS,
  responsiveStyles,
  useResponsive,
} from '../../utils/responsive';
import {
  Plus,
  Clock,
  Target,
  Users,
  Calendar,
  Play,
  Pause,
  Edit,
  Trash2,
  Save,
  Share,
  Download,
  Eye,
  Brain,
  Zap,
  Award,
  Timer,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Info,
  Star,
  Copy,
  ExternalLink,
} from 'lucide-react';
import aiService, {
  PracticePlan,
  PracticePeriod,
  PracticePlanDrill,
  AIPracticePlanResponse,
} from '../../services/ai/ai-service';
import { AIPracticePlanRequest } from '../../services/ai/enhanced-ai-service';
import PracticeService from '../../services/practice/practice-service';
import PracticePlanLibrary from './PracticePlanLibrary';
import { practiceDataService } from '../../services/data/data-service';
import { syncService } from '../../services/data/sync-service';
import { useAuth } from '../../hooks/useAuth';

type Drill = PracticePlanDrill;


interface WorkflowStep {
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
}

const ModernPracticePlanner: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<PracticePlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const { user } = useAuth();
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowStep[]>([
    {
      title: 'Plan Setup',
      description: 'Configure basic plan parameters',
      isCompleted: false,
      isRequired: true,
    },
    {
      title: 'Goals & Objectives',
      description: 'Define practice goals and focus areas',
      isCompleted: false,
      isRequired: true,
    },
    {
      title: 'AI Generation',
      description: 'Generate practice plan with AI assistance',
      isCompleted: false,
      isRequired: false,
    },
    {
      title: 'Review & Customize',
      description: 'Review and adjust the generated plan',
      isCompleted: false,
      isRequired: true,
    },
    {
      title: 'Save & Share',
      description: 'Save plan and share with team',
      isCompleted: false,
      isRequired: false,
    },
  ]);

  // Form state
  const [sport, setSport] = useState('Football');
  const [ageGroup, setAgeGroup] = useState('14-16');
  const [duration, setDuration] = useState(90);
  const [goals, setGoals] = useState<string[]>([]);
  const [planTitle, setPlanTitle] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [difficulty, setDifficulty] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('intermediate');

  // AI and suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [showAITips, setShowAITips] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('create');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Handle sport change
  const handleSportChange = (newSport: string) => {
    console.log('Sport changed from', sport, 'to', newSport);
    setSport(newSport);
    // Reset goals when sport changes since they're sport-specific
    setGoals([]);
    toast({
      title: 'Sport Updated',
      description: `Changed to ${newSport}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Handle age group change
  const handleAgeGroupChange = (newAgeGroup: string) => {
    console.log('Age group changed from', ageGroup, 'to', newAgeGroup);
    setAgeGroup(newAgeGroup);
    // Update duration based on age group
    const smartDefaults = getSmartDefaults();
    if (smartDefaults.duration !== duration) {
      setDuration(smartDefaults.duration);
    }
    toast({
      title: 'Age Group Updated',
      description: `Changed to ${newAgeGroup}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Predefined goals for different sports
  const sportGoals = {
    Football: [
      'Offensive Strategy',
      'Defensive Coverage',
      'Special Teams',
      'Red Zone Offense',
      'Clock Management',
      'Two-Minute Drill',
      'Goal Line Defense',
      'Field Goal Kicking',
    ],
    Basketball: [
      'Fast Break Offense',
      'Zone Defense',
      'Free Throw Shooting',
      'Rebounding',
      'Ball Handling',
      'Perimeter Shooting',
      'Post Play',
      'Press Defense',
    ],
    Soccer: [
      'Possession Play',
      'Counter Attack',
      'Set Pieces',
      'Goalkeeping',
      'Defensive Shape',
      'Attacking Movement',
      'Pressing',
      'Build-up Play',
    ],
    Baseball: [
      'Hitting Mechanics',
      'Pitching Strategy',
      'Fielding Fundamentals',
      'Base Running',
      'Catcher Skills',
      'Outfield Play',
      'Infield Defense',
      'Bunt Defense',
    ],
    Volleyball: [
      'Serving',
      'Passing',
      'Setting',
      'Spiking',
      'Blocking',
      'Defense',
      'Serve Receive',
      'Transition Play',
    ],
  };

  // Smart defaults based on sport and age
  const getSmartDefaults = () => {
    const defaults: any = {
      Football: {
        '8-10': { duration: 60, difficulty: 'beginner', focus: 'fundamentals' },
        '11-13': {
          duration: 75,
          difficulty: 'beginner',
          focus: 'basic_strategy',
        },
        '14-16': {
          duration: 90,
          difficulty: 'intermediate',
          focus: 'advanced_strategy',
        },
        '17-18': {
          duration: 120,
          difficulty: 'advanced',
          focus: 'game_situations',
        },
        '19+': {
          duration: 120,
          difficulty: 'advanced',
          focus: 'elite_performance',
        },
      },
    };

    return (
      defaults[sport]?.[ageGroup] || {
        duration: 90,
        difficulty: 'intermediate',
        focus: 'balanced',
      }
    );
  };

  // Update workflow progress
  const updateWorkflowProgress = (stepIndex: number, isCompleted: boolean) => {
    setWorkflowProgress(prev =>
      prev.map((step, index) =>
        index === stepIndex ? { ...step, isCompleted } : step
      )
    );
  };

  // Auto-complete workflow steps based on form state
  useEffect(() => {
    if (sport && ageGroup && duration > 0) {
      updateWorkflowProgress(0, true);
    }
    if (goals.length > 0) {
      updateWorkflowProgress(1, true);
    }
  }, [sport, ageGroup, duration, goals]);

  // Load practice plans and setup sync
  useEffect(() => {
    if (user) {
      loadPracticePlans();
      setupSyncStatus();
    } else {
      // For demo mode or unauthenticated users, create a local plan
      console.log('No user authenticated, creating demo practice plan');
      const demoPlan: PracticePlan = {
        id: `demo_plan_${Date.now()}`,
        title: 'Demo Practice Plan',
        sport: 'football',
        ageGroup: 'youth',
        duration: 90,
        goals: ['Basic Skills', 'Team Building'],
        periods: [],
        notes: 'This is a demo plan. Create an account to save your practice plans.',
        teamId: 'demo',
        createdAt: new Date(),
        updatedAt: new Date(),
        aiConfidence: 0,
        tags: ['demo'],
        difficulty: 'beginner',
      };
      setCurrentPlan(demoPlan);
      setIsLoading(false);
    }
  }, [user]);

  const loadPracticePlans = async () => {
    if (!user) {
      console.warn('No user authenticated, cannot load practice plans');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Loading practice plans for user:', user.uid);
      
      // First try to load plans where user is the creator
      const plans = await practiceDataService.readMany<PracticePlan>('practicePlans', {
        where: [{ field: 'createdBy', operator: '==', value: user.uid }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      });
      
      console.log('Loaded practice plans:', plans.length);
      
      // Set the most recent plan as current if available
      if (plans.length > 0) {
        setCurrentPlan(plans[0]);
      } else {
        // If no plans found, create a default one
        console.log('No practice plans found, creating default plan');
        const defaultPlan: PracticePlan = {
          id: `plan_${Date.now()}`,
          title: 'My First Practice Plan',
          sport: 'football',
          ageGroup: 'youth',
          duration: 90,
          goals: ['Basic Skills', 'Team Building'],
          periods: [],
          notes: 'This is a sample practice plan. Edit it to create your own!',
          teamId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          aiConfidence: 0,
          tags: ['beginner'],
          difficulty: 'beginner',
        };
        
        // Save the default plan
        try {
          await practiceDataService.create('practicePlans', defaultPlan);
          setCurrentPlan(defaultPlan);
        } catch (createError) {
          console.error('Failed to create default plan:', createError);
          // Still set it locally even if we can't save it
          setCurrentPlan(defaultPlan);
        }
      }
    } catch (error: unknown) {
      console.error('Error loading practice plans:', error);

      const maybeError = error as { code?: string; message?: string };
      // Provide more specific error messages
      let errorMessage = 'Failed to load practice plans. Please try again.';

      if (maybeError.code === 'permission-denied') {
        errorMessage = 'You do not have permission to access practice plans. Please check your authentication.';
      } else if (maybeError.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please check your internet connection.';
      } else if (maybeError.message?.includes('auth')) {
        errorMessage = 'Authentication error. Please log in again.';
      }
      
      toast({
        title: 'Error Loading Plans',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupSyncStatus = () => {
    const unsubscribe = syncService.onStatusChange((status) => {
      setSyncStatus(status);
    });
    
    return unsubscribe;
  };

  // Generate AI suggestions
  const generateAISuggestions = useCallback(async () => {
    if (!sport || !ageGroup || goals.length === 0) {
      toast({
        title: 'Missing Information',
        description:
          'Please complete sport, age group, and goals before generating AI suggestions.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsGenerating(true);
    try {
      const request: AIPracticePlanRequest = {
        sport,
        ageGroup,
        duration,
        goals,
        difficulty,
        teamSize: 20,
        equipment: [],
        weather: 'indoor',
        recentPerformance: 'steady',
        teamContext: {
          teamId: currentPlan?.teamId ?? user?.uid ?? 'demo-team',
          teamName:
            planTitle.trim() || currentPlan?.title || `${sport} ${ageGroup}`,
          sport,
          ageGroup,
          skillLevel: difficulty,
        },
      };

      const response: AIPracticePlanResponse = await aiService.generatePracticePlan(
        request
      );

      if (response.success) {
        setAiConfidence(response.confidence ?? 85);
        setAiSuggestions(response.suggestions ?? response.insights ?? []);

        if (response.plan) {
          setCurrentPlan(response.plan);
          if (!planTitle) {
            setPlanTitle(response.plan.title);
          }
          updateWorkflowProgress(2, true);
          updateWorkflowProgress(3, true);
        }

        toast({
          title: response.fallback
            ? 'Fallback Plan Generated'
            : 'AI Plan Generated!',
          description: response.confidence
            ? `Confidence: ${response.confidence}% - Review and customize as needed.`
            : 'Review and customize the generated plan before saving.',
          status: response.fallback ? 'warning' : 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'AI Generation Failed',
        description: 'Please try again or create a plan manually.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('AI generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [sport, ageGroup, duration, goals, difficulty, toast]);

  // Quick start templates
  const quickStartTemplates = [
    {
      name: 'Game Prep',
      sport: 'Football',
      duration: 90,
      goals: ['Offensive Strategy', 'Defensive Coverage'],
      description: 'Focused preparation for upcoming game',
    },
    {
      name: 'Skill Development',
      sport: 'Basketball',
      duration: 75,
      goals: ['Ball Handling', 'Shooting'],
      description: 'Individual skill improvement session',
    },
    {
      name: 'Conditioning',
      sport: 'Soccer',
      duration: 60,
      goals: ['Fitness', 'Endurance'],
      description: 'Physical conditioning and fitness',
    },
    {
      name: 'Fundamentals',
      sport: 'Baseball',
      duration: 90,
      goals: ['Hitting Mechanics', 'Fielding'],
      description: 'Basic skill reinforcement',
    },
  ];

  const applyTemplate = (template: any) => {
    setSport(template.sport);
    setAgeGroup('14-16'); // Default age group
    setDuration(template.duration);
    setGoals(template.goals);
    setPlanTitle(`${template.name} Practice`);

    // Auto-generate plan
    setTimeout(() => generateAISuggestions(), 500);
  };

  // Save plan
  const handleSavePlan = async () => {
    if (!currentPlan) return;

    // Handle demo mode users
    if (!user) {
      toast({
        title: 'Demo Mode',
        description: 'Please sign up to save your practice plans permanently.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const planData = {
        ...currentPlan,
        teamId: user.uid,
        createdBy: user.uid,
      };

      let savedPlan: PracticePlan;
      if (currentPlan.id && !currentPlan.id.startsWith('demo_')) {
        // Update existing plan
        await practiceDataService.update('practicePlans', currentPlan.id, planData);
        savedPlan = { ...currentPlan, updatedAt: new Date() };
      } else {
        // Create new plan
        const planId = await practiceDataService.create('practicePlans', planData);
        const timestamp = new Date();
        savedPlan = { ...currentPlan, id: planId, createdAt: timestamp, updatedAt: timestamp };
      }

      setCurrentPlan(savedPlan);
      updateWorkflowProgress(4, true);

      toast({
        title: 'Plan Saved!',
        description: 'Your practice plan has been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: unknown) {
      console.error('Error saving practice plan:', error);

      const maybeError = error as { code?: string };
      let errorMessage = 'Failed to save practice plan. Please try again.';
      if (maybeError.code === 'permission-denied') {
        errorMessage = 'You do not have permission to save practice plans. Please check your authentication.';
      } else if (maybeError.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please check your internet connection.';
      }
      
      toast({
        title: 'Save Failed',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Share plan
  const handleSharePlan = async () => {
    if (!currentPlan) return;

    try {
      // Create shareable link (in production, this would generate a unique URL)
      const shareData = {
        title: currentPlan.title,
        text: `Practice Plan: ${currentPlan.sport} - ${currentPlan.ageGroup}`,
        url: `${window.location.origin}/practice-plan/${currentPlan.id}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied!',
          description: 'Practice plan link copied to clipboard.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error: unknown) {
      console.error('Share failed:', error);
      toast({
        title: 'Share Failed',
        description: 'Failed to share practice plan. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Export plan
  const handleExportPlan = async () => {
    if (!currentPlan) return;

    try {
      // Create export data
      const exportData = {
        title: currentPlan.title,
        sport: currentPlan.sport,
        ageGroup: currentPlan.ageGroup,
        duration: currentPlan.duration,
        goals: currentPlan.goals,
        periods: currentPlan.periods,
        notes: currentPlan.notes,
        createdAt: currentPlan.createdAt,
        exportedAt: new Date(),
      };

      // Convert to JSON and download
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentPlan.title.replace(/\s+/g, '-')}-practice-plan.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Plan Exported!',
        description: 'Practice plan exported successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: unknown) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export practice plan. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={6} maxW="7xl" mx="auto">
      {/* Header with Progress */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" color="gray.800" mb={2}>
              Practice Planner
            </Heading>
            <Text color="gray.600">
              Create intelligent practice plans with AI assistance
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
            <Button leftIcon={<Icon as={Settings} />} variant="ghost" size="sm">
              Settings
            </Button>
          </HStack>
        </Flex>

        {/* Sync Status Indicator */}
        {syncStatus && (
          <Alert 
            status={syncStatus.isOnline ? 'success' : 'warning'} 
            mb={4}
            borderRadius="md"
          >
            <AlertIcon />
            <Box>
              <AlertTitle>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </AlertTitle>
              <AlertDescription>
                {syncStatus.isOnline 
                  ? syncStatus.isSyncing 
                    ? 'Syncing data...' 
                    : syncStatus.lastSync 
                      ? `Last synced: ${syncStatus.lastSync.toLocaleTimeString()}`
                      : 'Ready to sync'
                  : 'Working offline - changes will sync when online'
                }
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Center py={8}>
            <VStack spacing={4}>
              <Spinner size="xl" color="brand.500" />
              <Text color="gray.600">Loading practice plans...</Text>
            </VStack>
          </Center>
        )}

        {/* Workflow Progress */}
        {!isLoading && (
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
        )}

      {/* Help Panel */}
      {showHelp && (
        <Alert status="info" borderRadius="xl" mb={6}>
          <AlertIcon />
          <Box>
            <AlertTitle>Quick Tips</AlertTitle>
            <AlertDescription>
              <List spacing={2} mt={2}>
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  Use <Kbd>Ctrl + Enter</Kbd> to quickly generate AI plans
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  Templates provide quick-start options for common practice
                  types
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  AI suggestions improve with more specific goals and context
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  Save plans to build your personal practice library
                </ListItem>
              </List>
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <Tabs
        variant="enclosed"
        colorScheme="blue"
        index={activeTab === 'create' ? 0 : 1}
        onChange={index => setActiveTab(index === 0 ? 'create' : 'library')}
      >
        <TabList>
          <Tab>
            <Icon as={Plus} mr={2} />
            Create Plan
          </Tab>
          <Tab>
            <Icon as={BookOpen} mr={2} />
            Plan Library
          </Tab>
        </TabList>

        <TabPanels>
          {/* Create Plan Tab */}
          <TabPanel>
            <Grid
              templateColumns={responsiveStyles.grid['2'].gridTemplateColumns}
              gap={useBreakpointValue(RESPONSIVE_SPACING.xl)}
            >
              {/* Main Form */}
              <VStack
                spacing={useBreakpointValue(RESPONSIVE_SPACING.lg)}
                align="stretch"
              >
                {/* Quick Start Templates */}
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
                      <VStack
                        align={{ base: 'center', sm: 'start' }}
                        spacing={1}
                      >
                        <Heading
                          size={useBreakpointValue(RESPONSIVE_FONTS.md)}
                          color="gray.800"
                          textAlign={{ base: 'center', sm: 'left' }}
                        >
                          Quick Start Templates
                        </Heading>
                        <Text
                          fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)}
                          color="gray.600"
                          textAlign={{ base: 'center', sm: 'left' }}
                        >
                          Get started quickly with pre-configured practice types
                        </Text>
                      </VStack>
                    </Stack>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid
                      templateColumns={responsiveStyles.grid['2'].gridTemplateColumns}
                      spacing={useBreakpointValue(RESPONSIVE_SPACING.md)}
                    >
                      {quickStartTemplates.map((template, index) => (
                        <Card
                          key={index}
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
                          onClick={() => applyTemplate(template)}
                        >
                          <CardBody
                            p={useBreakpointValue(RESPONSIVE_SPACING.md)}
                          >
                            <VStack
                              align={{ base: 'center', sm: 'start' }}
                              spacing={2}
                            >
                              <Text
                                fontWeight="semibold"
                                color="gray.800"
                                fontSize={useBreakpointValue(
                                  RESPONSIVE_FONTS.sm
                                )}
                                textAlign={{ base: 'center', sm: 'left' }}
                              >
                                {template.name}
                              </Text>
                              <Text
                                fontSize={useBreakpointValue(
                                  RESPONSIVE_FONTS.sm
                                )}
                                color="gray.600"
                                textAlign={{ base: 'center', sm: 'left' }}
                              >
                                {template.description}
                              </Text>
                              <Stack
                                direction={{ base: 'column', sm: 'row' }}
                                spacing={2}
                                justify={{ base: 'center', sm: 'start' }}
                              >
                                <Badge colorScheme="blue" size="sm">
                                  {template.sport}
                                </Badge>
                                <Badge colorScheme="green" size="sm">
                                  {template.duration}min
                                </Badge>
                              </Stack>
                              <Button
                                size={{ base: 'sm', md: 'sm' }}
                                colorScheme="blue"
                                variant="ghost"
                                rightIcon={<Icon as={ArrowRight} />}
                                w={{ base: 'full', sm: 'auto' }}
                              >
                                Use Template
                              </Button>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Plan Configuration */}
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
                      <Icon as={Settings} color="blue.500" boxSize={5} />
                      <Heading
                        size={useBreakpointValue(RESPONSIVE_FONTS.md)}
                        color="gray.800"
                        textAlign={{ base: 'center', sm: 'left' }}
                      >
                        Plan Configuration
                      </Heading>
                    </Stack>
                  </CardHeader>
                  <CardBody>
                <Grid
                  templateColumns={responsiveStyles.grid['3'].gridTemplateColumns}
                  gap={useBreakpointValue(RESPONSIVE_SPACING.lg)}
                >
                      <FormControl>
                        <FormLabel
                          fontWeight="semibold"
                          color="gray.700"
                          fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)}
                        >
                          Plan Title
                        </FormLabel>
                        <Input
                          placeholder="Enter practice plan title"
                          value={planTitle}
                          onChange={e => setPlanTitle(e.target.value)}
                          size={{ base: 'md', md: 'lg' }}
                          borderRadius="xl"
                          w="full"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel
                          fontWeight="semibold"
                          color="gray.700"
                          fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)}
                        >
                          Sport
                        </FormLabel>
                        <Select
                          value={sport}
                          onChange={e => handleSportChange(e.target.value)}
                          size={{ base: 'md', md: 'lg' }}
                          borderRadius="xl"
                          w="full"
                        >
                          <option value="Football">🏈 Football</option>
                          <option value="Basketball">🏀 Basketball</option>
                          <option value="Soccer">⚽ Soccer</option>
                          <option value="Baseball">⚾ Baseball</option>
                          <option value="Volleyball">🏐 Volleyball</option>
                        </Select>
                        <FormHelperText>Current: {sport}</FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel fontWeight="semibold" color="gray.700">
                          Age Group
                        </FormLabel>
                        <Select
                          value={ageGroup}
                          onChange={e => handleAgeGroupChange(e.target.value)}
                          size="lg"
                          borderRadius="xl"
                        >
                          <option value="8-10">8-10 years</option>
                          <option value="11-13">11-13 years</option>
                          <option value="14-16">14-16 years</option>
                          <option value="17-18">17-18 years</option>
                          <option value="19+">19+ years</option>
                        </Select>
                        <FormHelperText>Current: {ageGroup}</FormHelperText>
                      </FormControl>
                    </Grid>

                    <Grid
                      templateColumns={{ base: '1fr', md: '1fr 1fr' }}
                      gap={6}
                      mt={6}
                    >
                      <FormControl>
                        <FormLabel fontWeight="semibold" color="gray.700">
                          Duration (minutes)
                        </FormLabel>
                        <NumberInput
                          value={duration}
                          onChange={(_, value) => setDuration(value)}
                          min={15}
                          max={240}
                          step={15}
                          size="lg"
                        >
                          <NumberInputField borderRadius="xl" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>

                      <FormControl>
                        <FormLabel fontWeight="semibold" color="gray.700">
                          Difficulty Level
                        </FormLabel>
                        <Select
                          value={difficulty}
                          onChange={e => setDifficulty(e.target.value as any)}
                          size="lg"
                          borderRadius="xl"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </Select>
                      </FormControl>
                    </Grid>
                  </CardBody>
                </Card>

                {/* Goals & Objectives */}
                <Card
                  bg={bgColor}
                  border="1px"
                  borderColor={borderColor}
                  shadow="sm"
                >
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Target} mr={2} color="blue.500" />
                      Goals & Objectives
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Select the main focus areas for this practice session
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                      {sportGoals[sport as keyof typeof sportGoals]?.map(
                        goal => (
                          <Tag
                            key={goal}
                            size="lg"
                            variant={goals.includes(goal) ? 'solid' : 'outline'}
                            colorScheme={goals.includes(goal) ? 'blue' : 'gray'}
                            cursor="pointer"
                            onClick={() => {
                              if (goals.includes(goal)) {
                                setGoals(goals.filter(g => g !== goal));
                              } else {
                                setGoals([...goals, goal]);
                              }
                            }}
                            _hover={{
                              transform: 'scale(1.05)',
                              shadow: 'md',
                            }}
                            transition="all 0.2s"
                          >
                            <TagLabel>{goal}</TagLabel>
                            {goals.includes(goal) && <TagCloseButton />}
                          </Tag>
                        )
                      )}
                    </SimpleGrid>

                    {goals.length > 0 && (
                      <Box mt={4} p={4} bg={cardBg} borderRadius="xl">
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.700"
                          mb={2}
                        >
                          Selected Goals ({goals.length}):
                        </Text>
                        <HStack spacing={2} flexWrap="wrap">
                          {goals.map(goal => (
                            <Badge
                              key={goal}
                              colorScheme="blue"
                              variant="subtle"
                            >
                              {goal}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}
                  </CardBody>
                </Card>

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
                      AI-Powered Generation
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Let AI create a comprehensive practice plan based on your
                      inputs
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Button
                        leftIcon={<Icon as={Sparkles} />}
                        colorScheme="purple"
                        size="lg"
                        onClick={generateAISuggestions}
                        isLoading={isGenerating}
                        loadingText="Generating Plan..."
                        isDisabled={!sport || !ageGroup || goals.length === 0}
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
                        Generate AI Practice Plan
                      </Button>

                      {aiConfidence > 0 && (
                        <Box p={4} bg={cardBg} borderRadius="xl">
                          <HStack justify="space-between" mb={2}>
                            <Text
                              fontSize="sm"
                              fontWeight="semibold"
                              color="gray.700"
                            >
                              AI Confidence
                            </Text>
                            <Badge colorScheme="green" variant="subtle">
                              {aiConfidence}%
                            </Badge>
                          </HStack>
                          <Progress
                            value={aiConfidence}
                            colorScheme="green"
                            borderRadius="full"
                          />
                        </Box>
                      )}

                      {aiSuggestions.length > 0 && (
                        <Box p={4} bg={cardBg} borderRadius="xl">
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            color="gray.700"
                            mb={3}
                          >
                            AI Suggestions:
                          </Text>
                          <List spacing={2}>
                            {aiSuggestions.map((suggestion, index) => (
                              <ListItem key={index}>
                                <ListIcon as={Brain} color="yellow.500" />
                                {suggestion}
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                {/* Plan Notes */}
                <Card
                  bg={bgColor}
                  border="1px"
                  borderColor={borderColor}
                  shadow="sm"
                >
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Edit} mr={2} color="blue.500" />
                      Additional Notes
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <Textarea
                      placeholder="Add any additional notes, special instructions, or reminders for this practice session..."
                      value={planNotes}
                      onChange={e => setPlanNotes(e.target.value)}
                      rows={4}
                      borderRadius="xl"
                      resize="vertical"
                    />
                  </CardBody>
                </Card>
              </VStack>

              {/* Sidebar - Plan Preview & Actions */}
              <VStack spacing={6} align="stretch">
                {/* Plan Preview */}
                <Card
                  bg={bgColor}
                  border="1px"
                  borderColor={borderColor}
                  shadow="sm"
                  position="sticky"
                  top={6}
                >
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Eye} mr={2} color="blue.500" />
                      Plan Preview
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    {currentPlan ? (
                      <VStack spacing={4} align="stretch">
                        <Box p={4} bg={cardBg} borderRadius="xl">
                          <Text fontWeight="semibold" color="gray.800" mb={2}>
                            {currentPlan.title}
                          </Text>
                          <HStack spacing={2} mb={2}>
                            <Badge colorScheme="blue" size="sm">
                              {currentPlan.sport}
                            </Badge>
                            <Badge colorScheme="green" size="sm">
                              {currentPlan.duration}min
                            </Badge>
                            <Badge colorScheme="purple" size="sm">
                              {currentPlan.difficulty}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {currentPlan.periods?.length || 0} practice periods
                          </Text>
                        </Box>

                        <VStack spacing={3} align="stretch">
                          <Button
                            leftIcon={<Icon as={Save} />}
                            colorScheme="blue"
                            onClick={handleSavePlan}
                            size="lg"
                            borderRadius="xl"
                          >
                            Save Plan
                          </Button>

                          <Button
                            leftIcon={<Icon as={Share} />}
                            variant="outline"
                            onClick={handleSharePlan}
                            size="lg"
                            borderRadius="xl"
                          >
                            Share Plan
                          </Button>

                          <Button
                            leftIcon={<Icon as={Download} />}
                            variant="outline"
                            onClick={handleExportPlan}
                            size="lg"
                            borderRadius="xl"
                          >
                            Export Plan
                          </Button>
                        </VStack>
                      </VStack>
                    ) : (
                      <Box textAlign="center" py={8}>
                        <Icon
                          as={BookOpen}
                          boxSize={12}
                          color="gray.400"
                          mb={4}
                        />
                        <Text color="gray.500" fontSize="sm">
                          Complete the form and generate a plan to see a preview
                          here
                        </Text>
                      </Box>
                    )}
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
                          💡 More specific goals = Better AI suggestions
                        </Text>
                      </Box>
                      <Box p={3} bg={cardBg} borderRadius="lg">
                        <Text
                          fontSize="sm"
                          color="gray.700"
                          fontWeight="medium"
                        >
                          ⏱️ Optimal practice duration: 60-120 minutes
                        </Text>
                      </Box>
                      <Box p={3} bg={cardBg} borderRadius="lg">
                        <Text
                          fontSize="sm"
                          color="gray.700"
                          fontWeight="medium"
                        >
                          🎯 Focus on 2-3 main objectives per session
                        </Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </Grid>
          </TabPanel>

          {/* Plan Library Tab */}
          <TabPanel>
            <PracticePlanLibrary
              onSelectPlan={plan => {
                setCurrentPlan(plan);
                setActiveTab('create');
              }}
              onEditPlan={plan => {
                setCurrentPlan(plan);
                setActiveTab('create');
              }}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
    </Box>  );
};

export default ModernPracticePlanner;
