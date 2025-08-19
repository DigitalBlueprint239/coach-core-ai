import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Heading,
  Flex,
  Grid,
  Badge,
  useToast,
  IconButton,
  Tooltip,
  Select,
  Input,
  Textarea,
  Switch,
  FormControl,
  FormLabel,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import {
  Play,
  Shield,
  Target,
  Users,
  Save,
  Share,
  Download,
  Upload,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  RotateCw,
  Undo,
  Redo,
  Layers,
  Grid3X3,
  Move,
  PenTool,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Zap,
  Brain,
  Star,
  BookOpen,
  FileText,
  Video,
  Image,
  Palette,
  Type,
  MousePointer,
  Hand,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronLeft
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Types
interface Point {
  x: number;
  y: number;
}

interface Player {
  id: string;
  number: string;
  position: string;
  x: number;
  y: number;
  color: string;
  size: 'small' | 'medium' | 'large';
  isSelected: boolean;
  isHighlighted: boolean;
}

interface Route {
  id: string;
  type: 'route' | 'block' | 'motion' | 'stunt' | 'blitz';
  points: Point[];
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
  arrow: boolean;
  label?: string;
  playerId?: string;
}

interface Play {
  id: string;
  name: string;
  type: 'offense' | 'defense' | 'special';
  formation: string;
  personnel: string;
  down: number;
  distance: number;
  fieldPosition: number;
  players: Player[];
  routes: Route[];
  notes: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
}

// Constants
const FIELD_COLORS = {
  background: '#15803d',
  endzone: '#3b82f6',
  endzoneAlpha: 0.13,
  yardLines: '#fff',
  playerSelected: '#3b82f6',
  playerDefault: '#1e293b',
  playerBorder: '#fff',
  routeDefault: '#ef4444',
  debug: '#f59e42'
};

const PLAYER_SIZES = {
  selected: 20,
  default: 16,
  borderWidth: 3
};

const ROUTE_STYLES = {
  width: 4,
  dashPattern: [5, 6],
  arrowSize: 15
};

// Utility functions
const getCanvasCoordinates = (event: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX: number, clientY: number;
  
  if ('touches' in event && event.touches[0]) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = (event as React.MouseEvent).clientX;
    clientY = (event as React.MouseEvent).clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
};

const findPlayerAtPosition = (players: Player[], x: number, y: number, threshold = 20) => {
  for (const player of players) {
    const distance = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
    if (distance <= threshold) {
      return player;
    }
  }
  return null;
};

const snapToGrid = (point: Point, gridSize = 10): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
};

