import React, { useState, useEffect, useCallback } from 'react';
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
  Divider,
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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  List,
  ListItem,
  ListIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Stack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tag,
  TagLabel,
  TagCloseButton,
  Avatar,
  AvatarGroup,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@chakra-ui/react';
import {
  Brain,
  Calendar,
  Clock,
  Users,
  Target,
  Award,
  Play,
  Pause,
  Stop,
  Edit3,
  Save,
  Share,
  Download,
  Upload,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  Sparkles,
  Route,
  Timer,
  BookOpen,
  Star,
  Heart,
  MessageSquare,
  Video,
  Image,
  FileText,
  Link,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { useEnhancedAIService } from '../../../services/ai-service-enhanced';

interface PracticeSession {
  id: string;
  name: string;
  duration: number;
  focus: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  objectives: string[];
  drills: Drill[];
  aiGenerated: boolean;
  confidence: number;
  createdAt: Date;
  lastModified: Date;
  createdBy: string;
  shared: boolean;
  favorites: number;
  rating: number;
  tags: string[];
}

interface Drill {
  id: string;
  name: string;
  description: string;
  duration: number;
  category: string;
  equipment: string[];
  instructions: string[];
  coachingPoints: string[];
  variations: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  aiReasoning?: string;
  successMetrics: string[];
  videoUrl?: string;
  imageUrl?: string;
}

interface TeamContext {
  id: string;
  name: string;
  sport: string;
  ageGroup: string;
  skillLevel: string;
  playerCount: number;
  seasonPhase: string;
  recentPerformance?: string;
  strengths?: string[];
  weaknesses?: string[];
}

const EnhancedPracticePlanner: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(
    null
  );
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [teamContext, setTeamContext] = useState<TeamContext>({
    id: 'team-1',
    name: 'Wildcats Varsity',
    sport: 'Football',
    ageGroup: 'high_school',
    skillLevel: 'intermediate',
    playerCount: 45,
    seasonPhase: 'regular',
    recentPerformance: 'Improving - 3 wins in last 4 games',
    strengths: ['Passing game', 'Team chemistry', 'Conditioning'],
    weaknesses: [
      'Red zone efficiency',
      'Penalty discipline',
      'Deep ball accuracy',
    ],
  });

  const [generating, setGenerating] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState(120);
  const [difficulty, setDifficulty] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('intermediate');
  const [showAIInsights, setShowAIInsights] = useState(true);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose,
  } = useDisclosure();
  const toast = useToast();

  // Mock data for sessions
  useEffect(() => {
    setSessions([
      {
        id: '1',
        name: 'Passing Game Focus',
        duration: 120,
        focus: 'Passing accuracy and route running',
        difficulty: 'intermediate',
        equipment: ['Footballs', 'Cones', 'Stopwatch'],
        objectives: [
          'Improve QB accuracy',
          'Enhance WR route running',
          'Practice timing',
        ],
        drills: [
          {
            id: 'drill-1',
            name: 'QB Accuracy Challenge',
            description: 'Quarterback throws to moving targets',
            duration: 30,
            category: 'Passing',
            equipment: ['Football', 'Targets'],
            instructions: [
              'Set up targets at various distances',
              'QB throws from different positions',
            ],
            coachingPoints: [
              'Focus on footwork',
              'Follow through',
              'Eye on target',
            ],
            variations: [
              'Moving targets',
              'Pressure simulation',
              'Different distances',
            ],
            difficulty: 'intermediate',
            aiReasoning:
              "Based on QB Johnson's 78% completion rate and need for deep ball improvement",
            successMetrics: [
              'Completion rate >80%',
              'Target accuracy',
              'Consistent form',
            ],
          },
        ],
        aiGenerated: true,
        confidence: 0.89,
        createdAt: new Date(),
        lastModified: new Date(),
        createdBy: 'Coach', // Will be replaced with actual user data
        shared: true,
        favorites: 12,
        rating: 4.5,
        tags: ['passing', 'quarterback', 'accuracy'],
      },
    ]);
  }, []);

  const focusAreas = [
    'Passing Game',
    'Running Game',
    'Defense',
    'Special Teams',
    'Conditioning',
    'Team Building',
    'Strategy',
    'Skills Development',
  ];

  const equipmentOptions = [
    'Footballs',
    'Cones',
    'Tackling Dummies',
    'Agility Ladders',
    'Resistance Bands',
    'Stopwatch',
    'Whistle',
    'Whiteboard',
    'Tablets',
    'Video Camera',
  ];

  const generateAIPracticePlan = useCallback(async () => {
    if (selectedFocus.length === 0) {
      toast({
        title: 'Focus Areas Required',
        description:
          'Please select at least one focus area for the practice plan.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setGenerating(true);

    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      const newSession: PracticeSession = {
        id: `session-${Date.now()}`,
        name: `AI Generated: ${selectedFocus.join(', ')} Focus`,
        duration: sessionDuration,
        focus: selectedFocus.join(', '),
        difficulty,
        equipment: equipmentOptions.slice(0, 3),
        objectives: [
          `Improve ${selectedFocus[0].toLowerCase()}`,
          'Enhance team coordination',
          'Build confidence and skills',
        ],
        drills: [
          {
            id: `drill-${Date.now()}-1`,
            name: 'Dynamic Warm-up',
            description: 'Sport-specific warm-up routine',
            duration: 15,
            category: 'Warm-up',
            equipment: ['Cones'],
            instructions: [
              'Light jogging',
              'Dynamic stretches',
              'Sport-specific movements',
            ],
            coachingPoints: [
              'Focus on form',
              'Gradual intensity increase',
              'Team energy',
            ],
            variations: ['Different intensity levels', 'Weather adaptations'],
            difficulty: 'beginner',
            aiReasoning:
              'Essential for injury prevention and performance optimization',
            successMetrics: [
              'Heart rate elevation',
              'Muscle activation',
              'Team readiness',
            ],
          },
          {
            id: `drill-${Date.now()}-2`,
            name: `${selectedFocus[0]} Skill Development`,
            description: `Focused ${selectedFocus[0].toLowerCase()} practice`,
            duration: Math.floor(sessionDuration * 0.4),
            category: selectedFocus[0],
            equipment: ['Footballs', 'Cones'],
            instructions: [
              'Skill-specific drills',
              'Progressive difficulty',
              'Individual attention',
            ],
            coachingPoints: [
              'Technique focus',
              'Repetition quality',
              'Positive reinforcement',
            ],
            variations: ['Different skill levels', 'Equipment variations'],
            difficulty,
            aiReasoning: `Targeted practice for ${selectedFocus[0].toLowerCase()} improvement based on team needs`,
            successMetrics: [
              'Skill improvement',
              'Confidence building',
              'Technique consistency',
            ],
          },
          {
            id: `drill-${Date.now()}-3`,
            name: 'Team Integration',
            description: 'Full team practice scenarios',
            duration: Math.floor(sessionDuration * 0.3),
            category: 'Team Practice',
            equipment: ['Footballs', 'Cones', 'Stopwatch'],
            instructions: [
              'Game-like scenarios',
              'Team coordination',
              'Strategy implementation',
            ],
            coachingPoints: ['Communication', 'Timing', 'Teamwork'],
            variations: ['Different scenarios', 'Opponent simulation'],
            difficulty,
            aiReasoning:
              'Essential for applying individual skills in team context',
            successMetrics: [
              'Team coordination',
              'Communication',
              'Strategy execution',
            ],
          },
        ],
        aiGenerated: true,
        confidence: 0.85 + Math.random() * 0.1,
        createdAt: new Date(),
        lastModified: new Date(),
        createdBy: 'AI Assistant',
        shared: false,
        favorites: 0,
        rating: 0,
        tags: selectedFocus.map(f => f.toLowerCase().replace(' ', '-')),
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);

      toast({
        title: 'Practice Plan Generated!',
        description: `AI created a ${sessionDuration}-minute practice plan focused on ${selectedFocus.join(', ')}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate practice plan. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setGenerating(false);
    }
  }, [selectedFocus, sessionDuration, difficulty, toast]);

  const saveSession = useCallback(() => {
    if (!currentSession) return;

    setSessions(prev =>
      prev.map(session =>
        session.id === currentSession.id
          ? { ...currentSession, lastModified: new Date() }
          : session
      )
    );

    toast({
      title: 'Session Saved',
      description: 'Practice session has been saved successfully.',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  }, [currentSession, toast]);

  const shareSession = useCallback(() => {
    if (!currentSession) return;

    setSessions(prev =>
      prev.map(session =>
        session.id === currentSession.id
          ? { ...session, shared: true }
          : session
      )
    );

    toast({
      title: 'Session Shared',
      description: 'Practice session has been shared with the team.',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  }, [currentSession, toast]);

  const duplicateSession = useCallback(
    (session: PracticeSession) => {
      const duplicatedSession: PracticeSession = {
        ...session,
        id: `session-${Date.now()}`,
        name: `${session.name} (Copy)`,
        createdAt: new Date(),
        lastModified: new Date(),
        shared: false,
        favorites: 0,
        rating: 0,
      };

      setSessions(prev => [duplicatedSession, ...prev]);
      setCurrentSession(duplicatedSession);

      toast({
        title: 'Session Duplicated',
        description: 'Practice session has been duplicated successfully.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    },
    [toast]
  );

  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      {/* Header */}
      <Box bg="white" borderRadius="lg" p={6} mb={6} shadow="sm">
        <Flex justify="space-between" align="center">
          <HStack>
            <Icon as={Brain} color="purple.600" boxSize={8} />
            <VStack align="start" spacing={0}>
              <Heading size="lg" color="purple.600">
                Enhanced Practice Planner
              </Heading>
              <Text fontSize="sm" color="gray.600">
                AI-powered practice planning and management
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={4}>
            <HStack>
              <Icon
                as={Brain}
                color={showAIInsights ? 'purple.500' : 'gray.400'}
              />
              <Text fontSize="sm">AI Insights</Text>
              <Switch
                isChecked={showAIInsights}
                onChange={e => setShowAIInsights(e.target.checked)}
                colorScheme="purple"
              />
            </HStack>
            <Button
              leftIcon={<Settings />}
              colorScheme="purple"
              variant="outline"
              size="sm"
              onClick={onSettingsOpen}
            >
              Settings
            </Button>
            <Button
              leftIcon={<Plus />}
              colorScheme="purple"
              size="sm"
              onClick={onOpen}
            >
              New Plan
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Grid templateColumns={{ base: '1fr', lg: '1fr 2fr' }} gap={6}>
        {/* Left Sidebar - Session List */}
        <VStack spacing={6} align="stretch">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <Heading size="md">Quick Actions</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3}>
                <Button
                  leftIcon={<Sparkles />}
                  colorScheme="purple"
                  size="sm"
                  w="full"
                  onClick={onOpen}
                >
                  Generate AI Plan
                </Button>
                <Button
                  leftIcon={<Upload />}
                  colorScheme="blue"
                  size="sm"
                  w="full"
                >
                  Import Template
                </Button>
                <Button
                  leftIcon={<Download />}
                  colorScheme="green"
                  size="sm"
                  w="full"
                >
                  Export Plan
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Session Library */}
          <Card>
            <CardHeader>
              <Heading size="md">Practice Sessions</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {sessions.map(session => (
                  <Card
                    key={session.id}
                    p={3}
                    cursor="pointer"
                    border={
                      currentSession?.id === session.id
                        ? '2px solid'
                        : '1px solid'
                    }
                    borderColor={
                      currentSession?.id === session.id
                        ? 'purple.500'
                        : 'gray.200'
                    }
                    onClick={() => setCurrentSession(session)}
                    _hover={{ shadow: 'md' }}
                  >
                    <VStack align="start" spacing={2}>
                      <Flex justify="space-between" w="full">
                        <Text fontWeight="semibold" fontSize="sm">
                          {session.name}
                        </Text>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<MoreVertical />}
                            variant="ghost"
                            size="sm"
                            onClick={e => e.stopPropagation()}
                          />
                          <MenuList>
                            <MenuItem icon={<Edit3 />}>Edit</MenuItem>
                            <MenuItem
                              icon={<Copy />}
                              onClick={() => duplicateSession(session)}
                            >
                              Duplicate
                            </MenuItem>
                            <MenuItem icon={<Share />}>Share</MenuItem>
                            <MenuDivider />
                            <MenuItem icon={<Trash2 />} color="red.500">
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>

                      <HStack spacing={2}>
                        <Badge colorScheme="blue" size="sm">
                          {session.duration}min
                        </Badge>
                        <Badge colorScheme="purple" size="sm">
                          {session.difficulty}
                        </Badge>
                        {session.aiGenerated && (
                          <Badge colorScheme="green" size="sm">
                            AI
                          </Badge>
                        )}
                      </HStack>

                      <Text fontSize="xs" color="gray.600" noOfLines={2}>
                        {session.focus}
                      </Text>

                      <HStack spacing={2}>
                        <HStack spacing={1}>
                          <Icon as={Star} size={12} color="yellow.500" />
                          <Text fontSize="xs">{session.rating}</Text>
                        </HStack>
                        <HStack spacing={1}>
                          <Icon as={Heart} size={12} color="red.500" />
                          <Text fontSize="xs">{session.favorites}</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                          {session.lastModified.toLocaleDateString()}
                        </Text>
                      </HStack>
                    </VStack>
                  </Card>
                ))}
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Main Content - Session Details */}
        <VStack spacing={6} align="stretch">
          {currentSession ? (
            <>
              {/* Session Header */}
              <Card>
                <CardHeader>
                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={1}>
                      <Heading size="md">{currentSession.name}</Heading>
                      <HStack spacing={2}>
                        <Badge colorScheme="blue">
                          {currentSession.duration} minutes
                        </Badge>
                        <Badge colorScheme="purple">
                          {currentSession.difficulty}
                        </Badge>
                        {currentSession.aiGenerated && (
                          <Badge colorScheme="green" leftIcon={<Brain />}>
                            AI Generated
                          </Badge>
                        )}
                        <Badge colorScheme="orange">
                          {(currentSession.confidence * 100).toFixed(0)}%
                          confidence
                        </Badge>
                      </HStack>
                    </VStack>

                    <HStack spacing={2}>
                      <Button
                        leftIcon={<Save />}
                        colorScheme="blue"
                        size="sm"
                        onClick={saveSession}
                      >
                        Save
                      </Button>
                      <Button
                        leftIcon={<Share />}
                        colorScheme="green"
                        size="sm"
                        onClick={shareSession}
                      >
                        Share
                      </Button>
                      <Button
                        leftIcon={<Download />}
                        colorScheme="purple"
                        size="sm"
                      >
                        Export
                      </Button>
                    </HStack>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        Focus Areas
                      </Text>
                      <HStack spacing={2} flexWrap="wrap">
                        {currentSession.tags.map(tag => (
                          <Tag key={tag} colorScheme="purple" size="sm">
                            <TagLabel>{tag}</TagLabel>
                          </Tag>
                        ))}
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        Objectives
                      </Text>
                      <List spacing={2}>
                        {currentSession.objectives.map((objective, index) => (
                          <ListItem key={index}>
                            <ListIcon as={CheckCircle} color="green.500" />
                            {objective}
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        Equipment Needed
                      </Text>
                      <HStack spacing={2} flexWrap="wrap">
                        {currentSession.equipment.map(item => (
                          <Tag key={item} colorScheme="blue" size="sm">
                            <TagLabel>{item}</TagLabel>
                          </Tag>
                        ))}
                      </HStack>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>

              {/* Drills */}
              <Card>
                <CardHeader>
                  <Heading size="md">Practice Drills</Heading>
                </CardHeader>
                <CardBody>
                  <Accordion allowMultiple>
                    {currentSession.drills.map((drill, index) => (
                      <AccordionItem key={drill.id}>
                        <AccordionButton>
                          <Box flex="1" textAlign="left">
                            <Flex justify="space-between" align="center">
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="semibold">{drill.name}</Text>
                                <HStack spacing={2}>
                                  <Badge colorScheme="blue" size="sm">
                                    {drill.duration}min
                                  </Badge>
                                  <Badge colorScheme="purple" size="sm">
                                    {drill.category}
                                  </Badge>
                                  <Badge colorScheme="orange" size="sm">
                                    {drill.difficulty}
                                  </Badge>
                                </HStack>
                              </VStack>
                            </Flex>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4}>
                          <VStack spacing={4} align="stretch">
                            <Text>{drill.description}</Text>

                            {showAIInsights && drill.aiReasoning && (
                              <Alert status="info" borderRadius="md">
                                <AlertIcon />
                                <Box>
                                  <AlertTitle>AI Reasoning</AlertTitle>
                                  <AlertDescription>
                                    {drill.aiReasoning}
                                  </AlertDescription>
                                </Box>
                              </Alert>
                            )}

                            <Box>
                              <Text fontWeight="semibold" mb={2}>
                                Instructions
                              </Text>
                              <List spacing={1}>
                                {drill.instructions.map((instruction, idx) => (
                                  <ListItem key={idx} fontSize="sm">
                                    {idx + 1}. {instruction}
                                  </ListItem>
                                ))}
                              </List>
                            </Box>

                            <Box>
                              <Text fontWeight="semibold" mb={2}>
                                Coaching Points
                              </Text>
                              <List spacing={1}>
                                {drill.coachingPoints.map((point, idx) => (
                                  <ListItem key={idx} fontSize="sm">
                                    • {point}
                                  </ListItem>
                                ))}
                              </List>
                            </Box>

                            <Box>
                              <Text fontWeight="semibold" mb={2}>
                                Success Metrics
                              </Text>
                              <HStack spacing={2} flexWrap="wrap">
                                {drill.successMetrics.map(metric => (
                                  <Tag
                                    key={metric}
                                    colorScheme="green"
                                    size="sm"
                                  >
                                    <TagLabel>{metric}</TagLabel>
                                  </Tag>
                                ))}
                              </HStack>
                            </Box>

                            <HStack spacing={2}>
                              {drill.videoUrl && (
                                <Button
                                  leftIcon={<Video />}
                                  size="sm"
                                  variant="outline"
                                >
                                  Watch Video
                                </Button>
                              )}
                              {drill.imageUrl && (
                                <Button
                                  leftIcon={<Image />}
                                  size="sm"
                                  variant="outline"
                                >
                                  View Image
                                </Button>
                              )}
                            </HStack>
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardBody>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody>
                <VStack spacing={4} textAlign="center">
                  <Icon as={Brain} color="purple.500" boxSize={16} />
                  <Heading size="md" color="purple.600">
                    No Practice Session Selected
                  </Heading>
                  <Text color="gray.600">
                    Select a practice session from the library or create a new
                    AI-generated plan.
                  </Text>
                  <Button
                    leftIcon={<Plus />}
                    colorScheme="purple"
                    onClick={onOpen}
                  >
                    Create New Plan
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Grid>

      {/* New Plan Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Generate AI Practice Plan</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              <Box>
                <FormLabel fontWeight="semibold">Focus Areas</FormLabel>
                <CheckboxGroup
                  value={selectedFocus}
                  onChange={values => setSelectedFocus(values as string[])}
                >
                  <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                    {focusAreas.map(area => (
                      <Checkbox key={area} value={area}>
                        {area}
                      </Checkbox>
                    ))}
                  </Grid>
                </CheckboxGroup>
              </Box>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Session Duration (minutes)</FormLabel>
                  <NumberInput
                    value={sessionDuration}
                    onChange={(_, value) => setSessionDuration(value)}
                    min={30}
                    max={180}
                    step={15}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Difficulty Level</FormLabel>
                  <RadioGroup
                    value={difficulty}
                    onChange={value => setDifficulty(value as any)}
                  >
                    <Stack direction="row">
                      <Radio value="beginner">Beginner</Radio>
                      <Radio value="intermediate">Intermediate</Radio>
                      <Radio value="advanced">Advanced</Radio>
                    </Stack>
                  </RadioGroup>
                </FormControl>
              </HStack>

              <Box>
                <FormLabel fontWeight="semibold">Team Context</FormLabel>
                <Card p={4} bg="gray.50">
                  <VStack align="start" spacing={2}>
                    <Text>
                      <strong>Team:</strong> {teamContext.name}
                    </Text>
                    <Text>
                      <strong>Sport:</strong> {teamContext.sport}
                    </Text>
                    <Text>
                      <strong>Age Group:</strong> {teamContext.ageGroup}
                    </Text>
                    <Text>
                      <strong>Skill Level:</strong> {teamContext.skillLevel}
                    </Text>
                    <Text>
                      <strong>Players:</strong> {teamContext.playerCount}
                    </Text>
                  </VStack>
                </Card>
              </Box>

              <Button
                leftIcon={<Sparkles />}
                colorScheme="purple"
                size="lg"
                onClick={generateAIPracticePlan}
                isLoading={generating}
                loadingText="AI Generating Plan..."
                isDisabled={selectedFocus.length === 0}
              >
                Generate Practice Plan
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Practice Planner Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs>
              <TabList>
                <Tab>AI Settings</Tab>
                <Tab>Preferences</Tab>
                <Tab>Team</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable AI Insights</FormLabel>
                      <Switch
                        isChecked={showAIInsights}
                        onChange={e => setShowAIInsights(e.target.checked)}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Default Session Duration (minutes)</FormLabel>
                      <NumberInput defaultValue={120} min={30} max={180}>
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Default Difficulty</FormLabel>
                      <Select defaultValue="intermediate">
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </Select>
                    </FormControl>
                  </VStack>
                </TabPanel>

                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Auto-save sessions</FormLabel>
                      <Switch defaultChecked />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Show AI confidence scores</FormLabel>
                      <Switch defaultChecked />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable session sharing</FormLabel>
                      <Switch defaultChecked />
                    </FormControl>
                  </VStack>
                </TabPanel>

                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Team Name</FormLabel>
                      <Input defaultValue={teamContext.name} />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Sport</FormLabel>
                      <Select defaultValue={teamContext.sport}>
                        <option value="Football">Football</option>
                        <option value="Basketball">Basketball</option>
                        <option value="Soccer">Soccer</option>
                        <option value="Baseball">Baseball</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Age Group</FormLabel>
                      <Select defaultValue={teamContext.ageGroup}>
                        <option value="youth">Youth</option>
                        <option value="middle_school">Middle School</option>
                        <option value="high_school">High School</option>
                        <option value="college">College</option>
                      </Select>
                    </FormControl>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EnhancedPracticePlanner;
