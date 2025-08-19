import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
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
  Settings,
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
  Circle,
  Square,
  Triangle,
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
  FlipHorizontal,
  FlipVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  Hash,
  Clock,
  Calendar,
  Tag,
  Filter,
  Search,
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

// Football-specific interfaces
interface Player {
  id: string;
  number: string;
  position: string;
  x: number;
  y: number;
  route?: Route[];
  movement?: Movement[];
  assignment?: string;
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
}

interface Movement {
  id: string;
  type: 'motion' | 'shift' | 'stunt' | 'blitz';
  from: Point;
  to: Point;
  timing: number; // seconds
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

interface Point {
  x: number;
  y: number;
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
  movements: Movement[];
  notes: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  successRate?: number;
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
}

interface Formation {
  id: string;
  name: string;
  type: 'offense' | 'defense' | 'special';
  personnel: string;
  players: Player[];
  description: string;
  image?: string;
}

const PlayDesigner: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<'select' | 'player' | 'route' | 'motion' | 'text' | 'shape'>('select');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPlay, setCurrentPlay] = useState<Play | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [routePoints, setRoutePoints] = useState<Point[]>([]);
  const [selectedRouteType, setSelectedRouteType] = useState<string>('slant');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [showRouteTemplates, setShowRouteTemplates] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showYardLines, setShowYardLines] = useState(true);
  const [showHashMarks, setShowHashMarks] = useState(true);
  const [playType, setPlayType] = useState<'offense' | 'defense' | 'special'>('offense');
  const [formation, setFormation] = useState<string>('shotgun');
  const [personnel, setPersonnel] = useState<string>('11');
  const [down, setDown] = useState<number>(1);
  const [distance, setDistance] = useState<number>(10);
  const [fieldPosition, setFieldPosition] = useState<number>(20);
  const [currentTab, setCurrentTab] = useState<number>(0);

  // Mock data
  const formations = {
    offense: [
      { id: 'shotgun', name: 'Shotgun', personnel: '11', description: 'QB in shotgun with 1 RB' },
      { id: 'pistol', name: 'Pistol', personnel: '11', description: 'QB in pistol with 1 RB' },
      { id: 'i-formation', name: 'I-Formation', personnel: '21', description: 'Traditional I-formation' },
      { id: 'singleback', name: 'Singleback', personnel: '11', description: 'Single RB behind QB' },
      { id: 'wildcat', name: 'Wildcat', personnel: '20', description: 'Direct snap to RB' },
      { id: 'empty', name: 'Empty', personnel: '00', description: 'No RB, 5 WR' },
      { id: 'jumbo', name: 'Jumbo', personnel: '22', description: '2 RB, 2 TE' },
      { id: 'spread', name: 'Spread', personnel: '10', description: '1 RB, 4 WR' }
    ],
    defense: [
      { id: '4-3', name: '4-3 Defense', personnel: '43', description: '4 DL, 3 LB' },
      { id: '3-4', name: '3-4 Defense', personnel: '34', description: '3 DL, 4 LB' },
      { id: 'nickel', name: 'Nickel', personnel: '42', description: '4 DL, 2 LB, 5 DB' },
      { id: 'dime', name: 'Dime', personnel: '41', description: '4 DL, 1 LB, 6 DB' },
      { id: 'quarter', name: 'Quarter', personnel: '40', description: '4 DL, 7 DB' },
      { id: 'goal-line', name: 'Goal Line', personnel: '54', description: '5 DL, 4 LB' },
      { id: 'prevent', name: 'Prevent', personnel: '30', description: '3 DL, 8 DB' }
    ],
    special: [
      { id: 'field-goal', name: 'Field Goal', personnel: '11', description: 'Kicker, holder, protection' },
      { id: 'punt', name: 'Punt', personnel: '11', description: 'Punter, protection' },
      { id: 'kickoff', name: 'Kickoff', personnel: '11', description: 'Kicker, coverage team' },
      { id: 'kickoff-return', name: 'Kickoff Return', personnel: '11', description: 'Returner, blocking' },
      { id: 'punt-return', name: 'Punt Return', personnel: '11', description: 'Returner, blocking' },
      { id: 'extra-point', name: 'Extra Point', personnel: '11', description: 'Kicker, holder, protection' },
      { id: '2pt-conversion', name: '2-Point Conversion', personnel: '11', description: 'Offensive play from 2-yard line' }
    ]
  };

  const personnelGroups = {
    offense: [
      { id: '11', name: '11 Personnel', description: '1 RB, 1 TE, 3 WR' },
      { id: '12', name: '12 Personnel', description: '1 RB, 2 TE, 2 WR' },
      { id: '21', name: '21 Personnel', description: '2 RB, 1 TE, 2 WR' },
      { id: '22', name: '22 Personnel', description: '2 RB, 2 TE, 1 WR' },
      { id: '10', name: '10 Personnel', description: '1 RB, 0 TE, 4 WR' },
      { id: '20', name: '20 Personnel', description: '2 RB, 0 TE, 3 WR' },
      { id: '00', name: '00 Personnel', description: '0 RB, 0 TE, 5 WR' }
    ],
    defense: [
      { id: '43', name: '4-3', description: '4 DL, 3 LB, 4 DB' },
      { id: '34', name: '3-4', description: '3 DL, 4 LB, 4 DB' },
      { id: '42', name: 'Nickel', description: '4 DL, 2 LB, 5 DB' },
      { id: '41', name: 'Dime', description: '4 DL, 1 LB, 6 DB' },
      { id: '40', name: 'Quarter', description: '4 DL, 0 LB, 7 DB' },
      { id: '54', name: 'Goal Line', description: '5 DL, 4 LB, 2 DB' },
      { id: '30', name: 'Prevent', description: '3 DL, 0 LB, 8 DB' }
    ],
    special: [
      { id: '11', name: 'Standard', description: 'Kicker/Punter + 10 players' },
      { id: '12', name: 'Heavy', description: 'Kicker/Punter + 11 players' },
      { id: '10', name: 'Light', description: 'Kicker/Punter + 9 players' }
    ]
  };

  const tools = [
    { id: 'select', name: 'Select', icon: MousePointer, description: 'Select and move players' },
    { id: 'player', name: 'Add Player', icon: Users, description: 'Add players to the field' },
    { id: 'route', name: 'Draw Route', icon: PenTool, description: 'Draw player routes' },
    { id: 'motion', name: 'Motion', icon: Move, description: 'Add player motion' },
    { id: 'text', name: 'Text', icon: Type, description: 'Add text annotations' },
    { id: 'shape', name: 'Shapes', icon: Square, description: 'Add shapes and lines' }
  ];

  const routeTypes = [
    { id: 'slant', name: 'Slant', icon: ArrowRight, color: '#3B82F6' },
    { id: 'curl', name: 'Curl', icon: ArrowUp, color: '#10B981' },
    { id: 'out', name: 'Out', icon: ArrowRight, color: '#F59E0B' },
    { id: 'in', name: 'In', icon: ArrowLeft, color: '#EF4444' },
    { id: 'post', name: 'Post', icon: ArrowUp, color: '#8B5CF6' },
    { id: 'corner', name: 'Corner', icon: ArrowUp, color: '#EC4899' },
    { id: 'go', name: 'Go', icon: ArrowUp, color: '#06B6D4' },
    { id: 'hitch', name: 'Hitch', icon: ArrowUp, color: '#84CC16' },
    { id: 'block', name: 'Block', icon: Shield, color: '#6B7280' },
    { id: 'motion', name: 'Motion', icon: Move, color: '#F97316' }
  ];

  // Route templates for common play combinations
  const routeTemplates = {
    'slant-flat': [
      { playerPosition: 'wr', route: 'slant', points: [{ x: 20, y: 20 }, { x: 35, y: 35 }, { x: 50, y: 35 }] },
      { playerPosition: 'wr', route: 'out', points: [{ x: 80, y: 20 }, { x: 85, y: 20 }, { x: 85, y: 35 }] }
    ],
    'curl-flat': [
      { playerPosition: 'wr', route: 'curl', points: [{ x: 20, y: 20 }, { x: 25, y: 25 }, { x: 20, y: 35 }] },
      { playerPosition: 'wr', route: 'out', points: [{ x: 80, y: 20 }, { x: 85, y: 20 }, { x: 85, y: 35 }] }
    ],
    'post-corner': [
      { playerPosition: 'wr', route: 'post', points: [{ x: 20, y: 20 }, { x: 30, y: 30 }, { x: 40, y: 15 }] },
      { playerPosition: 'wr', route: 'corner', points: [{ x: 80, y: 20 }, { x: 85, y: 25 }, { x: 85, y: 15 }] }
    ],
    'go-hitch': [
      { playerPosition: 'wr', route: 'go', points: [{ x: 20, y: 20 }, { x: 20, y: 10 }] },
      { playerPosition: 'wr', route: 'hitch', points: [{ x: 80, y: 20 }, { x: 80, y: 25 }, { x: 80, y: 20 }] }
    ],
    'motion-sweep': [
      { playerPosition: 'rb', route: 'motion', points: [{ x: 50, y: 35 }, { x: 70, y: 35 }] },
      { playerPosition: 'rb', route: 'out', points: [{ x: 70, y: 35 }, { x: 85, y: 35 }] }
    ]
  };

  const positions = {
    offense: [
      { id: 'qb', name: 'QB', color: '#DC2626', number: '12' },
      { id: 'rb', name: 'RB', color: '#059669', number: '23' },
      { id: 'fb', name: 'FB', color: '#7C3AED', number: '44' },
      { id: 'wr', name: 'WR', color: '#2563EB', number: '84' },
      { id: 'te', name: 'TE', color: '#EA580C', number: '87' },
      { id: 'c', name: 'C', color: '#6B7280', number: '52' },
      { id: 'g', name: 'G', color: '#6B7280', number: '70' },
      { id: 't', name: 'T', color: '#6B7280', number: '76' }
    ],
    defense: [
      { id: 'de', name: 'DE', color: '#DC2626', number: '91' },
      { id: 'dt', name: 'DT', color: '#059669', number: '95' },
      { id: 'lb', name: 'LB', color: '#2563EB', number: '54' },
      { id: 'cb', name: 'CB', color: '#7C3AED', number: '24' },
      { id: 's', name: 'S', color: '#EA580C', number: '31' },
      { id: 'nickel', name: 'Nickel', color: '#F59E0B', number: '21' },
      { id: 'dime', name: 'Dime', color: '#EF4444', number: '22' }
    ],
    special: [
      { id: 'k', name: 'K', color: '#DC2626', number: '3' },
      { id: 'p', name: 'P', color: '#059669', number: '4' },
      { id: 'ls', name: 'LS', color: '#2563EB', number: '47' },
      { id: 'kr', name: 'KR', color: '#7C3AED', number: '25' },
      { id: 'pr', name: 'PR', color: '#EA580C', number: '11' }
    ]
  };

  // Initialize a new play
  const initializePlay = useCallback(() => {
    const newPlay: Play = {
      id: `play-${Date.now()}`,
      name: 'New Play',
      type: playType,
      formation: formation,
      personnel: personnel,
      down: down,
      distance: distance,
      fieldPosition: fieldPosition,
      players: [],
      routes: [],
      movements: [],
      notes: '',
      tags: [],
      difficulty: 'intermediate',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'Coach',
      isPublic: false
    };
    setCurrentPlay(newPlay);
  }, [playType, formation, personnel, down, distance, fieldPosition]);

  // Handle play type change
  const handlePlayTypeChange = (newType: 'offense' | 'defense' | 'special') => {
    setPlayType(newType);
    setFormation(formations[newType][0]?.id || '');
    setPersonnel(personnelGroups[newType][0]?.id || '');
  };

  // Comprehensive formation presets with proper football field positioning
  const formationPresets = {
    offense: {
      shotgun: [
        // Quarterback - center of field, 5 yards from line of scrimmage
        { position: 'qb', x: 50, y: 45, number: '12' },
        // Running back - behind QB, 2 yards back
        { position: 'rb', x: 50, y: 35, number: '23' },
        // Wide receivers - split out wide
        { position: 'wr', x: 15, y: 45, number: '84' },
        { position: 'wr', x: 85, y: 45, number: '85' },
        // Tight end - inline on right side
        { position: 'te', x: 75, y: 50, number: '87' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ],
      pistol: [
        // Quarterback - 3 yards behind center
        { position: 'qb', x: 50, y: 42, number: '12' },
        // Running back - behind QB, 2 yards back
        { position: 'rb', x: 50, y: 35, number: '23' },
        // Wide receivers - split out wide
        { position: 'wr', x: 15, y: 45, number: '84' },
        { position: 'wr', x: 85, y: 45, number: '85' },
        // Tight end - inline on right side
        { position: 'te', x: 75, y: 50, number: '87' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ],
      'i-formation': [
        // Quarterback - under center
        { position: 'qb', x: 50, y: 50, number: '12' },
        // Fullback - 2 yards behind QB
        { position: 'fb', x: 50, y: 45, number: '44' },
        // Running back - 4 yards behind QB
        { position: 'rb', x: 50, y: 40, number: '23' },
        // Wide receivers - split out wide
        { position: 'wr', x: 15, y: 45, number: '84' },
        { position: 'wr', x: 85, y: 45, number: '85' },
        // Tight end - inline on right side
        { position: 'te', x: 75, y: 50, number: '87' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ],
      singleback: [
        // Quarterback - under center
        { position: 'qb', x: 50, y: 50, number: '12' },
        // Running back - 3 yards behind QB
        { position: 'rb', x: 50, y: 43, number: '23' },
        // Wide receivers - split out wide
        { position: 'wr', x: 15, y: 45, number: '84' },
        { position: 'wr', x: 85, y: 45, number: '85' },
        // Tight end - inline on right side
        { position: 'te', x: 75, y: 50, number: '87' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ],
      wildcat: [
        // Running back at QB position
        { position: 'rb', x: 50, y: 50, number: '23' },
        // Second running back - 2 yards behind
        { position: 'rb', x: 50, y: 45, number: '24' },
        // Wide receivers - split out wide
        { position: 'wr', x: 15, y: 45, number: '84' },
        { position: 'wr', x: 85, y: 45, number: '85' },
        // Tight end - inline on right side
        { position: 'te', x: 75, y: 50, number: '87' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ],
      empty: [
        // Quarterback - under center
        { position: 'qb', x: 50, y: 50, number: '12' },
        // 5 wide receivers - spread across field
        { position: 'wr', x: 10, y: 45, number: '84' },
        { position: 'wr', x: 90, y: 45, number: '85' },
        { position: 'wr', x: 25, y: 45, number: '86' },
        { position: 'wr', x: 75, y: 45, number: '88' },
        { position: 'wr', x: 50, y: 45, number: '89' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ],
      jumbo: [
        // Quarterback - under center
        { position: 'qb', x: 50, y: 50, number: '12' },
        // Two running backs
        { position: 'rb', x: 50, y: 43, number: '23' },
        { position: 'rb', x: 50, y: 40, number: '24' },
        // Two tight ends
        { position: 'te', x: 25, y: 50, number: '87' },
        { position: 'te', x: 75, y: 50, number: '88' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ],
      spread: [
        // Quarterback - under center
        { position: 'qb', x: 50, y: 50, number: '12' },
        // Running back - 3 yards behind QB
        { position: 'rb', x: 50, y: 43, number: '23' },
        // 4 wide receivers - spread across field
        { position: 'wr', x: 10, y: 45, number: '84' },
        { position: 'wr', x: 90, y: 45, number: '85' },
        { position: 'wr', x: 25, y: 45, number: '86' },
        { position: 'wr', x: 75, y: 45, number: '88' },
        // Offensive line - on line of scrimmage
        { position: 'c', x: 50, y: 55, number: '52' },
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' }
      ]
    },
    defense: {
      '4-3': [
        // Defensive line - on line of scrimmage
        { position: 'de', x: 25, y: 55, number: '91' },
        { position: 'de', x: 75, y: 55, number: '92' },
        { position: 'dt', x: 40, y: 55, number: '95' },
        { position: 'dt', x: 60, y: 55, number: '96' },
        // Linebackers - 2-3 yards off line
        { position: 'lb', x: 35, y: 48, number: '54' },
        { position: 'lb', x: 50, y: 48, number: '55' },
        { position: 'lb', x: 65, y: 48, number: '56' },
        // Secondary - 5-8 yards off line
        { position: 'cb', x: 20, y: 40, number: '24' },
        { position: 'cb', x: 80, y: 40, number: '25' },
        { position: 's', x: 35, y: 35, number: '31' },
        { position: 's', x: 65, y: 35, number: '32' }
      ],
      '3-4': [
        // Defensive line - on line of scrimmage
        { position: 'de', x: 30, y: 55, number: '91' },
        { position: 'de', x: 70, y: 55, number: '92' },
        { position: 'dt', x: 50, y: 55, number: '95' },
        // Linebackers - 2-3 yards off line
        { position: 'lb', x: 25, y: 48, number: '54' },
        { position: 'lb', x: 40, y: 48, number: '55' },
        { position: 'lb', x: 60, y: 48, number: '56' },
        { position: 'lb', x: 75, y: 48, number: '57' },
        // Secondary - 5-8 yards off line
        { position: 'cb', x: 20, y: 40, number: '24' },
        { position: 'cb', x: 80, y: 40, number: '25' },
        { position: 's', x: 35, y: 35, number: '31' },
        { position: 's', x: 65, y: 35, number: '32' }
      ],
      nickel: [
        // Defensive line - on line of scrimmage
        { position: 'de', x: 25, y: 55, number: '91' },
        { position: 'de', x: 75, y: 55, number: '92' },
        { position: 'dt', x: 40, y: 55, number: '95' },
        { position: 'dt', x: 60, y: 55, number: '96' },
        // Linebackers - 2-3 yards off line
        { position: 'lb', x: 35, y: 48, number: '54' },
        { position: 'lb', x: 65, y: 48, number: '56' },
        // Secondary - 5-8 yards off line
        { position: 'cb', x: 15, y: 40, number: '24' },
        { position: 'cb', x: 85, y: 40, number: '25' },
        { position: 'nickel', x: 50, y: 40, number: '21' },
        { position: 's', x: 30, y: 35, number: '31' },
        { position: 's', x: 70, y: 35, number: '32' }
      ],
      dime: [
        // Defensive line - on line of scrimmage
        { position: 'de', x: 25, y: 55, number: '91' },
        { position: 'de', x: 75, y: 55, number: '92' },
        { position: 'dt', x: 40, y: 55, number: '95' },
        { position: 'dt', x: 60, y: 55, number: '96' },
        // Linebacker - 2-3 yards off line
        { position: 'lb', x: 50, y: 48, number: '55' },
        // Secondary - 5-8 yards off line
        { position: 'cb', x: 15, y: 40, number: '24' },
        { position: 'cb', x: 85, y: 40, number: '25' },
        { position: 'nickel', x: 35, y: 40, number: '21' },
        { position: 'dime', x: 65, y: 40, number: '22' },
        { position: 's', x: 25, y: 35, number: '31' },
        { position: 's', x: 75, y: 35, number: '32' }
      ],
      quarter: [
        // Defensive line - on line of scrimmage
        { position: 'de', x: 25, y: 55, number: '91' },
        { position: 'de', x: 75, y: 55, number: '92' },
        { position: 'dt', x: 40, y: 55, number: '95' },
        { position: 'dt', x: 60, y: 55, number: '96' },
        // Secondary - 5-8 yards off line
        { position: 'cb', x: 15, y: 40, number: '24' },
        { position: 'cb', x: 85, y: 40, number: '25' },
        { position: 'nickel', x: 30, y: 40, number: '21' },
        { position: 'dime', x: 70, y: 40, number: '22' },
        { position: 's', x: 20, y: 35, number: '31' },
        { position: 's', x: 80, y: 35, number: '32' },
        { position: 's', x: 50, y: 30, number: '33' }
      ],
      'goal-line': [
        // Defensive line - on line of scrimmage, packed tight
        { position: 'de', x: 20, y: 55, number: '91' },
        { position: 'de', x: 80, y: 55, number: '92' },
        { position: 'dt', x: 35, y: 55, number: '95' },
        { position: 'dt', x: 50, y: 55, number: '96' },
        { position: 'dt', x: 65, y: 55, number: '97' },
        // Linebackers - close to line
        { position: 'lb', x: 30, y: 50, number: '54' },
        { position: 'lb', x: 50, y: 50, number: '55' },
        { position: 'lb', x: 70, y: 50, number: '56' },
        { position: 'lb', x: 40, y: 48, number: '57' },
        // Secondary - close coverage
        { position: 'cb', x: 25, y: 45, number: '24' },
        { position: 'cb', x: 75, y: 45, number: '25' }
      ],
      prevent: [
        // Defensive line - on line of scrimmage
        { position: 'de', x: 30, y: 55, number: '91' },
        { position: 'de', x: 70, y: 55, number: '92' },
        { position: 'dt', x: 50, y: 55, number: '95' },
        // Secondary - deep coverage
        { position: 'cb', x: 15, y: 30, number: '24' },
        { position: 'cb', x: 85, y: 30, number: '25' },
        { position: 'nickel', x: 30, y: 30, number: '21' },
        { position: 'dime', x: 70, y: 30, number: '22' },
        { position: 's', x: 20, y: 25, number: '31' },
        { position: 's', x: 80, y: 25, number: '32' },
        { position: 's', x: 35, y: 20, number: '33' },
        { position: 's', x: 65, y: 20, number: '34' }
      ]
    },
    special: {
      'field-goal': [
        // Kicker
        { position: 'k', x: 50, y: 35, number: '3' },
        // Holder
        { position: 'qb', x: 50, y: 50, number: '12' },
        // Long snapper
        { position: 'c', x: 50, y: 55, number: '52' },
        // Protection
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' },
        { position: 'te', x: 25, y: 55, number: '87' },
        { position: 'te', x: 75, y: 55, number: '88' }
      ],
      punt: [
        // Punter
        { position: 'p', x: 50, y: 30, number: '4' },
        // Long snapper
        { position: 'c', x: 50, y: 55, number: '52' },
        // Protection
        { position: 'g', x: 40, y: 55, number: '70' },
        { position: 'g', x: 60, y: 55, number: '71' },
        { position: 't', x: 30, y: 55, number: '76' },
        { position: 't', x: 70, y: 55, number: '77' },
        { position: 'te', x: 25, y: 55, number: '87' },
        { position: 'te', x: 75, y: 55, number: '88' },
        // Coverage
        { position: 'lb', x: 35, y: 45, number: '54' },
        { position: 'lb', x: 65, y: 45, number: '56' },
        { position: 'cb', x: 20, y: 35, number: '24' },
        { position: 'cb', x: 80, y: 35, number: '25' }
      ],
      'kickoff': [
        // Kicker
        { position: 'k', x: 50, y: 10, number: '3' },
        // Coverage team
        { position: 'lb', x: 20, y: 20, number: '54' },
        { position: 'lb', x: 80, y: 20, number: '56' },
        { position: 'lb', x: 35, y: 25, number: '55' },
        { position: 'lb', x: 65, y: 25, number: '57' },
        { position: 'cb', x: 15, y: 30, number: '24' },
        { position: 'cb', x: 85, y: 30, number: '25' },
        { position: 's', x: 30, y: 35, number: '31' },
        { position: 's', x: 70, y: 35, number: '32' },
        { position: 's', x: 45, y: 40, number: '33' },
        { position: 's', x: 55, y: 40, number: '34' }
      ],
      'kickoff-return': [
        // Returner
        { position: 'rb', x: 50, y: 10, number: '23' },
        // Blocking
        { position: 'wr', x: 20, y: 15, number: '84' },
        { position: 'wr', x: 80, y: 15, number: '85' },
        { position: 'te', x: 30, y: 20, number: '87' },
        { position: 'te', x: 70, y: 20, number: '88' },
        { position: 'lb', x: 25, y: 25, number: '54' },
        { position: 'lb', x: 75, y: 25, number: '56' },
        { position: 'cb', x: 35, y: 30, number: '24' },
        { position: 'cb', x: 65, y: 30, number: '25' },
        { position: 's', x: 40, y: 35, number: '31' },
        { position: 's', x: 60, y: 35, number: '32' }
      ]
    }
  };

  const loadFormationPreset = () => {
    console.log('Loading formation:', { playType, formation }); // Debug
    
    // Check if the formation exists in the presets
    const formationKey = formation as keyof typeof formationPresets[typeof playType];
    const preset = formationPresets[playType]?.[formationKey];
    
    console.log('Formation key:', formationKey); // Debug
    console.log('Formation preset:', preset); // Debug
    
    if (!preset) {
      console.log('Available formations for', playType, ':', Object.keys(formationPresets[playType] || {})); // Debug
      toast({
        title: 'Formation not found',
        description: `No preset found for ${formation} formation. Available: ${Object.keys(formationPresets[playType] || {}).join(', ')}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newPlayers: Player[] = preset.map((p, index) => {
      const position = positions[playType].find(pos => pos.id === p.position);
      return {
        id: `player-${Date.now()}-${index}`,
        number: p.number,
        position: p.position,
        x: p.x,
        y: p.y,
        color: position?.color || '#6B7280',
        size: 'medium',
        isSelected: false,
        isHighlighted: false
      };
    });

    console.log('New players:', newPlayers); // Debug

    setCurrentPlay(prev => prev ? {
      ...prev,
      players: newPlayers
    } : null);

    toast({
      title: 'Formation loaded!',
      description: `${formations[playType].find(f => f.id === formation)?.name} formation has been applied.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const loadRouteTemplate = (templateName: string) => {
    const template = routeTemplates[templateName as keyof typeof routeTemplates];
    if (!template || !currentPlay) return;

    const newRoutes: Route[] = template.map((t, index) => {
      const routeType = routeTypes.find(r => r.id === t.route);
      const player = currentPlay.players.find(p => p.position === t.playerPosition);
      
      return {
        id: `route-${Date.now()}-${index}`,
        type: t.route as any,
        points: t.points,
        color: routeType?.color || '#3B82F6',
        thickness: 3,
        style: 'solid',
        arrow: true,
        label: `${player?.number || 'X'} ${routeType?.name}`
      };
    });

    setCurrentPlay(prev => prev ? {
      ...prev,
      routes: [...prev.routes, ...newRoutes]
    } : null);

    toast({
      title: 'Route template loaded!',
      description: `${templateName} route combination has been applied.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const startPlayAnimation = () => {
    console.log('Starting animation:', { currentPlay, routes: currentPlay?.routes }); // Debug
    
    if (!currentPlay || currentPlay.routes.length === 0) {
      toast({
        title: 'No routes to animate',
        description: 'Add some routes to the play first.',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsAnimating(true);
    setAnimationStep(0);
    
    const animateRoutes = () => {
      console.log('Animation step:', animationStep, 'Total routes:', currentPlay.routes.length); // Debug
      
      if (animationStep < currentPlay.routes.length) {
        setAnimationStep(prev => prev + 1);
        setTimeout(animateRoutes, 1000); // 1 second per route
      } else {
        setIsAnimating(false);
        setAnimationStep(0);
        console.log('Animation complete'); // Debug
      }
    };
    
    animateRoutes();
  };

  useEffect(() => {
    if (!currentPlay) {
      initializePlay();
    }
  }, [currentPlay, initializePlay]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedPlayer) {
        setCurrentPlay(prev => prev ? {
          ...prev,
          players: prev.players.filter(p => p.id !== selectedPlayer.id)
        } : null);
        setSelectedPlayer(null);
        toast({
          title: 'Player deleted',
          description: 'Player has been removed from the field.',
          status: 'info',
          duration: 2000,
          isClosable: true,
        });
      }
      
      if (e.key === 'Escape') {
        setSelectedPlayer(null);
        setSelectedTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayer, toast]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    console.log('Canvas click:', { x, y, selectedTool, isDrawingRoute, selectedPlayer }); // Debug

    if (selectedTool === 'player') {
      addPlayer(x, y);
    } else if (selectedTool === 'route') {
      // Check if clicking on a player to select them
      const clickedPlayer = currentPlay?.players.find(player => {
        const distance = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
        return distance < 20; // 20px radius for player selection
      });
      
      if (clickedPlayer && !isDrawingRoute) {
        // Select player for route drawing
        setSelectedPlayer(clickedPlayer);
        toast({
          title: 'Player selected!',
          description: `Player ${clickedPlayer.number} selected. Click on the field to start drawing their route.`,
          status: 'info',
          duration: 2000,
          isClosable: true,
        });
      } else if (isDrawingRoute) {
        // Continue drawing route
        continueRoute(x, y);
      } else if (selectedPlayer && !isDrawingRoute) {
        // Start drawing route for selected player
        startRoute(x, y);
      } else {
        toast({
          title: 'Select a player first',
          description: 'Click on a player to select them for route drawing.',
          status: 'warning',
          duration: 2000,
          isClosable: true,
        });
      }
    } else if (selectedTool === 'select') {
      // Check if clicking on a player to select them
      const clickedPlayer = currentPlay?.players.find(player => {
        const distance = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
        return distance < 20; // 20px radius for player selection
      });
      
      if (clickedPlayer) {
        setSelectedPlayer(clickedPlayer);
      } else {
        // Deselect current player when clicking on empty space
        setSelectedPlayer(null);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Update current route with mouse position
    if (isDrawingRoute && currentRoute && routePoints.length > 0) {
      const newPoints = [...routePoints, { x, y }];
      const updatedRoute = {
        ...currentRoute,
        points: newPoints
      };
      setCurrentRoute(updatedRoute);
      console.log('Route updated:', updatedRoute); // Debug
    }

    // Update dragged player position
    if (isDragging && draggedPlayer) {
      const snappedX = Math.round(x / 10) * 10;
      const snappedY = Math.round(y / 10) * 10;
      
      setCurrentPlay(prev => prev ? {
        ...prev,
        players: prev.players.map(p => 
          p.id === draggedPlayer.id 
            ? { ...p, x: snappedX, y: snappedY }
            : p
        )
      } : null);
    }
  };

  const handleCanvasMouseUp = () => {
    console.log('Mouse up:', { isDrawingRoute, isDragging }); // Debug
    
    if (isDrawingRoute) {
      finishRoute();
    }
    if (isDragging) {
      setIsDragging(false);
      setDraggedPlayer(null);
    }
  };

  const addPlayer = (x: number, y: number) => {
    if (!currentPlay) return;

    const position = positions[playType][0];
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      number: position.number,
      position: position.id,
      x: Math.round(x / 10) * 10, // Snap to grid
      y: Math.round(y / 10) * 10,
      color: position.color,
      size: 'medium',
      isSelected: false,
      isHighlighted: false
    };

    setCurrentPlay(prev => prev ? {
      ...prev,
      players: [...prev.players, newPlayer]
    } : null);

    toast({
      title: 'Player added!',
      description: `${position.name} added to the field.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const startRoute = (x: number, y: number) => {
    if (!selectedPlayer) {
      toast({
        title: 'Select a player first',
        description: 'Click on a player to select them before drawing a route.',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsDrawingRoute(true);
    setRoutePoints([{ x, y }]);
    
    const routeType = routeTypes.find(r => r.id === selectedRouteType);
    const newRoute: Route = {
      id: `route-${Date.now()}`,
      type: selectedRouteType as any,
      points: [{ x, y }],
      color: routeType?.color || '#3B82F6',
      thickness: 3,
      style: 'solid',
      arrow: true,
      label: `${selectedPlayer.number} ${routeType?.name}`
    };
    
    setCurrentRoute(newRoute);
    console.log('Route started:', newRoute); // Debug
  };

  const continueRoute = (x: number, y: number) => {
    if (!isDrawingRoute || !currentRoute) return;
    
    const newPoints = [...routePoints, { x, y }];
    setRoutePoints(newPoints);
    
    const updatedRoute = {
      ...currentRoute,
      points: newPoints
    };
    setCurrentRoute(updatedRoute);
  };

  const finishRoute = () => {
    console.log('Finishing route:', { isDrawingRoute, currentRoute, selectedPlayer }); // Debug
    
    if (!isDrawingRoute || !currentRoute || !selectedPlayer) return;
    
    // Add route to the play's routes array (not just player)
    setCurrentPlay(prev => prev ? {
      ...prev,
      routes: [...prev.routes, currentRoute]
    } : null);
    
    // Reset drawing state
    setIsDrawingRoute(false);
    setCurrentRoute(null);
    setRoutePoints([]);
    
    toast({
      title: 'Route added!',
      description: `Route drawn for player ${selectedPlayer.number}`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleSave = () => {
    if (!currentPlay) return;

    // Update the play with current data
    const updatedPlay = {
      ...currentPlay,
      name: currentPlay.name || 'New Play',
      formation,
      personnel,
      down,
      distance,
      fieldPosition,
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
  };

  const handleShare = () => {
    toast({
      title: 'Play shared!',
      description: 'Play has been shared with your team.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

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
              <Heading size="lg" color="white">Smart Playbook</Heading>
              <Text color="whiteAlpha.900" fontSize="sm">
                Design, create, and share football plays
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={4}>
            <Input
              placeholder="Play name..."
              value={currentPlay?.name || ''}
              onChange={(e) => setCurrentPlay(prev => prev ? { ...prev, name: e.target.value } : null)}
              bg="whiteAlpha.200"
              borderColor="whiteAlpha.300"
              color="white"
              _placeholder={{ color: 'whiteAlpha.600' }}
              size="sm"
              w="200px"
            />
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
              leftIcon={<Icon as={Share} />}
              variant="outline"
              color="white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: 'whiteAlpha.100' }}
              onClick={handleShare}
            >
              Share
            </Button>
            <Button
              leftIcon={<Icon as={Plus} />}
              variant="outline"
              color="white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: 'whiteAlpha.100' }}
              onClick={() => {
                setCurrentPlay(null);
                setSelectedPlayer(null);
                setSelectedTool('select');
                initializePlay();
              }}
            >
              New Play
            </Button>
            <Button
              leftIcon={<Icon as={Play} />}
              variant="outline"
              color="white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: 'whiteAlpha.100' }}
              onClick={startPlayAnimation}
              isDisabled={isAnimating}
            >
              {isAnimating ? 'Animating...' : 'Animate Play'}
            </Button>
            <Button
              leftIcon={<Icon as={Brain} />}
              bg="white"
              color="var(--team-primary)"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
              className="team-glow"
              onClick={() => {
                toast({
                  title: 'AI Assistant',
                  description: 'AI-powered play suggestions coming soon!',
                  status: 'info',
                  duration: 3000,
                  isClosable: true,
                });
              }}
            >
              AI Assistant
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Flex h="calc(100vh - 80px)">
        {/* Left Sidebar - Tools and Settings */}
        <Box w="300px" bg="white" borderRight="1px solid" borderColor="var(--team-border-light)" p={4}>
          <VStack spacing={6} align="stretch">
            {/* Play Type Selector */}
            <Box>
              <Text fontWeight="medium" mb={3}>Play Type</Text>
              <Tabs 
                variant="soft-rounded" 
                colorScheme="blue" 
                index={currentTab}
                onChange={(index) => {
                  setCurrentTab(index);
                  const types: ('offense' | 'defense' | 'special')[] = ['offense', 'defense', 'special'];
                  handlePlayTypeChange(types[index]);
                }}
              >
                <TabList>
                  <Tab>Offense</Tab>
                  <Tab>Defense</Tab>
                  <Tab>Special</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel p={0} pt={3}>
                    <VStack spacing={2} align="stretch">
                      <FormControl>
                        <FormLabel fontSize="sm">Formation</FormLabel>
                        <Select 
                          value={formation}
                          onChange={(e) => setFormation(e.target.value)}
                          size="sm"
                        >
                          {formations.offense.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">Personnel</FormLabel>
                        <Select 
                          value={personnel}
                          onChange={(e) => setPersonnel(e.target.value)}
                          size="sm"
                        >
                          {personnelGroups.offense.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        leftIcon={<Icon as={Users} />}
                        colorScheme="blue"
                        size="sm"
                        onClick={loadFormationPreset}
                      >
                        Load Formation
                      </Button>
                    </VStack>
                  </TabPanel>
                  <TabPanel p={0} pt={3}>
                    <VStack spacing={2} align="stretch">
                      <FormControl>
                        <FormLabel fontSize="sm">Formation</FormLabel>
                        <Select 
                          value={formation}
                          onChange={(e) => setFormation(e.target.value)}
                          size="sm"
                        >
                          {formations.defense.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">Personnel</FormLabel>
                        <Select 
                          value={personnel}
                          onChange={(e) => setPersonnel(e.target.value)}
                          size="sm"
                        >
                          {personnelGroups.defense.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        leftIcon={<Icon as={Shield} />}
                        colorScheme="blue"
                        size="sm"
                        onClick={loadFormationPreset}
                      >
                        Load Formation
                      </Button>
                    </VStack>
                  </TabPanel>
                  <TabPanel p={0} pt={3}>
                    <VStack spacing={2} align="stretch">
                      <FormControl>
                        <FormLabel fontSize="sm">Formation</FormLabel>
                        <Select 
                          value={formation}
                          onChange={(e) => setFormation(e.target.value)}
                          size="sm"
                        >
                          {formations.special.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">Personnel</FormLabel>
                        <Select 
                          value={personnel}
                          onChange={(e) => setPersonnel(e.target.value)}
                          size="sm"
                        >
                          {personnelGroups.special.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        leftIcon={<Icon as={Star} />}
                        colorScheme="blue"
                        size="sm"
                        onClick={loadFormationPreset}
                      >
                        Load Formation
                      </Button>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>

            <Divider />

            {/* Tools */}
            <Box>
              <Text fontWeight="medium" mb={3}>Tools</Text>
              <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                {tools.map((tool) => (
                  <Tooltip key={tool.id} label={tool.description} placement="top">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        w="full"
                        size="sm"
                        variant={selectedTool === tool.id ? "solid" : "outline"}
                        colorScheme={selectedTool === tool.id ? "blue" : "gray"}
                        leftIcon={<Icon as={tool.icon} />}
                        onClick={() => setSelectedTool(tool.id as any)}
                      >
                        {tool.name}
                      </Button>
                    </motion.div>
                  </Tooltip>
                ))}
              </Grid>
            </Box>

            <Divider />

            {/* Game Situation */}
            <Box>
              <Text fontWeight="medium" mb={3}>Game Situation</Text>
              <VStack spacing={3} align="stretch">
                <HStack>
                  <FormControl>
                    <FormLabel fontSize="sm">Down</FormLabel>
                    <Select value={down} onChange={(e) => setDown(Number(e.target.value))} size="sm">
                      <option value={1}>1st</option>
                      <option value={2}>2nd</option>
                      <option value={3}>3rd</option>
                      <option value={4}>4th</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Distance</FormLabel>
                    <NumberInput value={distance} onChange={(_, value) => setDistance(value)} size="sm">
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormLabel fontSize="sm">Field Position</FormLabel>
                  <Slider value={fieldPosition} onChange={setFieldPosition} min={0} max={100} step={5}>
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text fontSize="xs" color="gray.500">{fieldPosition} yard line</Text>
                </FormControl>
              </VStack>
            </Box>

            <Divider />

            {/* View Options */}
            <Box>
              <Text fontWeight="medium" mb={3}>View Options</Text>
              <VStack spacing={2} align="stretch">
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0" fontSize="sm">Show Grid</FormLabel>
                  <Switch isChecked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0" fontSize="sm">Yard Lines</FormLabel>
                  <Switch isChecked={showYardLines} onChange={(e) => setShowYardLines(e.target.checked)} />
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0" fontSize="sm">Hash Marks</FormLabel>
                  <Switch isChecked={showHashMarks} onChange={(e) => setShowHashMarks(e.target.checked)} />
                </FormControl>
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* Main Canvas Area */}
        <Box flex={1} position="relative" overflow="hidden">
          {/* Canvas Toolbar */}
          <Box 
            bg="white" 
            borderBottom="1px solid" 
            borderColor="var(--team-border-light)"
            p={3}
          >
            <HStack justify="space-between">
              <HStack spacing={4}>
                <Text fontWeight="medium">Field Canvas</Text>
                <Badge colorScheme="blue">{currentPlay?.formation || 'No Formation'}</Badge>
                <Badge colorScheme="green">{currentPlay?.personnel || 'No Personnel'}</Badge>
                <Badge colorScheme="purple">{currentPlay?.players.length || 0} Players</Badge>
              </HStack>

              <HStack spacing={2}>
                <IconButton
                  icon={<Icon as={Undo} />}
                  aria-label="Undo"
                  size="sm"
                  variant="ghost"
                />
                <IconButton
                  icon={<Icon as={Redo} />}
                  aria-label="Redo"
                  size="sm"
                  variant="ghost"
                />
                <IconButton
                  icon={<Icon as={ZoomOut} />}
                  aria-label="Zoom Out"
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                />
                <IconButton
                  icon={<Icon as={ZoomIn} />}
                  aria-label="Zoom In"
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                />
                <IconButton
                  icon={<Icon as={RotateCw} />}
                  aria-label="Reset View"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  onClick={() => {
                    setCurrentPlay(prev => prev ? { ...prev, routes: [] } : null);
                    toast({
                      title: 'Routes cleared!',
                      description: 'All routes have been removed from the play.',
                      status: 'info',
                      duration: 2000,
                      isClosable: true,
                    });
                  }}
                >
                  Clear Routes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="orange"
                  onClick={() => {
                    initializePlay();
                    setSelectedPlayer(null);
                    setSelectedTool('select');
                    setIsDrawingRoute(false);
                    setCurrentRoute(null);
                    setRoutePoints([]);
                    toast({
                      title: 'Play reset!',
                      description: 'All players and routes have been cleared.',
                      status: 'info',
                      duration: 2000,
                      isClosable: true,
                    });
                  }}
                >
                  Reset Play
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('Current state:', {
                      selectedTool,
                      isDrawingRoute,
                      selectedPlayer,
                      currentRoute,
                      players: currentPlay?.players.length,
                      routes: currentPlay?.routes.length
                    });
                  }}
                >
                  Debug
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                  onClick={() => {
                    console.log('Testing formation load...');
                    console.log('Current playType:', playType);
                    console.log('Current formation:', formation);
                    console.log('Available formations:', Object.keys(formationPresets[playType] || {}));
                    loadFormationPreset();
                  }}
                >
                  Test Formation
                </Button>
              </HStack>
            </HStack>
          </Box>

          {/* Football Field Canvas */}
          <Box
            ref={canvasRef}
            position="relative"
            w="full"
            h="calc(100% - 60px)"
            bg="green.600"
            overflow="hidden"
            cursor={selectedTool === 'select' ? 'default' : 'crosshair'}
            onClick={handleCanvasClick}
            onDoubleClick={(e) => {
              if (isDrawingRoute) {
                e.preventDefault();
                finishRoute();
              }
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'top left'
            }}
          >
            {/* Debug Info */}
            <Box position="absolute" top={2} left={2} bg="black" color="white" p={2} fontSize="xs" zIndex={1000}>
              Tool: {selectedTool} | Drawing: {isDrawingRoute ? 'Yes' : 'No'} | Players: {currentPlay?.players.length || 0} | Routes: {currentPlay?.routes.length || 0}
            </Box>
            
            {/* Instructions */}
            {selectedTool === 'route' && !isDrawingRoute && (
              <Box position="absolute" top={2} right={2} bg="blue.500" color="white" p={2} fontSize="xs" zIndex={1000} borderRadius="md">
                {selectedPlayer ? 
                  `Click on field to start route for Player ${selectedPlayer.number}` :
                  'Click on a player to select them for route drawing'
                }
              </Box>
            )}
            
            {isDrawingRoute && (
              <Box position="absolute" top={2} right={2} bg="green.500" color="white" p={2} fontSize="xs" zIndex={1000} borderRadius="md">
                Drawing route... Click to add points, double-click to finish
              </Box>
            )}
            {/* Field Grid */}
            {showGrid && (
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                backgroundImage="radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)"
                backgroundSize="20px 20px"
                pointerEvents="none"
              />
            )}

            {/* Football Field Overlay */}
            <Box position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
              {/* End Zones */}
              <Box position="absolute" top={0} left={0} right={0} h="10%" bg="red.500" opacity={0.3} />
              <Box position="absolute" bottom={0} left={0} right={0} h="10%" bg="red.500" opacity={0.3} />
              
              {/* Yard Lines */}
              {Array.from({ length: 9 }, (_, i) => (
                <Box
                  key={i}
                  position="absolute"
                  top="10%"
                  bottom="10%"
                  left={`${(i + 1) * 10}%`}
                  w="1px"
                  bg="white"
                  opacity={0.5}
                />
              ))}
              
              {/* Hash Marks */}
              {Array.from({ length: 9 }, (_, i) => (
                <React.Fragment key={i}>
                  <Box
                    position="absolute"
                    top="25%"
                    left={`${(i + 1) * 10}%`}
                    w="2px"
                    h="6px"
                    bg="white"
                    opacity={0.7}
                  />
                  <Box
                    position="absolute"
                    bottom="25%"
                    left={`${(i + 1) * 10}%`}
                    w="2px"
                    h="6px"
                    bg="white"
                    opacity={0.7}
                  />
                </React.Fragment>
              ))}
              
              {/* Yard Numbers */}
              {Array.from({ length: 8 }, (_, i) => (
                <React.Fragment key={i}>
                  <Text
                    position="absolute"
                    top="15%"
                    left={`${(i + 1) * 10 + 2}%`}
                    color="white"
                    fontSize="xs"
                    fontWeight="bold"
                    opacity={0.8}
                  >
                    {(i + 1) * 10}
                  </Text>
                  <Text
                    position="absolute"
                    bottom="15%"
                    left={`${(i + 1) * 10 + 2}%`}
                    color="white"
                    fontSize="xs"
                    fontWeight="bold"
                    opacity={0.8}
                  >
                    {(i + 1) * 10}
                  </Text>
                </React.Fragment>
              ))}
            </Box>

            {/* Yard Lines */}
            {showYardLines && (
              <Box position="absolute" top={0} left={0} right={0} bottom={0}>
                {Array.from({ length: 11 }, (_, i) => (
                  <Box
                    key={i}
                    position="absolute"
                    top={0}
                    bottom={0}
                    left={`${i * 10}%`}
                    w="1px"
                    bg="white"
                    opacity={0.3}
                  />
                ))}
              </Box>
            )}

            {/* Hash Marks */}
            {showHashMarks && (
              <Box position="absolute" top={0} left={0} right={0} bottom={0}>
                {Array.from({ length: 11 }, (_, i) => (
                  <React.Fragment key={i}>
                    <Box
                      position="absolute"
                      top="20%"
                      left={`${i * 10}%`}
                      w="2px"
                      h="4px"
                      bg="white"
                      opacity={0.5}
                    />
                    <Box
                      position="absolute"
                      bottom="20%"
                      left={`${i * 10}%`}
                      w="2px"
                      h="4px"
                      bg="white"
                      opacity={0.5}
                    />
                  </React.Fragment>
                ))}
              </Box>
            )}

            {/* Players */}
            {currentPlay?.players.map((player) => (
              <motion.div
                key={player.id}
                position="absolute"
                left={player.x}
                top={player.y}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  transform: `translate(-50%, -50%)`
                }}
                onMouseDown={(e) => {
                  if (selectedTool === 'select') {
                    e.stopPropagation();
                    setSelectedPlayer(player);
                    
                    // Start dragging
                    setIsDragging(true);
                    setDraggedPlayer(player);
                    console.log('Player drag started:', player); // Debug
                  }
                }}
              >
                <Box
                  w={player.size === 'small' ? '24px' : player.size === 'large' ? '32px' : '28px'}
                  h={player.size === 'small' ? '24px' : player.size === 'large' ? '32px' : '28px'}
                  borderRadius="full"
                  bg={player.color}
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  fontWeight="bold"
                  border={`2px solid ${selectedPlayer?.id === player.id ? 'yellow' : 'white'}`}
                  boxShadow={selectedPlayer?.id === player.id ? '0 0 10px rgba(255, 255, 0, 0.5)' : 'md'}
                  cursor={selectedTool === 'select' ? 'pointer' : 'default'}
                  onMouseDown={(e) => {
                    if (selectedTool === 'select') {
                      e.stopPropagation();
                      setSelectedPlayer(player);
                      
                      // Start dragging
                      setIsDragging(true);
                      setDraggedPlayer(player);
                      console.log('Player drag started:', player); // Debug
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTool === 'select') {
                      setSelectedPlayer(player);
                    } else if (selectedTool === 'route') {
                      setSelectedPlayer(player);
                      toast({
                        title: 'Player selected!',
                        description: `Player ${player.number} selected. Click on the field to start drawing their route.`,
                        status: 'info',
                        duration: 2000,
                        isClosable: true,
                      });
                    }
                  }}
                >
                  {player.number}
                </Box>
              </motion.div>
            ))}

            {/* Routes */}
            {currentPlay?.routes.map((route, index) => (
              <svg
                key={route.id}
                position="absolute"
                top={0}
                left={0}
                width="100%"
                height="100%"
                pointerEvents="none"
              >
                <path
                  d={`M ${route.points.map((p, i) => `${p.x} ${p.y}`).join(' L ')}`}
                  stroke={route.color}
                  strokeWidth={isAnimating && animationStep === index + 1 ? route.thickness + 2 : route.thickness}
                  strokeDasharray={route.style === 'dashed' ? '5,5' : route.style === 'dotted' ? '2,2' : 'none'}
                  fill="none"
                  opacity={isAnimating && animationStep < index + 1 ? 0.3 : 1}
                  filter={isAnimating && animationStep === index + 1 ? 'drop-shadow(0 0 8px currentColor)' : 'none'}
                />
                {route.arrow && route.points.length > 1 && (
                  <polygon
                    points={`${route.points[route.points.length - 1].x - 5},${route.points[route.points.length - 1].y - 5} ${route.points[route.points.length - 1].x + 5},${route.points[route.points.length - 1].y} ${route.points[route.points.length - 1].x - 5},${route.points[route.points.length - 1].y + 5}`}
                    fill={route.color}
                    opacity={isAnimating && animationStep < index + 1 ? 0.3 : 1}
                  />
                )}
              </svg>
            ))}

            {/* Current Route Being Drawn */}
            {currentRoute && (
              <svg
                position="absolute"
                top={0}
                left={0}
                width="100%"
                height="100%"
                pointerEvents="none"
              >
                <path
                  d={`M ${currentRoute.points.map((p, i) => `${p.x} ${p.y}`).join(' L ')}`}
                  stroke={currentRoute.color}
                  strokeWidth={currentRoute.thickness}
                  strokeDasharray="5,5"
                  fill="none"
                />
                {currentRoute.points.length > 1 && (
                  <polygon
                    points={`${currentRoute.points[currentRoute.points.length - 1].x - 5},${currentRoute.points[currentRoute.points.length - 1].y - 5} ${currentRoute.points[currentRoute.points.length - 1].x + 5},${currentRoute.points[currentRoute.points.length - 1].y} ${currentRoute.points[currentRoute.points.length - 1].x - 5},${currentRoute.points[currentRoute.points.length - 1].y + 5}`}
                    fill={currentRoute.color}
                  />
                )}
              </svg>
            )}
          </Box>
        </Box>

        {/* Right Sidebar - Player Properties and Route Tools */}
        <Box w="300px" bg="white" borderLeft="1px solid" borderColor="var(--team-border-light)" p={4}>
          <VStack spacing={6} align="stretch">
            {/* Selected Player Properties */}
            {selectedPlayer && (
              <Box>
                <Text fontWeight="medium" mb={3}>Player Properties</Text>
                <VStack spacing={3} align="stretch">
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
                  <FormControl>
                    <FormLabel fontSize="sm">Position</FormLabel>
                    <Select 
                      value={selectedPlayer.position}
                      onChange={(e) => {
                        const newPosition = positions[playType].find(p => p.id === e.target.value);
                        setCurrentPlay(prev => prev ? {
                          ...prev,
                          players: prev.players.map(p => 
                            p.id === selectedPlayer.id 
                              ? { ...p, position: e.target.value, color: newPosition?.color || p.color }
                              : p
                          )
                        } : null);
                      }}
                      size="sm"
                    >
                      {positions[playType].map(pos => (
                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Size</FormLabel>
                    <Select 
                      value={selectedPlayer.size}
                      onChange={(e) => {
                        setCurrentPlay(prev => prev ? {
                          ...prev,
                          players: prev.players.map(p => 
                            p.id === selectedPlayer.id 
                              ? { ...p, size: e.target.value as any }
                              : p
                          )
                        } : null);
                      }}
                      size="sm"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </Select>
                  </FormControl>
                  <Button
                    leftIcon={<Icon as={Trash2} />}
                    colorScheme="red"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPlay(prev => prev ? {
                        ...prev,
                        players: prev.players.filter(p => p.id !== selectedPlayer.id)
                      } : null);
                      setSelectedPlayer(null);
                    }}
                  >
                    Remove Player
                  </Button>
                </VStack>
              </Box>
            )}

            {!selectedPlayer && (
              <Box>
                <Text fontWeight="medium" mb={3}>Route Tools</Text>
                <VStack spacing={2} align="stretch">
                  {routeTypes.map((route) => (
                    <Tooltip key={route.id} label={`Add ${route.name} route`} placement="left">
                      <Button
                        leftIcon={<Icon as={route.icon} />}
                        variant={selectedRouteType === route.id ? "solid" : "outline"}
                        size="sm"
                        justifyContent="start"
                        color={route.color}
                        borderColor={route.color}
                        _hover={{ bg: `${route.color}10` }}
                        onClick={() => {
                          setSelectedRouteType(route.id);
                          toast({
                            title: 'Route Tool',
                            description: `${route.name} route selected. Now click on a player to add this route.`,
                            status: 'info',
                            duration: 2000,
                            isClosable: true,
                          });
                        }}
                      >
                        {route.name}
                      </Button>
                    </Tooltip>
                  ))}
                </VStack>

                <Divider my={4} />

                <Box>
                  <HStack justify="space-between" mb={3}>
                    <Text fontWeight="medium">Route Templates</Text>
                    <IconButton
                      icon={<Icon as={showRouteTemplates ? ChevronUp : ChevronDown} />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRouteTemplates(!showRouteTemplates)}
                    />
                  </HStack>
                  
                  {showRouteTemplates && (
                    <VStack spacing={2} align="stretch">
                      {Object.entries(routeTemplates).map(([name, template]) => (
                        <Tooltip key={name} label={`Load ${name} route combination`} placement="left">
                          <Button
                            leftIcon={<Icon as={Target} />}
                            variant="outline"
                            size="sm"
                            justifyContent="start"
                            onClick={() => loadRouteTemplate(name)}
                          >
                            {name.replace('-', ' ').toUpperCase()}
                          </Button>
                        </Tooltip>
                      ))}
                    </VStack>
                  )}
                </Box>
              </Box>
            )}

            <Divider />

            {/* Play Notes */}
            <Box>
              <Text fontWeight="medium" mb={3}>Play Notes</Text>
              <Textarea
                value={currentPlay?.notes || ''}
                onChange={(e) => setCurrentPlay(prev => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="Add notes about this play..."
                size="sm"
                rows={4}
              />
            </Box>

            <Divider />

            {/* Play Tags */}
            <Box>
              <Text fontWeight="medium" mb={3}>Tags</Text>
              <HStack spacing={2} flexWrap="wrap">
                {currentPlay?.tags.map((tag, index) => (
                  <Badge key={index} colorScheme="blue" variant="subtle">
                    {tag}
                    <IconButton
                      icon={<Icon as={X} />}
                      size="xs"
                      variant="ghost"
                      ml={1}
                      onClick={() => {
                        setCurrentPlay(prev => prev ? {
                          ...prev,
                          tags: prev.tags.filter((_, i) => i !== index)
                        } : null);
                      }}
                    />
                  </Badge>
                ))}
              </HStack>
              <Input
                placeholder="Add tag..."
                size="sm"
                mt={2}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    setCurrentPlay(prev => prev ? {
                      ...prev,
                      tags: [...prev.tags, e.currentTarget.value.trim()]
                    } : null);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </Box>

            <Divider />

            {/* Help Section */}
            <Box>
              <Text fontWeight="medium" mb={3}>Quick Help</Text>
              <VStack spacing={2} align="stretch" fontSize="xs" color="gray.600">
                <HStack spacing={2}>
                  <Icon as={MousePointer} size={12} />
                  <Text>Select tool: Click & drag players</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={Users} size={12} />
                  <Text>Add Player tool: Click field to add players</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={PenTool} size={12} />
                  <Text>Route tool: Select player, then draw route</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={Target} size={12} />
                  <Text>Load Formation: Auto-place players</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={Play} size={12} />
                  <Text>Animate Play: Show routes in sequence</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={Target} size={12} />
                  <Text>Route Templates: Pre-built combinations</Text>
                </HStack>
                <HStack spacing={2}>
                  <Text fontWeight="medium">Keyboard:</Text>
                  <Text>Delete: Remove selected player</Text>
                </HStack>
                <HStack spacing={2}>
                  <Text fontWeight="medium">Keyboard:</Text>
                  <Text>Escape: Deselect player/tool</Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
};

export default PlayDesigner; 