// Canvas Drawing Functions
const drawField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Field background
  ctx.fillStyle = FIELD_COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // End zones
  const endzoneHeight = height * 0.1;
  ctx.fillStyle = FIELD_COLORS.endzone;
  ctx.globalAlpha = FIELD_COLORS.endzoneAlpha;
  ctx.fillRect(0, 0, width, endzoneHeight);
  ctx.fillRect(0, height - endzoneHeight, width, endzoneHeight);
  ctx.globalAlpha = 1;

  // Yard lines
  ctx.strokeStyle = FIELD_COLORS.yardLines;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  
  for (let i = 1; i < 10; i++) {
    const x = (width * i) / 10;
    ctx.beginPath();
    ctx.moveTo(x, endzoneHeight);
    ctx.lineTo(x, height - endzoneHeight);
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;

  // Hash marks
  ctx.globalAlpha = 0.5;
  for (let i = 1; i < 10; i++) {
    const x = (width * i) / 10;
    const hashY1 = height * 0.25;
    const hashY2 = height * 0.75;
    
    ctx.beginPath();
    ctx.moveTo(x, hashY1);
    ctx.lineTo(x, hashY1 + 6);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x, hashY2);
    ctx.lineTo(x, hashY2 + 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const drawPlayers = (ctx: CanvasRenderingContext2D, players: Player[]) => {
  players.forEach(player => {
    const size = player.isSelected ? PLAYER_SIZES.selected : PLAYER_SIZES.default;
    
    // Player circle
    ctx.beginPath();
    ctx.arc(player.x, player.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = player.color;
    ctx.fill();
    
    // Border
    ctx.lineWidth = PLAYER_SIZES.borderWidth;
    ctx.strokeStyle = player.isSelected ? FIELD_COLORS.playerSelected : FIELD_COLORS.playerBorder;
    ctx.stroke();
    
    // Number
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.number, player.x, player.y);
  });
};

const drawRoutes = (ctx: CanvasRenderingContext2D, routes: Route[], selectedRouteId?: string) => {
  routes.forEach(route => {
    if (route.points.length < 2) return;
    
    ctx.strokeStyle = route.color;
    ctx.lineWidth = route.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (route.style === 'dashed') {
      ctx.setLineDash([5, 5]);
    } else if (route.style === 'dotted') {
      ctx.setLineDash([2, 2]);
    } else {
      ctx.setLineDash([]);
    }
    
    // Draw path
    ctx.beginPath();
    ctx.moveTo(route.points[0].x, route.points[0].y);
    route.points.slice(1).forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    
    // Draw arrow
    if (route.arrow && route.points.length > 1) {
      const lastPoint = route.points[route.points.length - 1];
      const prevPoint = route.points[route.points.length - 2];
      
      const angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);
      const arrowLength = ROUTE_STYLES.arrowSize;
      
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(
        lastPoint.x - arrowLength * Math.cos(angle - Math.PI / 6),
        lastPoint.y - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(
        lastPoint.x - arrowLength * Math.cos(angle + Math.PI / 6),
        lastPoint.y - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  });
};

// Main Canvas Component
const FieldCanvas: React.FC<{
  players: Player[];
  routes: Route[];
  onPlayerMove: (playerId: string, x: number, y: number) => void;
  onPlayerSelect: (player: Player | null) => void;
  onRouteStart: (playerId: string, x: number, y: number) => void;
  onRoutePoint: (x: number, y: number) => void;
  onRouteEnd: () => void;
  selectedTool: string;
  isDrawingRoute: boolean;
  currentRoutePoints: Point[];
  zoom: number;
  pan: Point;
}> = ({
  players,
  routes,
  onPlayerMove,
  onPlayerSelect,
  onRouteStart,
  onRoutePoint,
  onRouteEnd,
  selectedTool,
  isDrawingRoute,
  currentRoutePoints,
  zoom,
  pan
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  const canvasWidth = 800;
  const canvasHeight = 400;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw field
    drawField(ctx, canvasWidth, canvasHeight);

    // Draw routes
    drawRoutes(ctx, routes);

    // Draw current route being drawn
    if (currentRoutePoints.length > 1) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentRoutePoints[0].x, currentRoutePoints[0].y);
      currentRoutePoints.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    // Draw players
    drawPlayers(ctx, players);

    ctx.restore();
  }, [players, routes, currentRoutePoints, zoom, pan]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e, canvas);
    if (!coords) return;

    // Adjust for zoom and pan
    const adjustedCoords = {
      x: (coords.x - pan.x) / zoom,
      y: (coords.y - pan.y) / zoom
    };

    if (selectedTool === 'select') {
      const player = findPlayerAtPosition(players, adjustedCoords.x, adjustedCoords.y);
      if (player) {
        setDraggedPlayer(player);
        setIsDragging(true);
        setDragOffset({
          x: adjustedCoords.x - player.x,
          y: adjustedCoords.y - player.y
        });
        onPlayerSelect(player);
      } else {
        onPlayerSelect(null);
      }
    } else if (selectedTool === 'route') {
      const player = findPlayerAtPosition(players, adjustedCoords.x, adjustedCoords.y);
      if (player && !isDrawingRoute) {
        onRouteStart(player.id, adjustedCoords.x, adjustedCoords.y);
      } else if (isDrawingRoute) {
        onRoutePoint(adjustedCoords.x, adjustedCoords.y);
      }
    }
  }, [players, selectedTool, isDrawingRoute, zoom, pan, onPlayerMove, onPlayerSelect, onRouteStart, onRoutePoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !draggedPlayer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e, canvas);
    if (!coords) return;

    const adjustedCoords = {
      x: (coords.x - pan.x) / zoom,
      y: (coords.y - pan.y) / zoom
    };

    const snappedCoords = snapToGrid({
      x: adjustedCoords.x - dragOffset.x,
      y: adjustedCoords.y - dragOffset.y
    });

    onPlayerMove(draggedPlayer.id, snappedCoords.x, snappedCoords.y);
  }, [isDragging, draggedPlayer, zoom, pan, dragOffset, onPlayerMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedPlayer(null);
      setDragOffset({ x: 0, y: 0 });
    }
    if (isDrawingRoute) {
      onRouteEnd();
    }
  }, [isDragging, isDrawingRoute, onRouteEnd]);

  return (
    <Box
      position="relative"
      w="full"
      h="full"
      bg="green.600"
      overflow="hidden"
      cursor={selectedTool === 'select' ? 'default' : 'crosshair'}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Instructions */}
      {selectedTool === 'route' && !isDrawingRoute && (
        <Box position="absolute" top={2} right={2} bg="blue.500" color="white" p={2} fontSize="xs" zIndex={1000} borderRadius="md">
          Click on a player to start drawing their route
        </Box>
      )}
      
      {isDrawingRoute && (
        <Box position="absolute" top={2} right={2} bg="green.500" color="white" p={2} fontSize="xs" zIndex={1000} borderRadius="md">
          Drawing route... Click to add points, release to finish
        </Box>
      )}
    </Box>
  );
};

