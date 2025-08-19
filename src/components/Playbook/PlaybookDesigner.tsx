import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  IconButton,
  Tooltip,
  useToast,
  useColorModeValue,
  SimpleGrid,
  Grid,
  GridItem,
  Flex,
  Spacer,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Divider,
  List,
  ListItem,
  ListIcon,
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
  Progress,
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
  Grid3X3,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Star,
  Zap,
  Shield,
  Sword,
  BookOpen,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  CheckCircle,
  HelpCircle,
  Sparkles,
  TrendingUp,
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
} from 'lucide-react';

interface Player {
  id: string;
  number: string;
  position: string;
  name: string;
  x: number;
  y: number;
  color: string;
  isActive: boolean;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  role: 'offense' | 'defense' | 'special';
}

interface PlayStep {
  id: string;
  order: number;
  description: string;
  duration: number;
  playerMovements: {
    playerId: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    route: 'straight' | 'curved' | 'zigzag';
    speed: 'slow' | 'medium' | 'fast';
  }[];
  notes: string;
}

interface Play {
  id: string;
  name: string;
  description: string;
  formation: string;
  players: Player[];
  steps: PlayStep[];
  category: 'offense' | 'defense' | 'special';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  successRate: number;
  tags: string[];
  createdAt: Date;
  lastModified: Date;
}

interface Formation {
  id: string;
  name: string;
  sport: string;
  positions: {
    x: number;
    y: number;
    position: string;
    number: string;
    color: string;
  }[];
  description: string;
  category: 'offense' | 'defense' | 'special';
}

interface WorkflowStep {
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
}

