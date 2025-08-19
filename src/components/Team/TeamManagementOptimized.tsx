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
  Spinner,
  Center,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Avatar,
  AvatarBadge,
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
  List,
  ListItem,
  ListIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  InputGroup,
  InputLeftElement,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useSteps,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
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
  Stack,
  useBreakpointValue,
} from '@chakra-ui/react';
import { RESPONSIVE_GRIDS, RESPONSIVE_SPACING, RESPONSIVE_FONTS, useResponsive } from '../../utils/responsive';
import {
  Plus,
  Users,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Award,
  Activity,
  Phone,
  Mail,
  MapPin,
  Heart,
  Shield,
  Sword,
  Target,
  TrendingUp,
  Settings,
  Save,
  Cancel,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  BarChart3,
  MessageSquare,
  Bell,
  QrCode,
  FileText,
  Spreadsheet,
  Database,
  Zap,
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
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface Player {
  id: string;
  number: string;
  position: string;
  name: string;
  age: number;
  height: string;
  weight: number;
  grade: string;
  phone: string;
  email: string;
  emergencyContact: string;
  medicalNotes: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  attendance: number;
  performance: number;
  lastPractice: Date;
  notes: string;
  tags: string[];
}

interface AttendanceRecord {
  id: string;
  playerId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
}

interface TeamStats {
  totalPlayers: number;
  averageAge: number;
  averageHeight: string;
  averageWeight: number;
  attendanceRate: number;
  performanceScore: number;
  topPerformers: Player[];
  needsAttention: Player[];
}

interface WorkflowStep {
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
}

interface BulkOperation {
  type: 'import' | 'export' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

const TeamManagementOptimized: React.FC = () => {
  console.log('TeamManagementOptimized component rendering...');
  
  // State management
  const [activeTab, setActiveTab] = useState('roster');
  const [showHelp, setShowHelp] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [showDeletePlayer, setShowDeletePlayer] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterSkillLevel, setFilterSkillLevel] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalPlayers: 0,
    averageAge: 0,
    averageHeight: '0\'0"',
    averageWeight: 0,
    attendanceRate: 0,
    performanceScore: 0,
    topPerformers: [],
    needsAttention: []
  });

  // Workflow progress state
  const [workflowProgress, setWorkflowProgress] = useState([
    { title: 'Roster Setup', description: 'Import or create player roster', isCompleted: false, isRequired: true },
    { title: 'Profile Completion', description: 'Complete player profiles', isCompleted: false, isRequired: true },
    { title: 'Attendance Tracking', description: 'Set up attendance system', isCompleted: false, isRequired: true },
    { title: 'Performance Monitoring', description: 'Track player progress', isCompleted: false, isRequired: false },
    { title: 'Communication Setup', description: 'Enable team messaging', isCompleted: false, isRequired: false },
  ]);

  // Mock user profile for now - TODO: Replace with actual user profile from context/props
  const [userProfile, setUserProfile] = useState({
    teamId: 'demo-team',
    displayName: 'Coach',
    role: 'head-coach' as const,
    teamName: 'Demo Team'
  });

  // Additional missing state variables
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([]);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'dark.800');
  const borderColor = useColorModeValue('dark.200', 'dark.700');
  const cardBg = useColorModeValue('gray.50', 'dark.700');

  // Filtered and sorted players
  const sortedPlayers = players
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.number.includes(searchTerm) ||
                           player.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = !filterPosition || player.position === filterPosition;
      const matchesSkill = !filterSkillLevel || player.skillLevel === filterSkillLevel;
      
      return matchesSearch && matchesPosition && matchesSkill;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'number':
          comparison = parseInt(a.number) - parseInt(b.number);
          break;
        case 'position':
          comparison = a.position.localeCompare(b.position);
          break;
        case 'grade':
          comparison = a.grade.localeCompare(b.grade);
          break;
        case 'attendance':
          comparison = b.attendance - a.attendance;
          break;
        case 'performance':
          comparison = b.performance - a.performance;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Load team data from Firestore
  useEffect(() => {
    if (userProfile?.teamId) {
      loadTeamData();
    }
  }, [userProfile]);

  const loadTeamData = async () => {
    if (!userProfile?.teamId) return;
    
    setIsLoading(true);
    try {
      // Import Firebase services
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { firebase } = await import('../../services/firebase/config');
      
      // Fetch players from Firestore
      const playersQuery = query(
        collection(firebase.db, 'players'),
        where('teamId', '==', userProfile.teamId),
        orderBy('name', 'asc')
      );
      
      const playersSnapshot = await getDocs(playersQuery);
      const fetchedPlayers: Player[] = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Player[];
      
      setPlayers(fetchedPlayers);
      
      // Fetch attendance records
      const attendanceQuery = query(
        collection(firebase.db, 'attendance'),
        where('teamId', '==', userProfile.teamId),
        orderBy('date', 'desc')
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const fetchedAttendance: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      
      setAttendanceRecords(fetchedAttendance);
      
      // Calculate team stats
      if (fetchedPlayers.length > 0) {
        const totalPlayers = fetchedPlayers.length;
        const averageAge = Math.round(fetchedPlayers.reduce((sum, p) => sum + p.age, 0) / totalPlayers);
        const averageHeight = calculateAverageHeight(fetchedPlayers);
        const averageWeight = Math.round(fetchedPlayers.reduce((sum, p) => sum + p.weight, 0) / totalPlayers);
        
        // Calculate attendance rate from recent records
        const recentAttendance = fetchedAttendance.slice(0, 10);
        const totalExpected = recentAttendance.reduce((sum, record) => sum + totalPlayers, 0);
        const totalPresent = recentAttendance.reduce((sum, record) => {
          const playerRecord = fetchedPlayers.find(p => p.id === record.playerId);
          return sum + (record.status === 'present' ? 1 : 0);
        }, 0);
        
        const attendanceRate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
        
        // Calculate performance scores
        const performanceScore = Math.round(fetchedPlayers.reduce((sum, p) => sum + p.performance, 0) / totalPlayers);
        
        // Get top performers and players needing attention
        const topPerformers = [...fetchedPlayers]
          .sort((a, b) => b.performance - a.performance)
          .slice(0, 5);
        
        const needsAttention = fetchedPlayers.filter(p => p.attendance < 80 || p.performance < 60);
        
        setTeamStats({
          totalPlayers,
          averageAge,
          averageHeight,
          averageWeight,
          attendanceRate,
          performanceScore,
          topPerformers,
          needsAttention
        });
        
        // Update workflow progress
        updateWorkflowProgress(0, true);
        updateWorkflowProgress(1, true);
        if (attendanceRate > 0) {
          updateWorkflowProgress(2, true);
        }
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Fallback to empty state
      setPlayers([]);
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to calculate average height
  const calculateAverageHeight = (players: Player[]): string => {
    if (players.length === 0) return "0'0\"";
    
    const totalInches = players.reduce((sum, player) => {
      const heightParts = player.height.split("'");
      const feet = parseInt(heightParts[0]);
      const inches = parseInt(heightParts[1].replace('"', ''));
      return sum + (feet * 12) + inches;
    }, 0);
    
    const averageInches = Math.round(totalInches / players.length);
    const feet = Math.floor(averageInches / 12);
    const inches = averageInches % 12;
    
    return `${feet}'${inches}"`;
  };

  // CRUD Operations for Players
  const addPlayer = async (playerData: Omit<Player, 'id'>) => {
    try {
      // Import Firebase services
      const { collection, addDoc } = await import('firebase/firestore');
      const { firebase } = await import('../../services/firebase/config');
      
      // Add teamId to player data
      const playerWithTeam = {
        ...playerData,
        teamId: userProfile.teamId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(firebase.db, 'players'), playerWithTeam);
      
      // Add to local state
      const newPlayer: Player = {
        ...playerData,
        id: docRef.id
      };
      
      setPlayers(prev => [...prev, newPlayer]);
      
      // Update team stats
      const newTotalPlayers = players.length + 1;
      setTeamStats(prev => ({
        ...prev,
        totalPlayers: newTotalPlayers
      }));
      
      // Update workflow progress
      updateWorkflowProgress(0, true);
      
      toast({
        title: 'Player Added!',
        description: `${playerData.name} has been added to your team.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reload team data to get updated stats
      await loadTeamData();
      
    } catch (error) {
      console.error('Error adding player:', error);
      toast({
        title: 'Error',
        description: 'Failed to add player. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const updatePlayer = async (playerId: string, updates: Partial<Player>) => {
    try {
      // Import Firebase services
      const { doc, updateDoc } = await import('firebase/firestore');
      const { firebase } = await import('../../services/firebase/config');
      
      // Update in Firestore
      await updateDoc(doc(firebase.db, 'players', playerId), {
        ...updates,
        updatedAt: new Date()
      });
      
      // Update local state
      setPlayers(prev => 
        prev.map(player => 
          player.id === playerId 
            ? { ...player, ...updates, updatedAt: new Date() }
            : player
        )
      );
      
      // Update selected player if it's the one being edited
      if (selectedPlayer?.id === playerId) {
        setSelectedPlayer(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
      }
      
      toast({
        title: 'Player Updated!',
        description: 'Player information has been updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reload team data to get updated stats
      await loadTeamData();
      
    } catch (error) {
      console.error('Error updating player:', error);
      toast({
        title: 'Error',
        description: 'Failed to update player. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const deletePlayer = async (playerId: string) => {
    try {
      // Import Firebase services
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { firebase } = await import('../../services/firebase/config');
      
      // Delete from Firestore
      await deleteDoc(doc(firebase.db, 'players', playerId));
      
      // Remove from local state
      setPlayers(prev => prev.filter(player => player.id !== playerId));
      
      // Clear selected player if it's the one being deleted
      if (selectedPlayer?.id === playerId) {
        setSelectedPlayer(null);
      }
      
      // Update team stats
      const newTotalPlayers = players.length - 1;
      setTeamStats(prev => ({
        ...prev,
        totalPlayers: newTotalPlayers
      }));
      
      toast({
        title: 'Player Deleted!',
        description: 'Player has been removed from your team.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reload team data to get updated stats
      await loadTeamData();
      
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete player. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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

  // Quick start templates
  const quickStartTemplates = [
    {
      name: 'Varsity Team',
      description: 'Complete roster for varsity team',
      playerCount: 25,
      positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P'],
      grades: ['11th', '12th']
    },
    {
      name: 'JV Team',
      description: 'Junior varsity roster setup',
      playerCount: 20,
      positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'],
      grades: ['9th', '10th']
    },
    {
      name: 'Freshman Team',
      description: 'Freshman team roster',
      playerCount: 18,
      positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'],
      grades: ['9th']
    },
    {
      name: 'Youth League',
      description: 'Youth football team',
      playerCount: 15,
      positions: ['QB', 'RB', 'WR', 'OL', 'DL', 'LB'],
      grades: ['6th', '7th', '8th']
    }
  ];

  // Apply template
  const applyTemplate = (template: any) => {
    // Create sample players based on template
    const newPlayers: Player[] = [];
    const positions = template.positions;
    
    for (let i = 0; i < template.playerCount; i++) {
      const position = positions[i % positions.length];
      const grade = template.grades[i % template.grades.length];
      
      newPlayers.push({
        id: `temp-${i}`,
        number: (i + 1).toString().padStart(2, '0'),
        position,
        name: `Player ${i + 1}`,
        age: 14 + (i % 4),
        height: "5'8\"",
        weight: 150 + (i % 30),
        grade,
        phone: '(555) 000-0000',
        email: `player${i + 1}@email.com`,
        emergencyContact: 'Parent (555) 000-0000',
        medicalNotes: 'No known issues',
        skillLevel: 'beginner',
        attendance: 100,
        performance: 75,
        lastPractice: new Date(),
        notes: 'Template player - update with real information',
        tags: ['template', 'needs-update']
      });
    }
    
    setPlayers(newPlayers);
    updateWorkflowProgress(0, true);
    
    toast({
      title: 'Template Applied!',
      description: `${template.playerCount} players created. Update with real information.`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  // Bulk import
  const handleBulkImport = (file: File) => {
    const operation: BulkOperation = {
      type: 'import',
      status: 'processing',
      progress: 0,
      message: 'Processing import...'
    };
    
    setBulkOperations(prev => [...prev, operation]);
    
    // Simulate import process
    const interval = setInterval(() => {
      setBulkOperations(prev => 
        prev.map(op => 
          op.type === 'import' 
            ? { ...op, progress: op.progress + 20, message: `Importing... ${op.progress + 20}%` }
            : op
        )
      );
      
      if (operation.progress >= 100) {
        clearInterval(interval);
        setBulkOperations(prev => 
          prev.map(op => 
            op.type === 'import' 
              ? { ...op, status: 'completed', message: 'Import completed successfully' }
              : op
          )
        );
      }
    }, 500);
  };

  // Bulk export
  const handleBulkExport = (format: 'pdf' | 'csv' | 'excel') => {
    const operation: BulkOperation = {
      type: 'export',
      status: 'processing',
      progress: 0,
      message: `Exporting to ${format.toUpperCase()}...`
    };
    
    setBulkOperations(prev => [...prev, operation]);
    
    // Simulate export process
    const interval = setInterval(() => {
      setBulkOperations(prev => 
        prev.map(op => 
          op.type === 'export' 
            ? { ...op, progress: op.progress + 25, message: `Exporting... ${op.progress + 25}%` }
            : op
        )
      );
      
      if (operation.progress >= 100) {
        clearInterval(interval);
        setBulkOperations(prev => 
          prev.map(op => 
            op.type === 'export' 
              ? { ...op, status: 'completed', message: `Export to ${format.toUpperCase()} completed` }
              : op
          )
        );
        
        // Trigger download
        const dataStr = JSON.stringify(players, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `team-roster.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 300);
  };

  // Advanced search and filtering
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.number.includes(searchTerm);
    
    const matchesPosition = !filterPosition || player.position === filterPosition;
    const matchesGrade = !filterGrade || player.grade === filterGrade;
    const matchesSkill = !filterSkillLevel || player.skillLevel === filterSkillLevel;
    
    return matchesSearch && matchesPosition && matchesGrade && matchesSkill;
  });

  // sortedPlayers and teamStats already defined above

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {/* Header with Progress */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" color="gray.800" mb={2}>
              Team Management
            </Heading>
            <Text color="gray.600">
              Manage your roster, track performance, and communicate with your team
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
                  <ListIcon as={CheckCircle2} color="green.500" />
                  Use templates to quickly set up your roster
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle2} color="green.500" />
                  Bulk import CSV files for large rosters
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle2} color="green.500" />
                  Advanced search helps find players quickly
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircle2} color="green.500" />
                  Track attendance and performance for insights
                </ListItem>
              </List>
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <Tabs variant="enclosed" colorScheme="blue" index={activeTab === 'roster' ? 0 : activeTab === 'attendance' ? 1 : 2} onChange={(index) => setActiveTab(index === 0 ? 'roster' : index === 1 ? 'attendance' : 'performance')}>
        <TabList>
          <Tab>
            <Icon as={Users} mr={2} />
            Roster
          </Tab>
          <Tab>
            <Icon as={Calendar} mr={2} />
            Attendance
          </Tab>
          <Tab>
            <Icon as={BarChart3} mr={2} />
            Performance
          </Tab>
        </TabList>

        <TabPanels>
          {/* Roster Tab */}
          <TabPanel>
            <Grid 
        templateColumns={RESPONSIVE_GRIDS.sidebar} 
        gap={useBreakpointValue(RESPONSIVE_SPACING.xl)}
      >
                              {/* Main Roster Area */}
                <VStack spacing={useBreakpointValue(RESPONSIVE_SPACING.lg)} align="stretch">
                {/* Quick Start Templates */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Zap} mr={2} color="blue.500" />
                      Quick Start Templates
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Get started quickly with pre-configured team setups
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
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
                          <CardBody p={4}>
                            <Text fontWeight="semibold" color="gray.800" mb={2}>
                              {template.name}
                            </Text>
                            <Text fontSize="sm" color="gray.600" mb={3}>
                              {template.description}
                            </Text>
                            <HStack spacing={2} mb={3}>
                              <Badge colorScheme="blue" size="sm">
                                {template.playerCount} players
                              </Badge>
                              <Badge colorScheme="green" size="sm">
                                {template.grades.join(', ')}
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

                {/* Bulk Operations */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Database} mr={2} color="blue.500" />
                      Bulk Operations
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Import, export, and manage multiple players at once
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <HStack spacing={4} mb={4}>
                      <Button
                        leftIcon={<Icon as={Upload} />}
                        colorScheme="blue"
                        onClick={() => setShowBulkImport(true)}
                        size="lg"
                        borderRadius="xl"
                      >
                        Import Roster
                      </Button>
                      
                      <Button
                        leftIcon={<Icon as={Download} />}
                        variant="outline"
                        onClick={() => handleBulkExport('csv')}
                        size="lg"
                        borderRadius="xl"
                      >
                        Export CSV
                      </Button>
                      
                      <Button
                        leftIcon={<Icon as={FileText} />}
                        variant="outline"
                        onClick={() => handleBulkExport('json')}
                        size="lg"
                        borderRadius="xl"
                      >
                        Export JSON
                      </Button>
                    </HStack>
                    
                    {/* Bulk Operation Progress */}
                    {bulkOperations.length > 0 && (
                      <VStack spacing={3} align="stretch">
                        {bulkOperations.map((operation, index) => (
                          <Box key={index} p={3} bg={cardBg} borderRadius="lg">
                            <HStack justify="space-between" mb={2}>
                              <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                {operation.type === 'import' ? 'Importing...' : 'Exporting...'}
                              </Text>
                              <Badge 
                                colorScheme={operation.status === 'completed' ? 'green' : operation.status === 'error' ? 'red' : 'blue'}
                                size="sm"
                              >
                                {operation.status}
                              </Badge>
                            </HStack>
                            <Progress value={operation.progress} colorScheme="blue" borderRadius="full" mb={2} />
                            <Text fontSize="xs" color="gray.600">
                              {operation.message}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    )}
                  </CardBody>
                </Card>

                {/* Advanced Search & Filtering */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Search} mr={2} color="blue.500" />
                      Search & Filter
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <Grid templateColumns={{ base: '1fr', md: '2fr 1fr 1fr 1fr' }} gap={4} mb={4}>
                      <InputGroup>
                        <InputLeftElement>
                          <Icon as={Search} color="gray.400" />
                        </InputLeftElement>
                        <Input
                          placeholder="Search players by name, position, or number..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          size="lg"
                          borderRadius="xl"
                        />
                      </InputGroup>
                      
                      <Select
                        placeholder="Position"
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value)}
                        size="lg"
                        borderRadius="xl"
                      >
                        <option value="QB">QB</option>
                        <option value="RB">RB</option>
                        <option value="WR">WR</option>
                        <option value="TE">TE</option>
                        <option value="OL">OL</option>
                        <option value="DL">DL</option>
                        <option value="LB">LB</option>
                        <option value="DB">DB</option>
                        <option value="K">K</option>
                        <option value="P">P</option>
                      </Select>
                      
                      <Select
                        placeholder="Grade"
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        size="lg"
                        borderRadius="xl"
                      >
                        <option value="9th">9th</option>
                        <option value="10th">10th</option>
                        <option value="11th">11th</option>
                        <option value="12th">12th</option>
                      </Select>
                      
                      <Select
                        placeholder="Skill Level"
                        value={filterSkillLevel}
                        onChange={(e) => setFilterSkillLevel(e.target.value)}
                        size="lg"
                        borderRadius="xl"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </Select>
                    </Grid>
                    
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">
                        {filteredPlayers.length} of {players.length} players
                      </Text>
                      
                      <HStack spacing={2}>
                        <Text fontSize="sm" color="gray.600">Sort by:</Text>
                        <Select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          size="sm"
                          borderRadius="lg"
                          w="120px"
                        >
                          <option value="name">Name</option>
                          <option value="position">Position</option>
                          <option value="number">Number</option>
                          <option value="attendance">Attendance</option>
                          <option value="performance">Performance</option>
                        </Select>
                        
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={sortOrder === 'asc' ? SortAsc : SortDesc} />}
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          aria-label="Toggle sort order"
                        />
                      </HStack>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Players Table */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Flex justify="space-between" align="center">
                      <Heading size="md" color="gray.800">
                        <Icon as={Users} mr={2} color="blue.500" />
                        Player Roster ({sortedPlayers.length})
                      </Heading>
                      <Button
                        leftIcon={<Icon as={Plus} />}
                        colorScheme="blue"
                        size="sm"
                        borderRadius="xl"
                      >
                        Add Player
                      </Button>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <TableContainer>
                      <Table variant="simple" size={{ base: 'sm', md: 'sm' }}>
                        <Thead>
                          <Tr>
                            <Th fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)}>Player</Th>
                            <Th fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)} display={{ base: 'none', md: 'table-cell' }}>Position</Th>
                            <Th fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)} display={{ base: 'none', lg: 'table-cell' }}>Grade</Th>
                            <Th fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)} display={{ base: 'none', lg: 'table-cell' }}>Attendance</Th>
                            <Th fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)} display={{ base: 'none', xl: 'table-cell' }}>Performance</Th>
                            <Th fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)}>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {isLoading ? (
                            <Tr>
                              <Td colSpan={6}>
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
                                    <Icon as={Clock} boxSize={6} color="primary.600" />
                                  </Box>
                                  <Text fontSize="md" color="gray.600" fontWeight="500">
                                    Loading players...
                                  </Text>
                                </VStack>
                              </Td>
                            </Tr>
                          ) : sortedPlayers.length === 0 ? (
                            <Tr>
                              <Td colSpan={6}>
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
                                    <Icon as={Users} boxSize={6} color="gray.500" />
                                  </Box>
                                  <VStack spacing={2} align="center">
                                    <Text fontSize="md" color="gray.600" fontWeight="500">
                                      No players found
                                    </Text>
                                    <Text fontSize="sm" color="gray.500" textAlign="center">
                                      Start building your team by adding your first player
                                    </Text>
                                  </VStack>
                                  <Button
                                    variant="brand-primary"
                                    leftIcon={<Icon as={Plus} />}
                                    onClick={() => setShowAddPlayer(true)}
                                  >
                                    Add First Player
                                  </Button>
                                </VStack>
                              </Td>
                            </Tr>
                          ) : (
                            sortedPlayers.map((player) => (
                              <Tr key={player.id} _hover={{ bg: cardBg }}>
                              <Td>
                                <HStack spacing={3}>
                                  <Avatar size="sm" name={player.name} bg="blue.500" />
                                  <Box>
                                    <Text fontWeight="semibold" color="gray.800">
                                      {player.name}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      #{player.number}
                                    </Text>
                                  </Box>
                                </HStack>
                              </Td>
                              <Td display={{ base: 'none', md: 'table-cell' }}>
                                <Badge colorScheme="blue" variant="subtle">
                                  {player.position}
                                </Badge>
                              </Td>
                              <Td display={{ base: 'none', lg: 'table-cell' }}>{player.grade}</Td>
                              <Td display={{ base: 'none', lg: 'table-cell' }}>
                                <HStack spacing={2}>
                                  <Progress 
                                    value={player.attendance} 
                                    size={{ base: 'xs', md: 'sm' }} 
                                    colorScheme="green" 
                                    w={{ base: '40px', md: '60px' }} 
                                  />
                                  <Text fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)}>{player.attendance}%</Text>
                                </HStack>
                              </Td>
                              <Td display={{ base: 'none', xl: 'table-cell' }}>
                                <HStack spacing={2}>
                                  <Progress 
                                    value={player.performance} 
                                    size={{ base: 'xs', md: 'sm' }} 
                                    colorScheme="blue" 
                                    w={{ base: '40px', md: '60px' }} 
                                  />
                                  <Text fontSize={useBreakpointValue(RESPONSIVE_FONTS.sm)}>{player.performance}%</Text>
                                </HStack>
                              </Td>
                              <Td>
                                <Stack 
                                  direction={{ base: 'column', sm: 'row' }}
                                  spacing={1}
                                  justify={{ base: 'center', sm: 'start' }}
                                >
                                  <IconButton
                                    size={{ base: 'xs', md: 'sm' }}
                                    variant="ghost"
                                    icon={<Icon as={Eye} />}
                                    aria-label="View player"
                                    onClick={() => setSelectedPlayer(player)}
                                  />
                                  <IconButton
                                    size={{ base: 'xs', md: 'sm' }}
                                    variant="ghost"
                                    icon={<Icon as={Edit} />}
                                    aria-label="Edit player"
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      setIsEditing(true);
                                      setShowEditPlayer(true);
                                    }}
                                  />
                                  <IconButton
                                    size={{ base: 'xs', md: 'sm' }}
                                    variant="ghost"
                                    colorScheme="red"
                                    icon={<Icon as={Trash2} />}
                                    aria-label="Delete player"
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      setShowDeletePlayer(true);
                                    }}
                                  />
                                </Stack>
                              </Td>
                            </Tr>
                            ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>
              </VStack>

              {/* Sidebar - Team Stats & Quick Actions */}
              <VStack spacing={useBreakpointValue(RESPONSIVE_SPACING.lg)} align="stretch">
                {/* Team Statistics */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" position="sticky" top={6}>
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={BarChart3} mr={2} color="blue.500" />
                      Team Statistics
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={2} spacing={4}>
                        <Stat>
                          <StatLabel color="gray.600">Total Players</StatLabel>
                          <StatNumber color="blue.600">{teamStats.totalPlayers}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel color="gray.600">Avg Age</StatLabel>
                          <StatNumber color="blue.600">{teamStats.averageAge.toFixed(1)}</StatNumber>
                        </Stat>
                      </SimpleGrid>
                      
                      <SimpleGrid columns={2} spacing={4}>
                        <Stat>
                          <StatLabel color="gray.600">Attendance Rate</StatLabel>
                          <StatNumber color="green.600">{teamStats.attendanceRate.toFixed(1)}%</StatNumber>
                          <StatHelpText>
                            <Icon as={ArrowUp} color="green.500" boxSize={4} />
                            +2.5%
                          </StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel color="gray.600">Performance</StatLabel>
                          <StatNumber color="purple.600">{teamStats.performanceScore.toFixed(1)}%</StatNumber>
                          <StatHelpText>
                            <Icon as={ArrowUp} color="green.500" boxSize={4} />
                            +1.8%
                          </StatHelpText>
                        </Stat>
                      </SimpleGrid>
                      
                      <Divider />
                      
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                          Top Performers
                        </Text>
                        <VStack spacing={2} align="stretch">
                          {teamStats.topPerformers.map((player) => (
                            <HStack key={player.id} p={2} bg={cardBg} borderRadius="lg">
                              <Avatar size="xs" name={player.name} />
                              <Text fontSize="sm" fontWeight="medium">
                                {player.name}
                              </Text>
                              <Spacer />
                              <Badge colorScheme="green" size="sm">
                                {player.performance}%
                              </Badge>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                      
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                          Needs Attention
                        </Text>
                        <VStack spacing={2} align="stretch">
                          {teamStats.needsAttention.map((player) => (
                            <HStack key={player.id} p={2} bg="red.50" borderRadius="lg">
                              <Avatar size="xs" name={player.name} />
                              <Text fontSize="sm" fontWeight="medium">
                                {player.name}
                              </Text>
                              <Spacer />
                              <Badge colorScheme="red" size="sm">
                                {player.attendance < 80 ? 'Low Attendance' : 'Low Performance'}
                              </Badge>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Quick Actions */}
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Zap} mr={2} color="blue.500" />
                      Quick Actions
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <Button
                        leftIcon={<Icon as={QrCode} />}
                        variant="outline"
                        onClick={() => setShowCommunication(true)}
                        size="lg"
                        borderRadius="xl"
                      >
                        Attendance Check-in
                      </Button>
                      
                      <Button
                        leftIcon={<Icon as={MessageSquare} />}
                        variant="outline"
                        onClick={() => setShowCommunication(true)}
                        size="lg"
                        borderRadius="xl"
                      >
                        Team Message
                      </Button>
                      
                      <Button
                        leftIcon={<Icon as={BarChart3} />}
                        variant="outline"
                        onClick={() => setShowPerformance(true)}
                        size="lg"
                        borderRadius="xl"
                      >
                        Performance Report
                      </Button>
                      
                      <Button
                        leftIcon={<Icon as={Download} />}
                        variant="outline"
                        onClick={() => handleBulkExport('pdf')}
                        size="lg"
                        borderRadius="xl"
                      >
                        Export Report
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

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
                          📊 Regular performance tracking improves player development
                        </Text>
                      </Box>
                      <Box p={3} bg={cardBg} borderRadius="lg">
                        <Text fontSize="sm" color="gray.700" fontWeight="medium">
                          📱 Use mobile check-in for faster attendance tracking
                        </Text>
                      </Box>
                      <Box p={3} bg={cardBg} borderRadius="lg">
                        <Text fontSize="sm" color="gray.700" fontWeight="medium">
                          🎯 Focus on players who need attention to improve team performance
                        </Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </Grid>
          </TabPanel>

          {/* Attendance Tab */}
          <TabPanel>
            <Box textAlign="center" py={12}>
              <Icon as={Calendar} boxSize={16} color="gray.400" mb={4} />
              <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                Attendance Tracking
              </Text>
              <Text color="gray.500">
                Track player attendance and manage practice schedules. Coming soon with QR code check-in and automated tracking.
              </Text>
            </Box>
          </TabPanel>

          {/* Performance Tab */}
          <TabPanel>
            <Box textAlign="center" py={12}>
              <Icon as={BarChart3} boxSize={16} color="gray.400" mb={4} />
              <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                Performance Analytics
              </Text>
              <Text color="gray.500">
                Monitor player progress and team performance with detailed analytics and insights. Coming soon with charts and trend analysis.
              </Text>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Add Player Modal */}
      <Modal isOpen={showAddPlayer} onClose={() => setShowAddPlayer(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Player</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <AddPlayerForm 
              onSubmit={addPlayer}
              onCancel={() => setShowAddPlayer(false)}
              teamId={userProfile.teamId}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Player Modal */}
      <Modal isOpen={showEditPlayer} onClose={() => setShowEditPlayer(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Player</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedPlayer && (
              <EditPlayerForm 
                player={selectedPlayer}
                onSubmit={updatePlayer}
                onCancel={() => setShowEditPlayer(false)}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Player Confirmation */}
      <Modal isOpen={showDeletePlayer} onClose={() => setShowDeletePlayer(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Player</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete {selectedPlayer?.name}? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setShowDeletePlayer(false)}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={() => {
              if (selectedPlayer) {
                deletePlayer(selectedPlayer.id);
                setShowDeletePlayer(false);
              }
            }}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// Add Player Form Component
const AddPlayerForm: React.FC<{
  onSubmit: (player: Omit<Player, 'id'>) => Promise<void>;
  onCancel: () => void;
  teamId: string;
}> = ({ onSubmit, onCancel, teamId }) => {
  const [formData, setFormData] = useState({
    number: '',
    position: '',
    name: '',
    age: 14,
    height: "5'8\"",
    weight: 150,
    grade: '',
    phone: '',
    email: '',
    emergencyContact: '',
    medicalNotes: '',
    skillLevel: 'beginner' as const,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      attendance: 100,
      performance: 75,
      lastPractice: new Date(),
      tags: []
    });
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing={4}>
        <SimpleGrid columns={2} spacing={4} w="full">
          <FormControl isRequired>
            <FormLabel>Jersey Number</FormLabel>
            <Input 
              value={formData.number} 
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              placeholder="12"
            />
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Position</FormLabel>
            <Select 
              value={formData.position} 
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
            >
              <option value="">Select Position</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="OL">OL</option>
              <option value="DL">DL</option>
              <option value="LB">LB</option>
              <option value="DB">DB</option>
              <option value="K">K</option>
              <option value="P">P</option>
            </Select>
          </FormControl>
        </SimpleGrid>

        <FormControl isRequired>
          <FormLabel>Full Name</FormLabel>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="John Doe"
          />
        </FormControl>

        <SimpleGrid columns={3} spacing={4} w="full">
          <FormControl isRequired>
            <FormLabel>Age</FormLabel>
            <NumberInput 
              value={formData.age} 
              onChange={(_, value) => setFormData(prev => ({ ...prev, age: value }))}
              min={8}
              max={18}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Height</FormLabel>
            <Input 
              value={formData.height} 
              onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
              placeholder="5'8&quot;"
            />
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Weight (lbs)</FormLabel>
            <NumberInput 
              value={formData.weight} 
              onChange={(_, value) => setFormData(prev => ({ ...prev, weight: value }))}
              min={50}
              max={300}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
        </SimpleGrid>

        <FormControl isRequired>
          <FormLabel>Grade</FormLabel>
          <Select 
            value={formData.grade} 
            onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
          >
            <option value="">Select Grade</option>
            <option value="6th">6th Grade</option>
            <option value="7th">7th Grade</option>
            <option value="8th">8th Grade</option>
            <option value="9th">9th Grade (Freshman)</option>
            <option value="10th">10th Grade (Sophomore)</option>
            <option value="11th">11th Grade (Junior)</option>
            <option value="12th">12th Grade (Senior)</option>
          </Select>
        </FormControl>

        <SimpleGrid columns={2} spacing={4} w="full">
          <FormControl>
            <FormLabel>Phone</FormLabel>
            <Input 
              value={formData.phone} 
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input 
              value={formData.email} 
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="player@email.com"
              type="email"
            />
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel>Emergency Contact</FormLabel>
          <Input 
            value={formData.emergencyContact} 
            onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
            placeholder="Parent Name (555) 123-4567"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Medical Notes</FormLabel>
          <Textarea 
            value={formData.medicalNotes} 
            onChange={(e) => setFormData(prev => ({ ...prev, medicalNotes: e.target.value }))}
            placeholder="Any medical conditions, allergies, or special needs..."
            rows={3}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Skill Level</FormLabel>
          <Select 
            value={formData.skillLevel} 
            onChange={(e) => setFormData(prev => ({ ...prev, skillLevel: e.target.value as any }))}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Notes</FormLabel>
          <Textarea 
            value={formData.notes} 
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes about the player..."
            rows={2}
          />
        </FormControl>

        <HStack spacing={4} w="full" justify="flex-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" colorScheme="blue">
            Add Player
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};

// Edit Player Form Component
const EditPlayerForm: React.FC<{
  player: Player;
  onSubmit: (id: string, updates: Partial<Player>) => Promise<void>;
  onCancel: () => void;
}> = ({ player, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    number: player.number,
    position: player.position,
    name: player.name,
    age: player.age,
    height: player.height,
    weight: player.weight,
    grade: player.grade,
    phone: player.phone,
    email: player.email,
    emergencyContact: player.emergencyContact,
    medicalNotes: player.medicalNotes,
    skillLevel: player.skillLevel,
    notes: player.notes
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(player.id, formData);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing={4}>
        <SimpleGrid columns={2} spacing={4} w="full">
          <FormControl isRequired>
            <FormLabel>Jersey Number</FormLabel>
            <Input 
              value={formData.number} 
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
            />
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Position</FormLabel>
            <Select 
              value={formData.position} 
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
            >
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="OL">OL</option>
              <option value="DL">DL</option>
              <option value="LB">LB</option>
              <option value="DB">DB</option>
              <option value="K">K</option>
              <option value="P">P</option>
            </Select>
          </FormControl>
        </SimpleGrid>

        <FormControl isRequired>
          <FormLabel>Full Name</FormLabel>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </FormControl>

        <SimpleGrid columns={3} spacing={4} w="full">
          <FormControl isRequired>
            <FormLabel>Age</FormLabel>
            <NumberInput 
              value={formData.age} 
              onChange={(_, value) => setFormData(prev => ({ ...prev, age: value }))}
              min={8}
              max={18}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Height</FormLabel>
            <Input 
              value={formData.height} 
              onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
            />
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Weight (lbs)</FormLabel>
            <NumberInput 
              value={formData.weight} 
              onChange={(_, value) => setFormData(prev => ({ ...prev, weight: value }))}
              min={50}
              max={300}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
        </SimpleGrid>

        <FormControl isRequired>
          <FormLabel>Grade</FormLabel>
          <Select 
            value={formData.grade} 
            onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
          >
            <option value="6th">6th Grade</option>
            <option value="7th">7th Grade</option>
            <option value="8th">8th Grade</option>
            <option value="9th">9th Grade (Freshman)</option>
            <option value="10th">10th Grade (Sophomore)</option>
            <option value="11th">11th Grade (Junior)</option>
            <option value="12th">12th Grade (Senior)</option>
          </Select>
        </FormControl>

        <SimpleGrid columns={2} spacing={4} w="full">
          <FormControl>
            <FormLabel>Phone</FormLabel>
            <Input 
              value={formData.phone} 
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input 
              value={formData.email} 
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              type="email"
            />
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel>Emergency Contact</FormLabel>
          <Input 
            value={formData.emergencyContact} 
            onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Medical Notes</FormLabel>
          <Textarea 
            value={formData.medicalNotes} 
            onChange={(e) => setFormData(prev => ({ ...prev, medicalNotes: e.target.value }))}
            rows={3}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Skill Level</FormLabel>
          <Select 
            value={formData.skillLevel} 
            onChange={(e) => setFormData(prev => ({ ...prev, skillLevel: e.target.value as any }))}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Notes</FormLabel>
          <Textarea 
            value={formData.notes} 
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </FormControl>

        <HStack spacing={4} w="full" justify="flex-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" colorScheme="blue">
            Update Player
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};

export default TeamManagementOptimized;