// Main Play Designer Component
const PlayDesignerOptimized: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  
  // State
  const [selectedTool, setSelectedTool] = useState<'select' | 'player' | 'route'>('select');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [currentPlay, setCurrentPlay] = useState<Play | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [currentRoutePoints, setCurrentRoutePoints] = useState<Point[]>([]);
  const [currentRoutePlayerId, setCurrentRoutePlayerId] = useState<string>('');
  const [playType, setPlayType] = useState<'offense' | 'defense' | 'special'>('offense');
  const [formation, setFormation] = useState<string>('shotgun');

  // Initialize play
  useEffect(() => {
    if (!currentPlay) {
      const newPlay: Play = {
        id: `play-${Date.now()}`,
        name: 'New Play',
        type: playType,
        formation: formation,
        personnel: '11',
        down: 1,
        distance: 10,
        fieldPosition: 20,
        players: [],
        routes: [],
        notes: '',
        tags: [],
        difficulty: 'intermediate',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'Coach',
        isPublic: false
      };
      setCurrentPlay(newPlay);
    }
  }, [currentPlay, playType, formation]);

  // Event handlers
  const handlePlayerMove = useCallback((playerId: string, x: number, y: number) => {
    setCurrentPlay(prev => prev ? {
      ...prev,
      players: prev.players.map(p => 
        p.id === playerId ? { ...p, x, y } : p
      )
    } : null);
  }, []);

  const handlePlayerSelect = useCallback((player: Player | null) => {
    setSelectedPlayer(player);
  }, []);

  const handleRouteStart = useCallback((playerId: string, x: number, y: number) => {
    setIsDrawingRoute(true);
    setCurrentRoutePlayerId(playerId);
    setCurrentRoutePoints([{ x, y }]);
  }, []);

  const handleRoutePoint = useCallback((x: number, y: number) => {
    if (isDrawingRoute) {
      setCurrentRoutePoints(prev => [...prev, { x, y }]);
    }
  }, [isDrawingRoute]);

  const handleRouteEnd = useCallback(() => {
    if (isDrawingRoute && currentRoutePoints.length > 1) {
      const newRoute: Route = {
        id: `route-${Date.now()}`,
        type: 'route',
        points: [...currentRoutePoints],
        color: '#3B82F6',
        thickness: 3,
        style: 'solid',
        arrow: true,
        playerId: currentRoutePlayerId
      };

      setCurrentPlay(prev => prev ? {
        ...prev,
        routes: [...prev.routes, newRoute]
      } : null);

      toast({
        title: 'Route added!',
        description: 'Route has been added to the play.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }

    setIsDrawingRoute(false);
    setCurrentRoutePoints([]);
    setCurrentRoutePlayerId('');
  }, [isDrawingRoute, currentRoutePoints, currentRoutePlayerId, toast]);

  const handleSave = useCallback(() => {
    if (!currentPlay) return;

    const updatedPlay = {
      ...currentPlay,
      updatedAt: new Date()
    };

    setCurrentPlay(updatedPlay);
    toast({
      title: 'Play saved!',
      description: `${updatedPlay.name} has been saved successfully.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  }, [currentPlay, toast]);

  return (
    <Box minH="100vh" bg="var(--team-surface-50)">
      {/* Header */}
      <Box 
        className="team-gradient-hero"
        px={6}
        py={4}
        borderBottom="1px solid"
        borderColor="var(--team-border-light)"
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Icon as={Play} w={8} h={8} color="white" />
            <VStack align="start" spacing={0}>
              <Heading size="lg" color="white">Optimized Play Designer</Heading>
              <Text color="whiteAlpha.900" fontSize="sm">
                Modern, performant football play design
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={Save} />}
              variant="outline"
              color="white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: 'whiteAlpha.100' }}
              onClick={handleSave}
            >
              Save Play
            </Button>
            <Button
              leftIcon={<Icon as={Brain} />}
              bg="white"
              color="var(--team-primary)"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
              className="team-glow"
            >
              AI Assistant
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Flex h="calc(100vh - 80px)">
        {/* Left Sidebar - Tools */}
        <Box w="250px" bg="white" borderRight="1px solid" borderColor="var(--team-border-light)" p={4}>
          <VStack spacing={4} align="stretch">
            <Text fontWeight="medium">Tools</Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={2}>
              <Button
                size="sm"
                variant={selectedTool === 'select' ? "solid" : "outline"}
                colorScheme={selectedTool === 'select' ? "blue" : "gray"}
                leftIcon={<Icon as={MousePointer} />}
                onClick={() => setSelectedTool('select')}
              >
                Select
              </Button>
              <Button
                size="sm"
                variant={selectedTool === 'route' ? "solid" : "outline"}
                colorScheme={selectedTool === 'route' ? "blue" : "gray"}
                leftIcon={<Icon as={PenTool} />}
                onClick={() => setSelectedTool('route')}
              >
                Route
              </Button>
            </Grid>

            <Divider />

            <Text fontWeight="medium">View Controls</Text>
            <HStack>
              <IconButton
                icon={<Icon as={ZoomOut} />}
                aria-label="Zoom Out"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              />
              <Text fontSize="sm">{Math.round(zoom * 100)}%</Text>
              <IconButton
                icon={<Icon as={ZoomIn} />}
                aria-label="Zoom In"
                size="sm"
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              />
            </HStack>
          </VStack>
        </Box>

        {/* Main Canvas */}
        <Box flex={1} position="relative">
          <FieldCanvas
            players={currentPlay?.players || []}
            routes={currentPlay?.routes || []}
            onPlayerMove={handlePlayerMove}
            onPlayerSelect={handlePlayerSelect}
            onRouteStart={handleRouteStart}
            onRoutePoint={handleRoutePoint}
            onRouteEnd={handleRouteEnd}
            selectedTool={selectedTool}
            isDrawingRoute={isDrawingRoute}
            currentRoutePoints={currentRoutePoints}
            zoom={zoom}
            pan={pan}
          />
        </Box>

        {/* Right Sidebar - Properties */}
        <Box w="250px" bg="white" borderLeft="1px solid" borderColor="var(--team-border-light)" p={4}>
          <VStack spacing={4} align="stretch">
            <Text fontWeight="medium">Play Properties</Text>
            
            <FormControl>
              <FormLabel fontSize="sm">Play Name</FormLabel>
              <Input
                value={currentPlay?.name || ''}
                onChange={(e) => setCurrentPlay(prev => prev ? { ...prev, name: e.target.value } : null)}
                size="sm"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Play Type</FormLabel>
              <Select
                value={playType}
                onChange={(e) => setPlayType(e.target.value as any)}
                size="sm"
              >
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
                <option value="special">Special Teams</option>
              </Select>
            </FormControl>

            {selectedPlayer && (
              <>
                <Divider />
                <Text fontWeight="medium">Player Properties</Text>
                <FormControl>
                  <FormLabel fontSize="sm">Number</FormLabel>
                  <Input
                    value={selectedPlayer.number}
                    onChange={(e) => {
                      setCurrentPlay(prev => prev ? {
                        ...prev,
                        players: prev.players.map(p => 
                          p.id === selectedPlayer.id 
                            ? { ...p, number: e.target.value }
                            : p
                        )
                      } : null);
                    }}
                    size="sm"
                  />
                </FormControl>
              </>
            )}

            <Divider />

            <Text fontWeight="medium">Statistics</Text>
            <VStack spacing={2} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm">Players:</Text>
                <Badge colorScheme="blue">{currentPlay?.players.length || 0}</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Routes:</Text>
                <Badge colorScheme="green">{currentPlay?.routes.length || 0}</Badge>
              </HStack>
            </VStack>
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
};

export default PlayDesignerOptimized; 