const PlaybookDesigner: React.FC = () => {
  const [currentPlay, setCurrentPlay] = useState<Play | null>(null);
  const [plays, setPlays] = useState<Play[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [drawingMode, setDrawingMode] = useState<'select' | 'draw' | 'erase'>('select');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowStep[]>([
    { title: 'Formation Setup', description: 'Choose or create formation', isCompleted: false, isRequired: true },
    { title: 'Player Placement', description: 'Position players on field', isCompleted: false, isRequired: true },
    { title: 'Route Design', description: 'Design player movements', isCompleted: false, isRequired: true },
    { title: 'Play Details', description: 'Add play information', isCompleted: false, isRequired: true },
    { title: 'Save & Share', description: 'Save play and share', isCompleted: false, isRequired: false },
  ]);
  
  // Form state
  const [playName, setPlayName] = useState('');
  const [playDescription, setPlayDescription] = useState('');
  const [playCategory, setPlayCategory] = useState<'offense' | 'defense' | 'special'>('offense');
  const [playDifficulty, setPlayDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [playTags, setPlayTags] = useState<string[]>([]);
  
  // AI and suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAITips, setShowAITips] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState('design');
  const [showFormationLibrary, setShowFormationLibrary] = useState(false);
  const [showPlayLibrary, setShowPlayLibrary] = useState(false);
  const [canvasRef] = useState(useRef<HTMLDivElement>(null));
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Predefined formations for different sports
  const defaultFormations: Formation[] = [
    {
      id: 'shotgun',
      name: 'Shotgun',
      sport: 'Football',
      category: 'offense',
      description: 'Modern spread offense formation',
      positions: [
        { x: 50, y: 20, position: 'QB', number: '12', color: 'blue.500' },
        { x: 30, y: 15, position: 'RB', number: '25', color: 'green.500' },
        { x: 70, y: 15, position: 'RB', number: '33', color: 'green.500' },
        { x: 20, y: 10, position: 'WR', number: '84', color: 'red.500' },
        { x: 80, y: 10, position: 'WR', number: '88', color: 'red.500' },
        { x: 40, y: 5, position: 'WR', number: '81', color: 'red.500' },
        { x: 60, y: 5, position: 'TE', number: '85', color: 'orange.500' },
        { x: 15, y: 0, position: 'LT', number: '74', color: 'gray.500' },
        { x: 25, y: 0, position: 'LG', number: '70', color: 'gray.500' },
        { x: 50, y: 0, position: 'C', number: '66', color: 'gray.500' },
        { x: 75, y: 0, position: 'RG', number: '71', color: 'gray.500' },
        { x: 85, y: 0, position: 'RT', number: '77', color: 'gray.500' },
      ]
    },
    {
      id: 'i-formation',
      name: 'I-Formation',
      sport: 'Football',
      category: 'offense',
      description: 'Traditional power running formation',
      positions: [
        { x: 50, y: 20, position: 'QB', number: '12', color: 'blue.500' },
        { x: 50, y: 15, position: 'FB', number: '44', color: 'green.500' },
        { x: 50, y: 10, position: 'RB', number: '25', color: 'green.500' },
        { x: 20, y: 10, position: 'WR', number: '84', color: 'red.500' },
        { x: 80, y: 10, position: 'WR', number: '88', color: 'red.500' },
        { x: 40, y: 5, position: 'TE', number: '85', color: 'orange.500' },
        { x: 15, y: 0, position: 'LT', number: '74', color: 'gray.500' },
        { x: 25, y: 0, position: 'LG', number: '70', color: 'gray.500' },
        { x: 50, y: 0, position: 'C', number: '66', color: 'gray.500' },
        { x: 75, y: 0, position: 'RG', number: '71', color: 'gray.500' },
        { x: 85, y: 0, position: 'RT', number: '77', color: 'gray.500' },
      ]
    },
    {
      id: 'spread',
      name: 'Spread',
      sport: 'Football',
      category: 'offense',
      description: 'Wide open passing formation',
      positions: [
        { x: 50, y: 20, position: 'QB', number: '12', color: 'blue.500' },
        { x: 30, y: 15, position: 'RB', number: '25', color: 'green.500' },
        { x: 15, y: 10, position: 'WR', number: '84', color: 'red.500' },
        { x: 85, y: 10, position: 'WR', number: '88', color: 'red.500' },
        { x: 25, y: 5, position: 'WR', number: '81', color: 'red.500' },
        { x: 75, y: 5, position: 'WR', number: '82', color: 'red.500' },
        { x: 15, y: 0, position: 'LT', number: '74', color: 'gray.500' },
        { x: 25, y: 0, position: 'LG', number: '70', color: 'gray.500' },
        { x: 50, y: 0, position: 'C', number: '66', color: 'gray.500' },
        { x: 75, y: 0, position: 'RG', number: '71', color: 'gray.500' },
        { x: 85, y: 0, position: 'RT', number: '77', color: 'gray.500' },
      ]
    }
  ];

  // Quick start play templates
  const quickStartPlays = [
    {
      name: 'Power Run',
      category: 'offense',
      formation: 'i-formation',
      description: 'Strong side power running play',
      difficulty: 'intermediate'
    },
    {
      name: 'Screen Pass',
      category: 'offense',
      formation: 'shotgun',
      description: 'Quick screen to running back',
      difficulty: 'beginner'
    },
    {
      name: 'Cover 2',
      category: 'defense',
      formation: '4-3',
      description: 'Two-deep zone coverage',
      difficulty: 'intermediate'
    },
    {
      name: 'Punt Return',
      category: 'special',
      formation: 'return',
      description: 'Punt return with blocking',
      difficulty: 'beginner'
    }
  ];

  // Update workflow progress
  const updateWorkflowProgress = (stepIndex: number, isCompleted: boolean) => {
    setWorkflowProgress(prev => 
      prev.map((step, index) => 
        index === stepIndex ? { ...step, isCompleted } : step
      )
    );
  };

  // Auto-complete workflow steps based on state
  useEffect(() => {
    if (selectedFormation) {
      updateWorkflowProgress(0, true);
    }
    if (currentPlay?.players && currentPlay.players.length > 0) {
      updateWorkflowProgress(1, true);
    }
    if (currentPlay?.steps && currentPlay.steps.length > 0) {
      updateWorkflowProgress(2, true);
    }
    if (playName && playDescription) {
      updateWorkflowProgress(3, true);
    }
  }, [selectedFormation, currentPlay, playName, playDescription]);

  // Apply formation template
  const applyFormation = (formation: Formation) => {
    setSelectedFormation(formation);
    
    // Create players from formation positions
    const players: Player[] = formation.positions.map((pos, index) => ({
      id: `player-${index}`,
      number: pos.number,
      position: pos.position,
      name: `${pos.position} ${pos.number}`,
      x: pos.x,
      y: pos.y,
      color: pos.color,
      isActive: true,
      skillLevel: 'intermediate',
      role: formation.category as any,
    }));

    // Create new play
    const newPlay: Play = {
      id: `play-${Date.now()}`,
      name: playName || 'New Play',
      description: playDescription || 'Play description',
      formation: formation.name,
      players,
      steps: [],
      category: formation.category as any,
      difficulty: playDifficulty,
      estimatedDuration: 30,
      successRate: 75,
      tags: playTags,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    setCurrentPlay(newPlay);
    updateWorkflowProgress(0, true);
  };

  // Apply quick start play template
  const applyPlayTemplate = (template: any) => {
    const formation = defaultFormations.find(f => f.id === template.formation);
    if (formation) {
      setPlayName(template.name);
      setPlayDescription(template.description);
      setPlayCategory(template.category as any);
      setPlayDifficulty(template.difficulty as any);
      applyFormation(formation);
    }
  };

  // Create new play
  const handleCreatePlay = () => {
    if (!selectedFormation) {
      toast({
        title: 'No Formation Selected',
        description: 'Please select a formation first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newPlay: Play = {
      id: `play-${Date.now()}`,
      name: playName || 'New Play',
      description: playDescription || 'Play description',
      formation: selectedFormation.name,
      players: selectedFormation.positions.map((pos, index) => ({
        id: `player-${index}`,
        number: pos.number,
        position: pos.position,
        name: `${pos.position} ${pos.number}`,
        x: pos.x,
        y: pos.y,
        color: pos.color,
        isActive: true,
        skillLevel: 'intermediate',
        role: selectedFormation.category as any,
      })),
      steps: [],
      category: playCategory,
      difficulty: playDifficulty,
      estimatedDuration: 30,
      successRate: 75,
      tags: playTags,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    setCurrentPlay(newPlay);
    toast({
      title: 'Play Created!',
      description: 'New play has been created. Start designing your routes.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Save play
  const handleSavePlay = () => {
    if (!currentPlay) return;
    
    const updatedPlay = { ...currentPlay, lastModified: new Date() };
    setPlays(prev => {
      const existingIndex = prev.findIndex(p => p.id === currentPlay.id);
      if (existingIndex >= 0) {
        const newPlays = [...prev];
        newPlays[existingIndex] = updatedPlay;
        return newPlays;
      } else {
        return [...prev, updatedPlay];
      }
    });
    
    updateWorkflowProgress(4, true);
    
    toast({
      title: 'Play Saved!',
      description: 'Your play has been saved successfully.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Delete play
  const handleDeletePlay = () => {
    if (!currentPlay) return;
    
    setPlays(prev => prev.filter(p => p.id !== currentPlay.id));
    setCurrentPlay(null);
    
    toast({
      title: 'Play Deleted',
      description: 'Play has been removed.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Export play
  const handleExportPlay = () => {
    if (!currentPlay) return;
    
    const data = JSON.stringify(currentPlay, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPlay.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Play Exported!',
      description: 'Play has been exported as JSON.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Share play
  const handleSharePlay = () => {
    if (!currentPlay) return;
    
    // For now, just copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(currentPlay, null, 2));
    
    toast({
      title: 'Play Shared!',
      description: 'Play data copied to clipboard.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {/* Header with Progress */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" color="gray.800" mb={2}>
              Playbook Designer
            </Heading>
            <Text color="gray.600">
              Design and visualize plays with professional tools
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
            <Stepper index={workflowProgress.filter(step => step.isCompleted).length} colorScheme="blue" size="sm">
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
                  <ListIcon as={CheckCircle} color="green.500" />
                  Use <Kbd>Ctrl + Click</Kbd> to place players on the field
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  Templates provide quick-start options for common formations
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  Draw routes by clicking and dragging from player to destination
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  Save plays to build your personal playbook library
                </ListItem>
              </List>
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <Tabs variant="enclosed" colorScheme="blue" index={activeTab === 'design' ? 0 : 1} onChange={(index) => setActiveTab(index === 0 ? 'design' : 'library')}>
        <TabList>
          <Tab>
            <Icon as={Edit} mr={2} />
            Design Play
          </Tab>
          <Tab>
            <Icon as={BookOpen} mr={2} />
            Play Library
          </Tab>
        </TabList>

        <TabPanels>
          {/* Design Play Tab */}
          <TabPanel>
            <Grid templateColumns={{ base: '1fr', lg: '3fr 1fr' }} gap={8}>
              {/* Main Canvas Area */}
              <VStack spacing={6} align="stretch">
                {/* Quick Start Templates */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Zap} mr={2} color="blue.500" />
                      Quick Start Templates
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Get started quickly with pre-configured play types
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {quickStartPlays.map((template, index) => (
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
                          onClick={() => applyPlayTemplate(template)}
                        >
                          <CardBody p={4}>
                            <Text fontWeight="semibold" color="gray.800" mb={2}>
                              {template.name}
                            </Text>
                            <Text fontSize="sm" color="gray.600" mb={3}>
                              {template.description}
                            </Text>
                            <HStack spacing={2} mb={3}>
                              <Badge colorScheme="blue" size="sm">
                                {template.category}
                              </Badge>
                              <Badge colorScheme="green" size="sm">
                                {template.difficulty}
                              </Badge>
                            </HStack>
                            <Button size="sm" colorScheme="blue" variant="ghost" rightIcon={<Icon as={ArrowRight} />}>
                              Use Template
                            </Button>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Formation Selection */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Users} mr={2} color="blue.500" />
                      Formation Selection
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Choose a formation to start designing your play
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      {defaultFormations.map((formation) => (
                        <Card
                          key={formation.id}
                          bg={cardBg}
                          border="1px"
                          borderColor={selectedFormation?.id === formation.id ? 'blue.300' : borderColor}
                          cursor="pointer"
                          _hover={{
                            borderColor: 'blue.300',
                            transform: 'translateY(-2px)',
                            shadow: 'md',
                          }}
                          transition="all 0.2s"
                          onClick={() => applyFormation(formation)}
                        >
                          <CardBody p={4} textAlign="center">
                            <Box
                              w="100%"
                              h="80px"
                              bg="gray.100"
                              borderRadius="md"
                              mb={3}
                              position="relative"
                              overflow="hidden"
                            >
                              {/* Simple formation visualization */}
                              {formation.positions.slice(0, 6).map((pos, index) => (
                                <Box
                                  key={index}
                                  position="absolute"
                                  left={`${pos.x}%`}
                                  top={`${pos.y * 0.8}%`}
                                  w="8px"
                                  h="8px"
                                  bg={pos.color}
                                  borderRadius="full"
                                  border="1px"
                                  borderColor="white"
                                />
                              ))}
                            </Box>
                            <Text fontWeight="semibold" color="gray.800" mb={1}>
                              {formation.name}
                            </Text>
                            <Text fontSize="xs" color="gray.600" mb={2}>
                              {formation.description}
                            </Text>
                            <Badge colorScheme="blue" size="sm">
                              {formation.category}
                            </Badge>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Field Canvas */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Flex justify="space-between" align="center">
                      <Heading size="md" color="gray.800">
                        <Icon as={Grid3X3} mr={2} color="blue.500" />
                        Field Canvas
                      </Heading>
                      <HStack spacing={2}>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={ZoomOut} />}
                          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                          aria-label="Zoom out"
                        />
                        <Text fontSize="sm" color="gray.600" minW="60px" textAlign="center">
                          {Math.round(zoom * 100)}%
                        </Text>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={ZoomIn} />}
                          onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                          aria-label="Zoom in"
                        />
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={Maximize2} />}
                          onClick={() => setZoom(1)}
                          aria-label="Reset zoom"
                        />
                      </HStack>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Box
                      ref={canvasRef}
                      w="100%"
                      h="600px"
                      bg="green.100"
                      border="2px"
                      borderColor="green.300"
                      borderRadius="xl"
                      position="relative"
                      overflow="hidden"
                      cursor={drawingMode === 'select' ? 'default' : 'crosshair'}
                    >
                      {/* Grid lines */}
                      {showGrid && (
                        <Box
                          position="absolute"
                          top={0}
                          left={0}
                          right={0}
                          bottom={0}
                          backgroundImage="linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)"
                          backgroundSize="20px 20px"
                          opacity={0.3}
                        />
                      )}
                      
                      {/* Field markings */}
                      <Box
                        position="absolute"
                        top="50%"
                        left="0"
                        right="0"
                        h="2px"
                        bg="white"
                        opacity={0.8}
                      />
                      <Box
                        position="absolute"
                        top="0"
                        left="50%"
                        bottom="0"
                        w="2px"
                        bg="white"
                        opacity={0.8}
                      />
                      
                      {/* Players */}
                      {currentPlay?.players.map((player) => (
                        <Box
                          key={player.id}
                          position="absolute"
                          left={`${player.x}%`}
                          top={`${player.y}%`}
                          w="40px"
                          h="40px"
                          bg={player.color}
                          borderRadius="full"
                          border="3px"
                          borderColor="white"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          cursor="pointer"
                          transform={`translate(-50%, -50%) scale(${zoom})`}
                          _hover={{
                            transform: `translate(-50%, -50%) scale(${zoom * 1.1})`,
                            shadow: 'lg',
                          }}
                          transition="all 0.2s"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="bold"
                            color="white"
                            textShadow="1px 1px 2px rgba(0,0,0,0.8)"
                          >
                            {player.number}
                          </Text>
                        </Box>
                      ))}
                      
                      {/* No formation selected message */}
                      {!selectedFormation && (
                        <Box
                          position="absolute"
                          top="50%"
                          left="50%"
                          transform="translate(-50%, -50%)"
                          textAlign="center"
                          color="gray.500"
                        >
                          <Icon as={Users} boxSize={16} mb={4} />
                          <Text fontSize="lg" fontWeight="semibold">
                            Select a Formation
                          </Text>
                          <Text fontSize="sm">
                            Choose a formation above to start designing your play
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </CardBody>
                </Card>
              </VStack>

              {/* Sidebar - Controls & Properties */}
              <VStack spacing={6} align="stretch">
                {/* Play Information */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" position="sticky" top={6}>
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Edit} mr={2} color="blue.500" />
                      Play Information
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel fontWeight="semibold" color="gray.700">Play Name</FormLabel>
                        <Input
                          placeholder="Enter play name"
                          value={playName}
                          onChange={(e) => setPlayName(e.target.value)}
                          size="lg"
                          borderRadius="xl"
                        />
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel fontWeight="semibold" color="gray.700">Description</FormLabel>
                        <Textarea
                          placeholder="Describe the play objective"
                          value={playDescription}
                          onChange={(e) => setPlayDescription(e.target.value)}
                          rows={3}
                          borderRadius="xl"
                          resize="vertical"
                        />
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel fontWeight="semibold" color="gray.700">Category</FormLabel>
                        <Select
                          value={playCategory}
                          onChange={(e) => setPlayCategory(e.target.value as any)}
                          size="lg"
                          borderRadius="xl"
                        >
                          <option value="offense">Offense</option>
                          <option value="defense">Defense</option>
                          <option value="special">Special Teams</option>
                        </Select>
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel fontWeight="semibold" color="gray.700">Difficulty</FormLabel>
                        <Select
                          value={playDifficulty}
                          onChange={(e) => setPlayDifficulty(e.target.value as any)}
                          size="lg"
                          borderRadius="xl"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </Select>
                      </FormControl>
                      
                      <Button
                        leftIcon={<Icon as={Plus} />}
                        colorScheme="blue"
                        onClick={handleCreatePlay}
                        isDisabled={!selectedFormation}
                        size="lg"
                        borderRadius="xl"
                      >
                        Create Play
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Drawing Tools */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={PenTool} mr={2} color="blue.500" />
                      Drawing Tools
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <Button
                        leftIcon={<Icon as={MousePointer} />}
                        variant={drawingMode === 'select' ? 'solid' : 'outline'}
                        colorScheme="blue"
                        onClick={() => setDrawingMode('select')}
                        size="lg"
                        borderRadius="xl"
                      >
                        Select
                      </Button>
                      
                      <Button
                        leftIcon={<Icon as={PenTool} />}
                        variant={drawingMode === 'draw' ? 'solid' : 'outline'}
                        colorScheme="green"
                        onClick={() => setDrawingMode('draw')}
                        size="lg"
                        borderRadius="xl"
                      >
                        Draw Routes
                      </Button>
                      
                      <Button
                        leftIcon={<Icon as={Eraser} />}
                        variant={drawingMode === 'erase' ? 'solid' : 'outline'}
                        colorScheme="red"
                        onClick={() => setDrawingMode('erase')}
                        size="lg"
                        borderRadius="xl"
                      >
                        Erase
                      </Button>
                      
                      <Divider />
                      
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                          Show Grid
                        </Text>
                        <Switch
                          isChecked={showGrid}
                          onChange={(e) => setShowGrid(e.target.checked)}
                          colorScheme="blue"
                        />
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Play Actions */}
                {currentPlay && (
                  <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                    <CardHeader>
                      <Heading size="md" color="gray.800">
                        <Icon as={Play} mr={2} color="blue.500" />
                        Play Actions
                      </Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Button
                          leftIcon={<Icon as={Save} />}
                          colorScheme="blue"
                          onClick={handleSavePlay}
                          size="lg"
                          borderRadius="xl"
                        >
                          Save Play
                        </Button>
                        
                        <Button
                          leftIcon={<Icon as={Share} />}
                          variant="outline"
                          onClick={handleSharePlay}
                          size="lg"
                          borderRadius="xl"
                        >
                          Share Play
                        </Button>
                        
                        <Button
                          leftIcon={<Icon as={Download} />}
                          variant="outline"
                          onClick={handleExportPlay}
                          size="lg"
                          borderRadius="xl"
                        >
                          Export Play
                        </Button>
                        
                        <Button
                          leftIcon={<Icon as={Trash2} />}
                          variant="outline"
                          colorScheme="red"
                          onClick={handleDeletePlay}
                          size="lg"
                          borderRadius="xl"
                        >
                          Delete Play
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Smart Tips */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Info} mr={2} color="blue.500" />
                      Smart Tips
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <Box p={3} bg={cardBg} borderRadius="lg">
                        <Text fontSize="sm" color="gray.700" fontWeight="medium">
                          🎯 Start with formation, then add routes
                        </Text>
                      </Box>
                      <Box p={3} bg={cardBg} borderRadius="lg">
                        <Text fontSize="sm" color="gray.700" fontWeight="medium">
                          📐 Use grid for precise positioning
                        </Text>
                      </Box>
                      <Box p={3} bg={cardBg} borderRadius="lg">
                        <Text fontSize="sm" color="gray.700" fontWeight="medium">
                          🎨 Different colors for different positions
                        </Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </Grid>
          </TabPanel>

          {/* Play Library Tab */}
          <TabPanel>
            <Box textAlign="center" py={12}>
              <Icon as={BookOpen} boxSize={16} color="gray.400" mb={4} />
              <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                Play Library
              </Text>
              <Text color="gray.500">
                Your saved plays will appear here. Start designing plays to build your library.
              </Text>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default PlaybookDesigner;
