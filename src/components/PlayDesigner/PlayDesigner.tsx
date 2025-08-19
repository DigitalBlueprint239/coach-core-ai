import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  useBreakpointValue,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  Select,
  Input,
  FormControl,
  FormLabel,
  IconButton,
  Tooltip,
  useToast,
  Divider,
  Badge,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import {
  Save,
  Download,
  Share,
  Undo,
  Redo,
  Trash2,
  Settings,
  Users,
  Route,
  PenTool,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { RESPONSIVE_SPACING, RESPONSIVE_FONTS, RESPONSIVE_HOVER } from '../../utils/responsive';
import PlayDesignerCanvas from './PlayDesignerCanvas';
import Player from './Player';
import RouteDrawer from './RouteDrawer';

interface PlayDesignerProps {
  initialPlayData?: any;
  onSave?: (playData: any) => void;
  onExport?: (format: string) => void;
  mobileOptimized?: boolean;
}

interface Player {
  id: string;
  position: string;
  number: number;
  team: 'offense' | 'defense';
  x: number;
  y: number;
  isKey?: boolean;
}

interface Route {
  id: string;
  playerId: string;
  points: Array<{ x: number; y: number; timestamp: number }>;
  type: 'run' | 'pass' | 'block' | 'custom';
  color: string;
  strokeWidth: number;
  dash: number[];
  tension: number;
  arrow: boolean;
}

interface PlayData {
  id: string;
  name: string;
  description: string;
  formation: string;
  fieldType: '11v11' | '7v7' | '5v5';
  players: Player[];
  routes: Route[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PlayDesigner: React.FC<PlayDesignerProps> = ({
  initialPlayData,
  onSave,
  onExport,
  mobileOptimized = false
}) => {
  const [playData, setPlayData] = useState<PlayData>(initialPlayData || {
    id: `play-${Date.now()}`,
    name: 'New Play',
    description: '',
    formation: '4-4-2',
    fieldType: '11v11',
    players: [],
    routes: [],
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const [selectedTool, setSelectedTool] = useState<'select' | 'move' | 'draw' | 'pan'>('select');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [undoStack, setUndoStack] = useState<PlayData[]>([]);
  const [redoStack, setRedoStack] = useState<PlayData[]>([]);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const spacing = useBreakpointValue(RESPONSIVE_SPACING.md);
  const headingSize = useBreakpointValue(RESPONSIVE_FONTS.lg);

  // Default formations
  const formations = {
    '11v11': ['4-4-2', '4-3-3', '3-5-2', '4-5-1', '3-4-3', '5-3-2'],
    '7v7': ['3-2-1', '2-3-1', '3-1-2', '2-2-2', '4-1-1'],
    '5v5': ['2-1-1', '1-2-1', '2-0-2', '1-1-2', '3-0-1']
  };

  // Save current state for undo/redo
  const saveState = useCallback(() => {
    setUndoStack(prev => [...prev, { ...playData }]);
    setRedoStack([]);
  }, [playData]);

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, { ...playData }]);
      setPlayData(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, playData]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, { ...playData }]);
      setPlayData(nextState);
      setRedoStack(prev => prev.slice(0, -1));
    }
  }, [redoStack, playData]);

  // Add player to field
  const addPlayer = useCallback((player: Omit<Player, 'id'>) => {
    saveState();
    const newPlayer: Player = {
      ...player,
      id: `player-${Date.now()}-${Math.random()}`
    };
    setPlayData(prev => ({
      ...prev,
      players: [...prev.players, newPlayer],
      updatedAt: new Date()
    }));
  }, [saveState]);

  // Update player position
  const updatePlayerPosition = useCallback((playerId: string, x: number, y: number) => {
    setPlayData(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === playerId ? { ...p, x, y } : p
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Remove player
  const removePlayer = useCallback((playerId: string) => {
    saveState();
    setPlayData(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== playerId),
      routes: prev.routes.filter(r => r.playerId !== playerId),
      updatedAt: new Date()
    }));
  }, [saveState]);

  // Add route
  const addRoute = useCallback((route: Route) => {
    saveState();
    setPlayData(prev => ({
      ...prev,
      routes: [...prev.routes, route],
      updatedAt: new Date()
    }));
  }, [saveState]);

  // Remove route
  const removeRoute = useCallback((routeId: string) => {
    saveState();
    setPlayData(prev => ({
      ...prev,
      routes: prev.routes.filter(r => r.id !== routeId),
      updatedAt: new Date()
    }));
  }, [saveState]);

  // Save play
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(playData);
      toast({
        title: 'Play Saved!',
        description: 'Your play has been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [playData, onSave, toast]);

  // Export play
  const handleExport = useCallback((format: string) => {
    if (onExport) {
      onExport(format);
    }
    toast({
      title: 'Export Started',
      description: `Exporting play as ${format.toUpperCase()}...`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  }, [onExport, toast]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (playData.players.length > 0 || playData.routes.length > 0) {
        // Auto-save to local storage
        localStorage.setItem(`play-${playData.id}`, JSON.stringify(playData));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [playData]);

  return (
    <Box
      bg={bgColor}
      minH="100vh"
      p={spacing}
      className="animate-fade-in-responsive"
    >
      <VStack spacing={spacing} align="stretch">
        {/* Header */}
        <Card
          variant="elevated"
          _hover={useBreakpointValue(RESPONSIVE_HOVER.lift)}
          transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        >
          <CardHeader>
            <Flex align="center" justify="space-between">
              <VStack align="start" spacing={2}>
                <Heading size={headingSize} color="gray.800">
                  <Icon as={Route} mr={2} color="blue.500" />
                  Play Designer
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Design and visualize football plays with precision
                </Text>
              </VStack>
              
              <HStack spacing={2}>
                <Button
                  leftIcon={<Icon as={Save} />}
                  colorScheme="blue"
                  variant="solid"
                  size={{ base: 'sm', md: 'md' }}
                  onClick={handleSave}
                >
                  Save Play
                </Button>
                <Button
                  leftIcon={<Icon as={Download} />}
                  variant="outline"
                  size={{ base: 'sm', md: 'md' }}
                  onClick={() => handleExport('png')}
                >
                  Export
                </Button>
              </HStack>
            </Flex>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <HStack spacing={spacing} align="start">
          {/* Left Sidebar - Tools and Settings */}
          <VStack spacing={spacing} align="stretch" w={{ base: 'full', md: '300px' }}>
            {/* Tool Selection */}
            <Card variant="elevated">
              <CardHeader>
                <Heading size="md" color="gray.800">
                  <Icon as={PenTool} mr={2} color="green.500" />
                  Tools
                </Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <Button
                    variant={selectedTool === 'select' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<Icon as={Eye} />}
                    onClick={() => setSelectedTool('select')}
                    w="full"
                  >
                    Select
                  </Button>
                  <Button
                    variant={selectedTool === 'move' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<Icon as={Move} />}
                    onClick={() => setSelectedTool('move')}
                    w="full"
                  >
                    Move
                  </Button>
                  <Button
                    variant={selectedTool === 'draw' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<Icon as={Route} />}
                    onClick={() => setSelectedTool('draw')}
                    w="full"
                  >
                    Draw Routes
                  </Button>
                  <Button
                    variant={selectedTool === 'pan' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<Icon as={Move} />}
                    onClick={() => setSelectedTool('pan')}
                    w="full"
                  >
                    Pan Canvas
                  </Button>
                </VStack>
              </CardBody>
            </Card>

            {/* Play Settings */}
            <Card variant="elevated">
              <CardHeader>
                <Heading size="md" color="gray.800">
                  <Icon as={Settings} mr={2} color="purple.500" />
                  Play Settings
                </Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="sm">Play Name</FormLabel>
                    <Input
                      value={playData.name}
                      onChange={(e) => setPlayData(prev => ({ ...prev, name: e.target.value }))}
                      size="sm"
                      placeholder="Enter play name"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Field Type</FormLabel>
                    <Select
                      value={playData.fieldType}
                      onChange={(e) => setPlayData(prev => ({ ...prev, fieldType: e.target.value as any }))}
                      size="sm"
                    >
                      <option value="11v11">11 vs 11</option>
                      <option value="7v7">7 vs 7</option>
                      <option value="5v5">5 vs 5</option>
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Formation</FormLabel>
                    <Select
                      value={playData.formation}
                      onChange={(e) => setPlayData(prev => ({ ...prev, formation: e.target.value }))}
                      size="sm"
                    >
                      {formations[playData.fieldType].map(formation => (
                        <option key={formation} value={formation}>{formation}</option>
                      ))}
                    </Select>
                  </FormControl>
                </VStack>
              </CardBody>
            </Card>

            {/* Player Management */}
            <Card variant="elevated">
              <CardHeader>
                <Flex align="center" justify="space-between">
                  <Heading size="md" color="gray.800">
                    <Icon as={Users} mr={2} color="orange.500" />
                    Players
                  </Heading>
                  <IconButton
                    aria-label="Toggle players visibility"
                    icon={<Icon as={showPlayers ? Eye : EyeOff} />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPlayers(!showPlayers)}
                  />
                </Flex>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Icon as={Users} />}
                    onClick={() => {
                      // Add default player
                      addPlayer({
                        position: 'QB',
                        number: 1,
                        team: 'offense',
                        x: 400,
                        y: 300,
                        isKey: true
                      });
                    }}
                    w="full"
                  >
                    Add Player
                  </Button>
                  
                  {playData.players.map(player => (
                    <Flex key={player.id} align="center" justify="space-between" p={2} bg="gray.50" borderRadius="md">
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="semibold">
                          {player.position} #{player.number}
                        </Text>
                        <Badge colorScheme={player.team === 'offense' ? 'red' : 'blue'} size="sm">
                          {player.team}
                        </Badge>
                      </VStack>
                      <IconButton
                        aria-label="Remove player"
                        icon={<Icon as={Trash2} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => removePlayer(player.id)}
                      />
                    </Flex>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          </VStack>

          {/* Main Canvas Area */}
          <Box flex={1} minH="600px">
            <PlayDesignerCanvas
              playData={playData}
              onPlayUpdate={setPlayData}
              fieldType={playData.fieldType}
              width={800}
              height={600}
              mobileOptimized={mobileOptimized}
            />
          </Box>
        </HStack>

        {/* Bottom Toolbar */}
        <Card variant="elevated">
          <CardBody>
            <HStack spacing={4} justify="center">
              <Button
                leftIcon={<Icon as={Undo} />}
                variant="outline"
                size="sm"
                onClick={handleUndo}
                isDisabled={undoStack.length === 0}
              >
                Undo
              </Button>
              <Button
                leftIcon={<Icon as={Redo} />}
                variant="outline"
                size="sm"
                onClick={handleRedo}
                isDisabled={redoStack.length === 0}
              >
                Redo
              </Button>
              <Divider orientation="vertical" />
              <Button
                leftIcon={<Icon as={ZoomIn} />}
                variant="outline"
                size="sm"
              >
                Zoom In
              </Button>
              <Button
                leftIcon={<Icon as={ZoomOut} />}
                variant="outline"
                size="sm"
              >
                Zoom Out
              </Button>
              <Button
                leftIcon={<Icon as={RotateCcw} />}
                variant="outline"
                size="sm"
              >
                Reset View
              </Button>
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default PlayDesigner;
