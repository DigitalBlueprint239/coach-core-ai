import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  FileText,
  Image,
  Video,
  Calendar,
  Trophy,
  BarChart3,
  Activity,
  RefreshCw,
} from 'lucide-react';

// Types
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

interface Play {
  id: string;
  name: string;
  description: string;
  formation: string;
  players: Player[];
  category: 'offense' | 'defense' | 'special';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  successRate: number;
  tags: string[];
  createdAt: Date;
  lastModified: Date;
  thumbnail?: string;
}

interface Formation {
  id: string;
  name: string;
  category: 'offense' | 'defense' | 'special';
  positions: Array<{
    position: string;
    number: string;
    x: number;
    y: number;
    color: string;
  }>;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Formation templates
const FORMATION_TEMPLATES: Formation[] = [
  {
    id: 'shotgun-spread',
    name: 'Shotgun Spread',
    category: 'offense',
    description: 'Versatile passing formation with multiple route options',
    difficulty: 'intermediate',
    positions: [
      { position: 'QB', number: '12', x: 300, y: 200, color: '#3b82f6' },
      { position: 'RB', number: '23', x: 250, y: 230, color: '#10b981' },
      { position: 'WR', number: '81', x: 450, y: 150, color: '#f59e0b' },
      { position: 'WR', number: '84', x: 450, y: 250, color: '#f59e0b' },
      { position: 'TE', number: '87', x: 400, y: 200, color: '#8b5cf6' },
      { position: 'OL', number: '70', x: 200, y: 180, color: '#6b7280' },
      { position: 'OL', number: '71', x: 200, y: 200, color: '#6b7280' },
      { position: 'OL', number: '72', x: 200, y: 220, color: '#6b7280' },
    ],
  },
  {
    id: 'i-formation',
    name: 'I-Formation',
    category: 'offense',
    description: 'Classic power running formation',
    difficulty: 'beginner',
    positions: [
      { position: 'QB', number: '12', x: 300, y: 200, color: '#3b82f6' },
      { position: 'FB', number: '44', x: 250, y: 200, color: '#10b981' },
      { position: 'RB', number: '23', x: 200, y: 200, color: '#10b981' },
      { position: 'WR', number: '81', x: 450, y: 150, color: '#f59e0b' },
      { position: 'WR', number: '84', x: 450, y: 250, color: '#f59e0b' },
      { position: 'TE', number: '87', x: 400, y: 200, color: '#8b5cf6' },
      { position: 'OL', number: '70', x: 200, y: 180, color: '#6b7280' },
      { position: 'OL', number: '71', x: 200, y: 200, color: '#6b7280' },
      { position: 'OL', number: '72', x: 200, y: 220, color: '#6b7280' },
    ],
  },
  {
    id: '4-3-defense',
    name: '4-3 Defense',
    category: 'defense',
    description: 'Balanced defensive formation',
    difficulty: 'intermediate',
    positions: [
      { position: 'DE', number: '91', x: 400, y: 150, color: '#ef4444' },
      { position: 'DT', number: '92', x: 350, y: 180, color: '#ef4444' },
      { position: 'DT', number: '93', x: 350, y: 220, color: '#ef4444' },
      { position: 'DE', number: '94', x: 400, y: 250, color: '#ef4444' },
      { position: 'LB', number: '55', x: 300, y: 200, color: '#f97316' },
      { position: 'LB', number: '56', x: 250, y: 200, color: '#f97316' },
      { position: 'LB', number: '57', x: 200, y: 200, color: '#f97316' },
      { position: 'CB', number: '21', x: 450, y: 150, color: '#06b6d4' },
      { position: 'CB', number: '22', x: 450, y: 250, color: '#06b6d4' },
      { position: 'S', number: '31', x: 350, y: 120, color: '#8b5cf6' },
      { position: 'S', number: '32', x: 350, y: 280, color: '#8b5cf6' },
    ],
  },
];

const EnhancedPlaybookDesigner: React.FC = () => {
  // State
  const [currentPlay, setCurrentPlay] = useState<Play | null>(null);
  const [plays, setPlays] = useState<Play[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [drawingMode, setDrawingMode] = useState<'select' | 'draw' | 'erase'>('select');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'offense' | 'defense' | 'special'>('all');
  const [showFormationDrawer, setShowFormationDrawer] = useState(false);
  const [showPlayDetails, setShowPlayDetails] = useState(false);

  // Form state
  const [playName, setPlayName] = useState('');
  const [playDescription, setPlayDescription] = useState('');
  const [playCategory, setPlayCategory] = useState<'offense' | 'defense' | 'special'>('offense');
  const [playDifficulty, setPlayDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [playTags, setPlayTags] = useState<string[]>([]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  // Color values
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Load plays on mount
  useEffect(() => {
    loadPlays();
  }, []);

  const loadPlays = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockPlays: Play[] = [
        {
          id: 'play-1',
          name: 'Shotgun Spread Right',
          description: 'Quick passing play with multiple route options',
          formation: 'Shotgun Spread',
          players: [],
          category: 'offense',
          difficulty: 'intermediate',
          estimatedDuration: 30,
          successRate: 75,
          tags: ['passing', 'quick', 'spread'],
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'play-2',
          name: 'I-Formation Power',
          description: 'Power running play up the middle',
          formation: 'I-Formation',
          players: [],
          category: 'offense',
          difficulty: 'beginner',
          estimatedDuration: 25,
          successRate: 80,
          tags: ['running', 'power', 'middle'],
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ];
      
      setPlays(mockPlays);
    } catch (error) {
      setError('Failed to load plays');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlay = async () => {
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

    try {
      setIsLoading(true);
      setError(null);

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
        category: playCategory,
        difficulty: playDifficulty,
        estimatedDuration: 30,
        successRate: 75,
        tags: playTags,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      setCurrentPlay(newPlay);
      setPlays(prev => [newPlay, ...prev]);
      
      toast({
        title: 'Play Created!',
        description: 'New play has been created. Start designing your routes.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error creating play:', error);
      setError('Failed to create play. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlay = async () => {
    if (!currentPlay) return;

    try {
      setIsSaving(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPlays(prev => 
        prev.map(play => 
          play.id === currentPlay.id 
            ? { ...currentPlay, lastModified: new Date() }
            : play
        )
      );
      
      toast({
        title: 'Play Saved!',
        description: 'Your play has been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save play. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentPlay) return;

    try {
      // Simulate PDF export
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'PDF Exported!',
        description: 'Your play has been exported as PDF.',
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

  const filteredPlays = plays.filter(play => {
    const matchesSearch = play.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         play.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || play.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'offense': return Play;
      case 'defense': return Shield;
      case 'special': return Star;
      default: return Target;
    }
  };

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      {/* Header */}
      <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} p={4}>
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="gray.800">
              Smart Playbook Designer
            </Heading>
            <Text color="gray.600">
              Design, save, and export your football plays
            </Text>
          </VStack>
          
          <HStack spacing={3}>
            <Button
              leftIcon={<Plus />}
              colorScheme="brand"
              onClick={() => setShowFormationDrawer(true)}
            >
              New Play
            </Button>
            {currentPlay && (
              <>
                <Button
                  leftIcon={<Save />}
                  variant="outline"
                  onClick={handleSavePlay}
                  isLoading={isSaving}
                >
                  Save
                </Button>
                <Button
                  leftIcon={<Download />}
                  variant="outline"
                  onClick={handleExportPDF}
                >
                  Export PDF
                </Button>
              </>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box p={6}>
        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
          <TabList>
            <Tab>Designer</Tab>
            <Tab>Play Library</Tab>
            <Tab>Templates</Tab>
          </TabList>

          <TabPanels>
            {/* Designer Tab */}
            <TabPanel p={0} pt={6}>
              {currentPlay ? (
                <VStack spacing={6} align="stretch">
                  {/* Play Info */}
                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardHeader>
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                          <Heading size="md">{currentPlay.name}</Heading>
                          <Text color="gray.600">{currentPlay.description}</Text>
                        </VStack>
                        <HStack>
                          <Badge colorScheme={getDifficultyColor(currentPlay.difficulty)}>
                            {currentPlay.difficulty}
                          </Badge>
                          <Badge colorScheme="blue">{currentPlay.formation}</Badge>
                        </HStack>
                      </HStack>
                    </CardHeader>
                  </Card>

                  {/* Canvas Area */}
                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <VStack spacing={4}>
                        {/* Toolbar */}
                        <HStack spacing={2} wrap="wrap">
                          <Button
                            leftIcon={<MousePointer />}
                            size="sm"
                            colorScheme={drawingMode === 'select' ? 'brand' : 'gray'}
                            variant={drawingMode === 'select' ? 'solid' : 'outline'}
                            onClick={() => setDrawingMode('select')}
                          >
                            Select
                          </Button>
                          <Button
                            leftIcon={<PenTool />}
                            size="sm"
                            colorScheme={drawingMode === 'draw' ? 'brand' : 'gray'}
                            variant={drawingMode === 'draw' ? 'solid' : 'outline'}
                            onClick={() => setDrawingMode('draw')}
                          >
                            Draw
                          </Button>
                          <Button
                            leftIcon={<Eraser />}
                            size="sm"
                            colorScheme={drawingMode === 'erase' ? 'brand' : 'gray'}
                            variant={drawingMode === 'erase' ? 'solid' : 'outline'}
                            onClick={() => setDrawingMode('erase')}
                          >
                            Erase
                          </Button>
                          <Divider orientation="vertical" height="30px" />
                          <Button
                            leftIcon={<Grid3X3 />}
                            size="sm"
                            variant={showGrid ? 'solid' : 'outline'}
                            colorScheme={showGrid ? 'brand' : 'gray'}
                            onClick={() => setShowGrid(!showGrid)}
                          >
                            Grid
                          </Button>
                          <Button
                            leftIcon={<ZoomIn />}
                            size="sm"
                            variant="outline"
                            onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
                          >
                            Zoom In
                          </Button>
                          <Button
                            leftIcon={<ZoomOut />}
                            size="sm"
                            variant="outline"
                            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                          >
                            Zoom Out
                          </Button>
                        </HStack>

                        {/* Canvas */}
                        <Box
                          w="full"
                          h="600px"
                          bg="green.100"
                          border="2px solid"
                          borderColor="green.300"
                          borderRadius="lg"
                          position="relative"
                          overflow="hidden"
                        >
                          {/* Grid */}
                          {showGrid && (
                            <Box
                              position="absolute"
                              top={0}
                              left={0}
                              right={0}
                              bottom={0}
                              backgroundImage="linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)"
                              backgroundSize="20px 20px"
                              pointerEvents="none"
                            />
                          )}

                          {/* Players */}
                          {currentPlay.players.map((player, index) => (
                            <Box
                              key={player.id}
                              position="absolute"
                              left={`${player.x}px`}
                              top={`${player.y}px`}
                              w="40px"
                              h="40px"
                              bg={player.color}
                              borderRadius="full"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              color="white"
                              fontWeight="bold"
                              fontSize="sm"
                              cursor="pointer"
                              _hover={{ transform: 'scale(1.1)' }}
                              transition="all 0.2s"
                              border="2px solid white"
                              boxShadow="md"
                            >
                              {player.number}
                            </Box>
                          ))}

                          {/* Field Lines */}
                          <Box
                            position="absolute"
                            top="50%"
                            left="0"
                            right="0"
                            height="2px"
                            bg="white"
                            opacity={0.8}
                          />
                          <Box
                            position="absolute"
                            top="25%"
                            left="0"
                            right="0"
                            height="2px"
                            bg="white"
                            opacity={0.6}
                          />
                          <Box
                            position="absolute"
                            top="75%"
                            left="0"
                            right="0"
                            height="2px"
                            bg="white"
                            opacity={0.6}
                          />
                        </Box>

                        {/* Player List */}
                        <Box w="full">
                          <Heading size="sm" mb={3}>Players</Heading>
                          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                            {currentPlay.players.map((player) => (
                              <Card
                                key={player.id}
                                size="sm"
                                bg={player.isActive ? 'blue.50' : 'gray.50'}
                                border="1px solid"
                                borderColor={player.isActive ? 'blue.200' : 'gray.200'}
                                cursor="pointer"
                                _hover={{ bg: player.isActive ? 'blue.100' : 'gray.100' }}
                                onClick={() => setSelectedPlayer(player)}
                              >
                                <CardBody p={3}>
                                  <HStack spacing={2}>
                                    <Box
                                      w="20px"
                                      h="20px"
                                      bg={player.color}
                                      borderRadius="full"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      color="white"
                                      fontSize="xs"
                                      fontWeight="bold"
                                    >
                                      {player.number}
                                    </Box>
                                    <VStack align="start" spacing={0}>
                                      <Text fontSize="xs" fontWeight="semibold">
                                        {player.position}
                                      </Text>
                                      <Text fontSize="xs" color="gray.600">
                                        {player.name}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </CardBody>
                              </Card>
                            ))}
                          </SimpleGrid>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Icon as={Play} boxSize={16} color="gray.400" mb={4} />
                  <Heading size="lg" color="gray.600" mb={2}>
                    No Play Selected
                  </Heading>
                  <Text color="gray.500" mb={6}>
                    Create a new play or select one from your library to start designing.
                  </Text>
                  <Button
                    leftIcon={<Plus />}
                    colorScheme="brand"
                    size="lg"
                    onClick={() => setShowFormationDrawer(true)}
                  >
                    Create New Play
                  </Button>
                </Box>
              )}
            </TabPanel>

            {/* Play Library Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                {/* Search and Filter */}
                <Card bg={bgColor} border="1px" borderColor={borderColor}>
                  <CardBody>
                    <HStack spacing={4}>
                      <Input
                        placeholder="Search plays..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search />}
                      />
                      <Select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                        w="200px"
                      >
                        <option value="all">All Categories</option>
                        <option value="offense">Offense</option>
                        <option value="defense">Defense</option>
                        <option value="special">Special Teams</option>
                      </Select>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Plays Grid */}
                {isLoading ? (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <Card key={i} bg={bgColor} border="1px" borderColor={borderColor}>
                        <CardBody>
                          <Skeleton height="200px" />
                          <VStack spacing={2} mt={4}>
                            <SkeletonText noOfLines={2} />
                            <Skeleton height="20px" w="100px" />
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {filteredPlays.map((play) => {
                      const CategoryIcon = getCategoryIcon(play.category);
                      return (
                        <ScaleFade key={play.id} in={true}>
                          <Card
                            bg={bgColor}
                            border="1px"
                            borderColor={borderColor}
                            cursor="pointer"
                            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                            transition="all 0.2s"
                            onClick={() => setCurrentPlay(play)}
                          >
                            <CardBody>
                              <VStack spacing={4} align="stretch">
                                {/* Play Header */}
                                <HStack justify="space-between">
                                  <VStack align="start" spacing={1}>
                                    <Heading size="sm">{play.name}</Heading>
                                    <Text fontSize="sm" color="gray.600">
                                      {play.description}
                                    </Text>
                                  </VStack>
                                  <Icon as={CategoryIcon} boxSize={6} color="brand.500" />
                                </HStack>

                                {/* Play Info */}
                                <HStack justify="space-between">
                                  <Badge colorScheme={getDifficultyColor(play.difficulty)}>
                                    {play.difficulty}
                                  </Badge>
                                  <Text fontSize="sm" color="gray.500">
                                    {play.formation}
                                  </Text>
                                </HStack>

                                {/* Stats */}
                                <HStack justify="space-between" fontSize="sm" color="gray.600">
                                  <HStack>
                                    <Icon as={Clock} boxSize={4} />
                                    <Text>{play.estimatedDuration}min</Text>
                                  </HStack>
                                  <HStack>
                                    <Icon as={TrendingUp} boxSize={4} />
                                    <Text>{play.successRate}%</Text>
                                  </HStack>
                                </HStack>

                                {/* Tags */}
                                <HStack spacing={1} wrap="wrap">
                                  {play.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} size="sm" colorScheme="gray" variant="subtle">
                                      {tag}
                                    </Badge>
                                  ))}
                                </HStack>

                                {/* Actions */}
                                <HStack spacing={2}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    leftIcon={<Eye />}
                                    flex={1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentPlay(play);
                                      setActiveTab(0);
                                    }}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    leftIcon={<Edit />}
                                    flex={1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentPlay(play);
                                      setActiveTab(0);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </HStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        </ScaleFade>
                      );
                    })}
                  </SimpleGrid>
                )}

                {filteredPlays.length === 0 && !isLoading && (
                  <Box textAlign="center" py={12}>
                    <Icon as={BookOpen} boxSize={16} color="gray.400" mb={4} />
                    <Heading size="lg" color="gray.600" mb={2}>
                      No Plays Found
                    </Heading>
                    <Text color="gray.500" mb={6}>
                      {searchQuery || filterCategory !== 'all' 
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Create your first play to get started.'
                      }
                    </Text>
                    {(!searchQuery && filterCategory === 'all') && (
                      <Button
                        leftIcon={<Plus />}
                        colorScheme="brand"
                        size="lg"
                        onClick={() => setShowFormationDrawer(true)}
                      >
                        Create First Play
                      </Button>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>

            {/* Templates Tab */}
            <TabPanel p={0} pt={6}>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {FORMATION_TEMPLATES.map((formation) => (
                  <ScaleFade key={formation.id} in={true}>
                    <Card
                      bg={bgColor}
                      border="1px"
                      borderColor={borderColor}
                      cursor="pointer"
                      _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                      transition="all 0.2s"
                      onClick={() => {
                        setSelectedFormation(formation);
                        setShowFormationDrawer(false);
                        setActiveTab(0);
                      }}
                    >
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <HStack justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Heading size="sm">{formation.name}</Heading>
                              <Text fontSize="sm" color="gray.600">
                                {formation.description}
                              </Text>
                            </VStack>
                            <Icon as={getCategoryIcon(formation.category)} boxSize={6} color="brand.500" />
                          </HStack>

                          <Badge colorScheme={getDifficultyColor(formation.difficulty)} w="fit-content">
                            {formation.difficulty}
                          </Badge>

                          <Box
                            h="120px"
                            bg="green.100"
                            borderRadius="md"
                            position="relative"
                            border="1px solid"
                            borderColor="green.300"
                          >
                            {/* Formation Preview */}
                            {formation.positions.map((pos, index) => (
                              <Box
                                key={index}
                                position="absolute"
                                left={`${(pos.x / 500) * 100}%`}
                                top={`${(pos.y / 300) * 100}%`}
                                w="20px"
                                h="20px"
                                bg={pos.color}
                                borderRadius="full"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                color="white"
                                fontWeight="bold"
                                fontSize="xs"
                                border="1px solid white"
                              >
                                {pos.number}
                              </Box>
                            ))}
                          </Box>

                          <Button
                            size="sm"
                            colorScheme="brand"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFormation(formation);
                              setShowFormationDrawer(false);
                              setActiveTab(0);
                            }}
                          >
                            Use Template
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  </ScaleFade>
                ))}
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Formation Selection Drawer */}
      <Drawer
        isOpen={showFormationDrawer}
        onClose={() => setShowFormationDrawer(false)}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>Select Formation</DrawerHeader>
          <DrawerCloseButton />
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {FORMATION_TEMPLATES.map((formation) => (
                <Card
                  key={formation.id}
                  cursor="pointer"
                  _hover={{ bg: 'gray.50' }}
                  onClick={() => {
                    setSelectedFormation(formation);
                    setShowFormationDrawer(false);
                    setActiveTab(0);
                  }}
                >
                  <CardBody>
                    <HStack spacing={4}>
                      <Icon as={getCategoryIcon(formation.category)} boxSize={8} color="brand.500" />
                      <VStack align="start" spacing={1} flex={1}>
                        <Heading size="sm">{formation.name}</Heading>
                        <Text fontSize="sm" color="gray.600">
                          {formation.description}
                        </Text>
                        <Badge colorScheme={getDifficultyColor(formation.difficulty)} size="sm">
                          {formation.difficulty}
                        </Badge>
                      </VStack>
                      <Button size="sm" colorScheme="brand" variant="outline">
                        Select
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Play Details Modal */}
      <Modal isOpen={showPlayDetails} onClose={() => setShowPlayDetails(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Play Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {currentPlay && (
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Play Name</FormLabel>
                  <Input
                    value={playName}
                    onChange={(e) => setPlayName(e.target.value)}
                    placeholder="Enter play name"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={playDescription}
                    onChange={(e) => setPlayDescription(e.target.value)}
                    placeholder="Enter play description"
                    rows={3}
                  />
                </FormControl>

                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={playCategory}
                      onChange={(e) => setPlayCategory(e.target.value as any)}
                    >
                      <option value="offense">Offense</option>
                      <option value="defense">Defense</option>
                      <option value="special">Special Teams</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Difficulty</FormLabel>
                    <Select
                      value={playDifficulty}
                      onChange={(e) => setPlayDifficulty(e.target.value as any)}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </Select>
                  </FormControl>
                </HStack>

                <HStack spacing={4}>
                  <Button
                    colorScheme="brand"
                    onClick={() => {
                      handleCreatePlay();
                      setShowPlayDetails(false);
                    }}
                    isLoading={isLoading}
                  >
                    Create Play
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPlayDetails(false)}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EnhancedPlaybookDesigner;





