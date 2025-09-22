import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Badge,
  Input,
  Textarea,
  Select,
  useToast,
  useColorModeValue,
  SimpleGrid,
  Flex,
  Spacer,
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
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Tooltip,
  IconButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Skeleton,
  SkeletonText,
  Fade,
  ScaleFade,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  List,
  ListItem,
  ListIcon,
  Avatar,
  AvatarGroup,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tag,
  TagLabel,
  TagCloseButton,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import {
  Plus,
  Save,
  Download,
  Share,
  Edit,
  Trash2,
  Eye,
  Play,
  Users,
  Target,
  Clock,
  Settings,
  Calendar,
  Brain,
  Zap,
  Star,
  TrendingUp,
  CheckCircle,
  HelpCircle,
  Sparkles,
  AlertTriangle,
  Info,
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
  FileText,
  Image,
  Video,
  Trophy,
  BarChart3,
  Activity,
  RefreshCw,
  Timer,
  BookOpen,
  Search,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';

// Types
interface Drill {
  id: string;
  name: string;
  description: string;
  duration: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  objectives: string[];
  instructions: string[];
  variations: string[];
  successCriteria: string[];
  notes: string;
  thumbnail?: string;
}

interface PracticePeriod {
  id: string;
  name: string;
  duration: number;
  type: 'warmup' | 'skill' | 'tactical' | 'scrimmage' | 'cooldown';
  drills: Drill[];
  objectives: string[];
  notes: string;
  order: number;
}

interface PracticePlan {
  id: string;
  title: string;
  description: string;
  sport: string;
  ageGroup: string;
  duration: number;
  goals: string[];
  periods: PracticePeriod[];
  notes: string;
  teamId: string;
  createdAt: Date;
  lastModified: Date;
  aiConfidence?: number;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Mock drill library
const DRILL_LIBRARY: Drill[] = [
  {
    id: 'drill-1',
    name: 'Passing Accuracy',
    description: 'Improve quarterback passing accuracy with moving targets',
    duration: 15,
    category: 'passing',
    difficulty: 'intermediate',
    equipment: ['footballs', 'cones', 'targets'],
    objectives: ['Improve accuracy', 'Work on timing', 'Build confidence'],
    instructions: [
      'Set up cones 10 yards apart',
      'QB throws to moving receivers',
      'Focus on leading the receiver',
      'Track completion percentage'
    ],
    variations: ['Add pressure', 'Increase distance', 'Change angles'],
    successCriteria: ['80% completion rate', 'Proper form', 'Good timing'],
    notes: 'Great for building QB confidence',
  },
  {
    id: 'drill-2',
    name: 'Tackling Fundamentals',
    description: 'Basic tackling technique and safety',
    duration: 20,
    category: 'defense',
    difficulty: 'beginner',
    equipment: ['tackling dummies', 'helmets', 'shoulder pads'],
    objectives: ['Learn proper form', 'Build confidence', 'Stay safe'],
    instructions: [
      'Start with stationary dummies',
      'Focus on head up, eyes up',
      'Drive through with legs',
      'Wrap up with arms'
    ],
    variations: ['Add movement', 'Increase speed', 'Live tackling'],
    successCriteria: ['Proper form', 'No injuries', 'Good technique'],
    notes: 'Emphasize safety first',
  },
  {
    id: 'drill-3',
    name: 'Route Running',
    description: 'Perfect receiver route running technique',
    duration: 25,
    category: 'offense',
    difficulty: 'intermediate',
    equipment: ['cones', 'footballs', 'stopwatch'],
    objectives: ['Crisp cuts', 'Proper timing', 'Catch everything'],
    instructions: [
      'Set up route cones',
      'Practice each route 5 times',
      'Focus on sharp cuts',
      'Work on timing with QB'
    ],
    variations: ['Add defenders', 'Change routes', 'Increase speed'],
    successCriteria: ['Sharp cuts', 'Good timing', 'Clean catches'],
    notes: 'Repetition is key',
  },
];

const EnhancedPracticePlanner: React.FC = () => {
  // State
  const [currentPlan, setCurrentPlan] = useState<PracticePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showDrillLibrary, setShowDrillLibrary] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PracticePeriod | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Form state
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [sport, setSport] = useState('football');
  const [ageGroup, setAgeGroup] = useState('high-school');
  const [duration, setDuration] = useState(90);
  const [goals, setGoals] = useState<string[]>([]);
  const [planNotes, setPlanNotes] = useState('');

  // Refs
  const toast = useToast();

  // Color values
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Load practice plan on mount
  useEffect(() => {
    loadPracticePlan();
  }, []);

  const loadPracticePlan = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockPlan: PracticePlan = {
        id: 'plan-1',
        title: 'Weekly Practice Plan',
        description: 'Comprehensive practice focusing on fundamentals and team building',
        sport: 'football',
        ageGroup: 'high-school',
        duration: 90,
        goals: ['Improve passing', 'Build defense', 'Team chemistry'],
        periods: [
          {
            id: 'period-1',
            name: 'Warm-up',
            duration: 10,
            type: 'warmup',
            drills: [],
            objectives: ['Get loose', 'Prepare for practice'],
            notes: 'Light jogging and stretching',
            order: 1,
          },
          {
            id: 'period-2',
            name: 'Skills Development',
            duration: 30,
            type: 'skill',
            drills: [],
            objectives: ['Improve fundamentals', 'Build technique'],
            notes: 'Focus on individual skills',
            order: 2,
          },
          {
            id: 'period-3',
            name: 'Tactical Work',
            duration: 35,
            type: 'tactical',
            drills: [],
            objectives: ['Team concepts', 'Game situations'],
            notes: 'Work on plays and schemes',
            order: 3,
          },
          {
            id: 'period-4',
            name: 'Scrimmage',
            duration: 10,
            type: 'scrimmage',
            drills: [],
            objectives: ['Apply skills', 'Game simulation'],
            notes: 'Live action practice',
            order: 4,
          },
          {
            id: 'period-5',
            name: 'Cool-down',
            duration: 5,
            type: 'cooldown',
            drills: [],
            objectives: ['Recovery', 'Reflection'],
            notes: 'Stretching and team talk',
            order: 5,
          },
        ],
        notes: 'Great practice plan for building team fundamentals',
        teamId: 'team-1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        aiConfidence: 0.85,
        tags: ['fundamentals', 'team-building'],
        difficulty: 'intermediate',
      };
      
      setCurrentPlan(mockPlan);
    } catch (error) {
      setError('Failed to load practice plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!currentPlan) return;

    try {
      setIsSaving(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Practice Plan Saved!',
        description: 'Your practice plan has been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save practice plan. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentPlan) return;

    try {
      // Simulate PDF export
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'PDF Exported!',
        description: 'Your practice plan has been exported as PDF.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export PDF. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddDrill = (periodId: string, drill: Drill) => {
    if (!currentPlan) return;

    const updatedPlan = {
      ...currentPlan,
      periods: currentPlan.periods.map(period => 
        period.id === periodId 
          ? { ...period, drills: [...period.drills, drill] }
          : period
      )
    };

    setCurrentPlan(updatedPlan);
    
    toast({
      title: 'Drill Added!',
      description: `${drill.name} has been added to the practice plan.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleRemoveDrill = (periodId: string, drillId: string) => {
    if (!currentPlan) return;

    const updatedPlan = {
      ...currentPlan,
      periods: currentPlan.periods.map(period => 
        period.id === periodId 
          ? { ...period, drills: period.drills.filter(drill => drill.id !== drillId) }
          : period
      )
    };

    setCurrentPlan(updatedPlan);
  };

  const handleUpdatePeriodDuration = (periodId: string, newDuration: number) => {
    if (!currentPlan) return;

    const updatedPlan = {
      ...currentPlan,
      periods: currentPlan.periods.map(period => 
        period.id === periodId 
          ? { ...period, duration: newDuration }
          : period
      )
    };

    setCurrentPlan(updatedPlan);
  };

  const filteredDrills = DRILL_LIBRARY.filter(drill => {
    const matchesSearch = drill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         drill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || drill.category === filterCategory;
    const matchesDifficulty = filterDifficulty === 'all' || drill.difficulty === filterDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warmup': return Clock;
      case 'skill': return Target;
      case 'tactical': return Brain;
      case 'scrimmage': return Play;
      case 'cooldown': return Timer;
      default: return Clock;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warmup': return 'blue';
      case 'skill': return 'green';
      case 'tactical': return 'purple';
      case 'scrimmage': return 'red';
      case 'cooldown': return 'gray';
      default: return 'gray';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const totalDuration = currentPlan?.periods.reduce((sum, period) => sum + period.duration, 0) || 0;

  if (isLoading) {
    return (
      <Box p={6}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="60px" />
          <Skeleton height="200px" />
          <Skeleton height="300px" />
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      {/* Header */}
      <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} p={4}>
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="gray.800">
              Practice Planner
            </Heading>
            <Text color="gray.600">
              Design and manage your team's practice sessions
            </Text>
          </VStack>
          
          <HStack spacing={3}>
            <Button
              leftIcon={<Plus />}
              colorScheme="brand"
              onClick={() => setShowDrillLibrary(true)}
            >
              Add Drills
            </Button>
            <Button
              leftIcon={<Save />}
              variant="outline"
              onClick={handleSavePlan}
              isLoading={isSaving}
            >
              Save Plan
            </Button>
            <Button
              leftIcon={<Download />}
              variant="outline"
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box p={6}>
        {currentPlan ? (
          <VStack spacing={6} align="stretch">
            {/* Plan Overview */}
            <Card bg={bgColor} border="1px" borderColor={borderColor}>
              <CardHeader>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Heading size="md">{currentPlan.title}</Heading>
                    <Text color="gray.600">{currentPlan.description}</Text>
                  </VStack>
                  <HStack>
                    <Badge colorScheme={getDifficultyColor(currentPlan.difficulty)}>
                      {currentPlan.difficulty}
                    </Badge>
                    <Badge colorScheme="blue">{currentPlan.sport}</Badge>
                    <Badge colorScheme="green">{currentPlan.ageGroup}</Badge>
                  </HStack>
                </HStack>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Stat>
                    <StatLabel>Total Duration</StatLabel>
                    <StatNumber>{totalDuration} min</StatNumber>
                    <StatHelpText>
                      <StatArrow type={totalDuration > duration ? 'increase' : 'decrease'} />
                      {Math.abs(totalDuration - duration)} min from target
                    </StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Periods</StatLabel>
                    <StatNumber>{currentPlan.periods.length}</StatNumber>
                    <StatHelpText>Practice segments</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Total Drills</StatLabel>
                    <StatNumber>
                      {currentPlan.periods.reduce((sum, period) => sum + period.drills.length, 0)}
                    </StatNumber>
                    <StatHelpText>Drills assigned</StatHelpText>
                  </Stat>
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* Practice Periods */}
            <VStack spacing={4} align="stretch">
              <Heading size="md">Practice Periods</Heading>
              {currentPlan.periods.map((period, index) => {
                const TypeIcon = getTypeIcon(period.type);
                return (
                  <ScaleFade key={period.id} in={true} delay={index * 0.1}>
                    <Card bg={bgColor} border="1px" borderColor={borderColor}>
                      <CardHeader>
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={TypeIcon} boxSize={6} color={`${getTypeColor(period.type)}.500`} />
                            <VStack align="start" spacing={1}>
                              <Heading size="sm">{period.name}</Heading>
                              <Text color="gray.600">{period.objectives.join(', ')}</Text>
                            </VStack>
                          </HStack>
                          <HStack spacing={4}>
                            <HStack>
                              <Icon as={Clock} boxSize={4} color="gray.500" />
                              <NumberInput
                                value={period.duration}
                                onChange={(value) => handleUpdatePeriodDuration(period.id, parseInt(value) || 0)}
                                min={1}
                                max={60}
                                size="sm"
                                w="80px"
                              >
                                <NumberInputField />
                                <NumberInputStepper>
                                  <NumberIncrementStepper />
                                  <NumberDecrementStepper />
                                </NumberInputStepper>
                              </NumberInput>
                              <Text fontSize="sm" color="gray.500">min</Text>
                            </HStack>
                            <Button
                              size="sm"
                              colorScheme="brand"
                              variant="outline"
                              onClick={() => {
                                setSelectedPeriod(period);
                                setShowDrillLibrary(true);
                              }}
                            >
                              Add Drill
                            </Button>
                          </HStack>
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        {period.drills.length > 0 ? (
                          <VStack spacing={3} align="stretch">
                            {period.drills.map((drill) => (
                              <Card
                                key={drill.id}
                                size="sm"
                                bg={cardBg}
                                border="1px"
                                borderColor={borderColor}
                              >
                                <CardBody>
                                  <HStack justify="space-between">
                                    <VStack align="start" spacing={1}>
                                      <HStack>
                                        <Text fontWeight="semibold" fontSize="sm">
                                          {drill.name}
                                        </Text>
                                        <Badge colorScheme={getDifficultyColor(drill.difficulty)} size="sm">
                                          {drill.difficulty}
                                        </Badge>
                                      </HStack>
                                      <Text fontSize="xs" color="gray.600">
                                        {drill.description}
                                      </Text>
                                      <HStack spacing={2}>
                                        <HStack spacing={1}>
                                          <Icon as={Clock} boxSize={3} color="gray.500" />
                                          <Text fontSize="xs" color="gray.500">
                                            {drill.duration} min
                                          </Text>
                                        </HStack>
                                        <HStack spacing={1}>
                                          <Icon as={Target} boxSize={3} color="gray.500" />
                                          <Text fontSize="xs" color="gray.500">
                                            {drill.category}
                                          </Text>
                                        </HStack>
                                      </HStack>
                                    </VStack>
                                    <IconButton
                                      aria-label="Remove drill"
                                      icon={<Trash2 />}
                                      size="sm"
                                      variant="ghost"
                                      colorScheme="red"
                                      onClick={() => handleRemoveDrill(period.id, drill.id)}
                                    />
                                  </HStack>
                                </CardBody>
                              </Card>
                            ))}
                          </VStack>
                        ) : (
                          <Box textAlign="center" py={4}>
                            <Icon as={Target} boxSize={8} color="gray.400" mb={2} />
                            <Text color="gray.500" fontSize="sm">
                              No drills assigned yet
                            </Text>
                            <Button
                              size="sm"
                              colorScheme="brand"
                              variant="outline"
                              mt={2}
                              onClick={() => {
                                setSelectedPeriod(period);
                                setShowDrillLibrary(true);
                              }}
                            >
                              Add First Drill
                            </Button>
                          </Box>
                        )}
                      </CardBody>
                    </Card>
                  </ScaleFade>
                );
              })}
            </VStack>
          </VStack>
        ) : (
          <Box textAlign="center" py={12}>
            <Icon as={Calendar} boxSize={16} color="gray.400" mb={4} />
            <Heading size="lg" color="gray.600" mb={2}>
              No Practice Plan
            </Heading>
            <Text color="gray.500" mb={6}>
              Create a new practice plan to get started.
            </Text>
            <Button
              leftIcon={<Plus />}
              colorScheme="brand"
              size="lg"
            >
              Create Practice Plan
            </Button>
          </Box>
        )}
      </Box>

      {/* Drill Library Drawer */}
      <Drawer
        isOpen={showDrillLibrary}
        onClose={() => setShowDrillLibrary(false)}
        size="lg"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>
            <HStack justify="space-between">
              <Text>Drill Library</Text>
              <HStack spacing={2}>
                <Input
                  placeholder="Search drills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="sm"
                  w="200px"
                />
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  size="sm"
                  w="150px"
                >
                  <option value="all">All Categories</option>
                  <option value="passing">Passing</option>
                  <option value="running">Running</option>
                  <option value="defense">Defense</option>
                  <option value="special">Special Teams</option>
                </Select>
                <Select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  size="sm"
                  w="120px"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </HStack>
            </HStack>
          </DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {filteredDrills.map((drill) => (
                <Card
                  key={drill.id}
                  cursor="pointer"
                  _hover={{ bg: 'gray.50' }}
                  onClick={() => {
                    if (selectedPeriod) {
                      handleAddDrill(selectedPeriod.id, drill);
                      setShowDrillLibrary(false);
                    }
                  }}
                >
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                          <Heading size="sm">{drill.name}</Heading>
                          <Text fontSize="sm" color="gray.600">
                            {drill.description}
                          </Text>
                        </VStack>
                        <HStack>
                          <Badge colorScheme={getDifficultyColor(drill.difficulty)}>
                            {drill.difficulty}
                          </Badge>
                          <Badge colorScheme="blue">{drill.category}</Badge>
                        </HStack>
                      </HStack>

                      <HStack spacing={4} fontSize="sm" color="gray.600">
                        <HStack>
                          <Icon as={Clock} boxSize={4} />
                          <Text>{drill.duration} min</Text>
                        </HStack>
                        <HStack>
                          <Icon as={Target} boxSize={4} />
                          <Text>{drill.objectives.length} objectives</Text>
                        </HStack>
                        <HStack>
                          <Icon as={Users} boxSize={4} />
                          <Text>{drill.equipment.length} equipment</Text>
                        </HStack>
                      </HStack>

                      <HStack spacing={1} wrap="wrap">
                        {drill.objectives.slice(0, 3).map((objective) => (
                          <Tag key={objective} size="sm" colorScheme="gray" variant="subtle">
                            <TagLabel>{objective}</TagLabel>
                          </Tag>
                        ))}
                      </HStack>

                      {selectedPeriod && (
                        <Button
                          size="sm"
                          colorScheme="brand"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddDrill(selectedPeriod.id, drill);
                            setShowDrillLibrary(false);
                          }}
                        >
                          Add to {selectedPeriod.name}
                        </Button>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default EnhancedPracticePlanner;


