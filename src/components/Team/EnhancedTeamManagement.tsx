// @ts-nocheck
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tag,
  TagLabel,
  TagCloseButton,
  Stack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
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
  RefreshCw,
  User,
  UserCheck,
  UserX,
  Crown,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Image,
  Video,
  BookOpen,
  Trophy,
  Medal,
  Flag,
  Home,
  School,
  GraduationCap,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  MapPin as MapPinIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  User as UserIcon,
  Users as UsersIcon,
  UserCheck as UserCheckIcon,
  UserX as UserXIcon,
  Crown as CrownIcon,
  Zap as ZapIcon,
  BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  BookOpen as BookOpenIcon,
  Trophy as TrophyIcon,
  Medal as MedalIcon,
  Flag as FlagIcon,
  Home as HomeIcon,
  School as SchoolIcon,
  GraduationCap as GraduationCapIcon,
} from 'lucide-react';

// Types
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: string;
  age: number;
  grade: string;
  height: string;
  weight: number;
  phone: string;
  email: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo: {
    allergies: string[];
    medications: string[];
    conditions: string[];
  };
  stats: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    tackles: number;
    interceptions: number;
    rating: number;
  };
  attendance: {
    practices: number;
    games: number;
    total: number;
  };
  status: 'active' | 'injured' | 'suspended' | 'inactive';
  joinDate: Date;
  lastModified: Date;
  notes: string;
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  sport: string;
  season: string;
  ageGroup: string;
  level: string;
  coach: string;
  assistantCoaches: string[];
  players: Player[];
  stats: {
    totalPlayers: number;
    activePlayers: number;
    averageAge: number;
    averageRating: number;
    totalGames: number;
    wins: number;
    losses: number;
    ties: number;
  };
  schedule: {
    practices: Array<{
      id: string;
      date: Date;
      time: string;
      location: string;
      type: string;
    }>;
    games: Array<{
      id: string;
      date: Date;
      time: string;
      opponent: string;
      location: string;
      result?: string;
    }>;
  };
  createdAt: Date;
  lastModified: Date;
}

const EnhancedTeamManagement: React.FC = () => {
  // State
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Form state
  const [playerForm, setPlayerForm] = useState<Partial<Player>>({
    firstName: '',
    lastName: '',
    jerseyNumber: 0,
    position: '',
    age: 0,
    grade: '',
    height: '',
    weight: 0,
    phone: '',
    email: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
    medicalInfo: {
      allergies: [],
      medications: [],
      conditions: [],
    },
    stats: {
      gamesPlayed: 0,
      goals: 0,
      assists: 0,
      tackles: 0,
      interceptions: 0,
      rating: 0,
    },
    attendance: {
      practices: 0,
      games: 0,
      total: 0,
    },
    status: 'active',
    notes: '',
  });

  // Refs
  const toast = useToast();

  // Color values
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Load team data on mount
  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockTeam: Team = {
        id: 'team-1',
        name: 'Wildcats',
        sport: 'football',
        season: '2024-2025',
        ageGroup: 'high-school',
        level: 'varsity',
        coach: 'John Smith',
        assistantCoaches: ['Jane Doe', 'Mike Johnson'],
        players: [],
        stats: {
          totalPlayers: 0,
          activePlayers: 0,
          averageAge: 0,
          averageRating: 0,
          totalGames: 0,
          wins: 0,
          losses: 0,
          ties: 0,
        },
        schedule: {
          practices: [],
          games: [],
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      };

      const mockPlayers: Player[] = [
        {
          id: 'player-1',
          firstName: 'John',
          lastName: 'Doe',
          jerseyNumber: 12,
          position: 'QB',
          age: 17,
          grade: '12th',
          height: '6\'2"',
          weight: 185,
          phone: '(555) 123-4567',
          email: 'john.doe@email.com',
          emergencyContact: {
            name: 'Jane Doe',
            phone: '(555) 987-6543',
            relationship: 'Mother',
          },
          medicalInfo: {
            allergies: ['Peanuts'],
            medications: ['Inhaler'],
            conditions: ['Asthma'],
          },
          stats: {
            gamesPlayed: 8,
            goals: 0,
            assists: 0,
            tackles: 0,
            interceptions: 0,
            rating: 4.5,
          },
          attendance: {
            practices: 15,
            games: 8,
            total: 23,
          },
          status: 'active',
          joinDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          notes: 'Team captain, excellent leadership skills',
        },
        {
          id: 'player-2',
          firstName: 'Mike',
          lastName: 'Johnson',
          jerseyNumber: 23,
          position: 'RB',
          age: 16,
          grade: '11th',
          height: '5\'10"',
          weight: 195,
          phone: '(555) 234-5678',
          email: 'mike.johnson@email.com',
          emergencyContact: {
            name: 'Sarah Johnson',
            phone: '(555) 876-5432',
            relationship: 'Mother',
          },
          medicalInfo: {
            allergies: [],
            medications: [],
            conditions: [],
          },
          stats: {
            gamesPlayed: 8,
            goals: 12,
            assists: 0,
            tackles: 0,
            interceptions: 0,
            rating: 4.2,
          },
          attendance: {
            practices: 14,
            games: 8,
            total: 22,
          },
          status: 'active',
          joinDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          notes: 'Fast runner, good ball handling',
        },
        {
          id: 'player-3',
          firstName: 'David',
          lastName: 'Wilson',
          jerseyNumber: 45,
          position: 'LB',
          age: 17,
          grade: '12th',
          height: '6\'0"',
          weight: 210,
          phone: '(555) 345-6789',
          email: 'david.wilson@email.com',
          emergencyContact: {
            name: 'Robert Wilson',
            phone: '(555) 765-4321',
            relationship: 'Father',
          },
          medicalInfo: {
            allergies: [],
            medications: [],
            conditions: [],
          },
          stats: {
            gamesPlayed: 8,
            goals: 0,
            assists: 0,
            tackles: 45,
            interceptions: 3,
            rating: 4.8,
          },
          attendance: {
            practices: 16,
            games: 8,
            total: 24,
          },
          status: 'active',
          joinDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          notes: 'Defensive leader, excellent tackling',
        },
      ];

      setCurrentTeam(mockTeam);
      setPlayers(mockPlayers);
    } catch (error) {
      setError('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlayer = async () => {
    if (!playerForm.firstName || !playerForm.lastName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSaving(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPlayer: Player = {
        id: selectedPlayer?.id || `player-${Date.now()}`,
        firstName: playerForm.firstName!,
        lastName: playerForm.lastName!,
        jerseyNumber: playerForm.jerseyNumber!,
        position: playerForm.position!,
        age: playerForm.age!,
        grade: playerForm.grade!,
        height: playerForm.height!,
        weight: playerForm.weight!,
        phone: playerForm.phone!,
        email: playerForm.email!,
        emergencyContact: playerForm.emergencyContact!,
        medicalInfo: playerForm.medicalInfo!,
        stats: playerForm.stats!,
        attendance: playerForm.attendance!,
        status: playerForm.status!,
        notes: playerForm.notes!,
        joinDate: selectedPlayer?.joinDate || new Date(),
        lastModified: new Date(),
      };

      if (selectedPlayer) {
        setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? newPlayer : p));
        toast({
          title: 'Player Updated!',
          description: `${newPlayer.firstName} ${newPlayer.lastName} has been updated.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        setPlayers(prev => [newPlayer, ...prev]);
        toast({
          title: 'Player Added!',
          description: `${newPlayer.firstName} ${newPlayer.lastName} has been added to the team.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      setShowPlayerModal(false);
      setSelectedPlayer(null);
      setPlayerForm({
        firstName: '',
        lastName: '',
        jerseyNumber: 0,
        position: '',
        age: 0,
        grade: '',
        height: '',
        weight: 0,
        phone: '',
        email: '',
        emergencyContact: {
          name: '',
          phone: '',
          relationship: '',
        },
        medicalInfo: {
          allergies: [],
          medications: [],
          conditions: [],
        },
        stats: {
          gamesPlayed: 0,
          goals: 0,
          assists: 0,
          tackles: 0,
          interceptions: 0,
          rating: 0,
        },
        attendance: {
          practices: 0,
          games: 0,
          total: 0,
        },
        status: 'active',
        notes: '',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save player. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      
      toast({
        title: 'Player Removed',
        description: 'Player has been removed from the team.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to remove player. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setPlayerForm(player);
    setShowPlayerModal(true);
  };

  const handleAddPlayer = () => {
    setSelectedPlayer(null);
    setPlayerForm({
      firstName: '',
      lastName: '',
      jerseyNumber: 0,
      position: '',
      age: 0,
      grade: '',
      height: '',
      weight: 0,
      phone: '',
      email: '',
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      medicalInfo: {
        allergies: [],
        medications: [],
        conditions: [],
      },
      stats: {
        gamesPlayed: 0,
        goals: 0,
        assists: 0,
        tackles: 0,
        interceptions: 0,
        rating: 0,
      },
      attendance: {
        practices: 0,
        games: 0,
        total: 0,
      },
      status: 'active',
      notes: '',
    });
    setShowPlayerModal(true);
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.jerseyNumber.toString().includes(searchQuery);
    const matchesPosition = filterPosition === 'all' || player.position === filterPosition;
    const matchesStatus = filterStatus === 'all' || player.status === filterStatus;
    return matchesSearch && matchesPosition && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'injured': return 'yellow';
      case 'suspended': return 'red';
      case 'inactive': return 'gray';
      default: return 'gray';
    }
  };

  const getPositionColor = (position: string) => {
    const positionGroups = {
      'QB': 'blue',
      'RB': 'green',
      'WR': 'purple',
      'TE': 'orange',
      'OL': 'gray',
      'DL': 'red',
      'LB': 'yellow',
      'DB': 'cyan',
      'K': 'pink',
      'P': 'teal',
    };
    return positionGroups[position as keyof typeof positionGroups] || 'gray';
  };

  const teamStats = {
    totalPlayers: players.length,
    activePlayers: players.filter(p => p.status === 'active').length,
    averageAge: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length) : 0,
    averageRating: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.stats.rating, 0) / players.length * 10) / 10 : 0,
  };

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
              {currentTeam?.name || 'Team Management'}
            </Heading>
            <Text color="gray.600">
              Manage your team roster and player information
            </Text>
          </VStack>
          
          <HStack spacing={3}>
            <Button
              leftIcon={<Plus />}
              colorScheme="brand"
              onClick={handleAddPlayer}
            >
              Add Player
            </Button>
            <Button
              leftIcon={<Download />}
              variant="outline"
            >
              Export Roster
            </Button>
            <Button
              leftIcon={<Upload />}
              variant="outline"
            >
              Import Players
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box p={6}>
        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
          <TabList>
            <Tab>Roster</Tab>
            <Tab>Statistics</Tab>
            <Tab>Attendance</Tab>
            <Tab>Medical</Tab>
          </TabList>

          <TabPanels>
            {/* Roster Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                {/* Team Stats */}
                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Total Players</StatLabel>
                        <StatNumber>{teamStats.totalPlayers}</StatNumber>
                        <StatHelpText>On roster</StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Active Players</StatLabel>
                        <StatNumber>{teamStats.activePlayers}</StatNumber>
                        <StatHelpText>Ready to play</StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Average Age</StatLabel>
                        <StatNumber>{teamStats.averageAge}</StatNumber>
                        <StatHelpText>Years old</StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Average Rating</StatLabel>
                        <StatNumber>{teamStats.averageRating}/5</StatNumber>
                        <StatHelpText>Player rating</StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                {/* Search and Filter */}
                <Card bg={bgColor} border="1px" borderColor={borderColor}>
                  <CardBody>
                    <HStack spacing={4}>
                      <Input
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search />}
                      />
                      <Select
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value)}
                        w="150px"
                      >
                        <option value="all">All Positions</option>
                        <option value="QB">Quarterback</option>
                        <option value="RB">Running Back</option>
                        <option value="WR">Wide Receiver</option>
                        <option value="TE">Tight End</option>
                        <option value="OL">Offensive Line</option>
                        <option value="DL">Defensive Line</option>
                        <option value="LB">Linebacker</option>
                        <option value="DB">Defensive Back</option>
                        <option value="K">Kicker</option>
                        <option value="P">Punter</option>
                      </Select>
                      <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        w="120px"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="injured">Injured</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                      </Select>
                      <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        w="120px"
                      >
                        <option value="name">Name</option>
                        <option value="number">Jersey #</option>
                        <option value="position">Position</option>
                        <option value="rating">Rating</option>
                      </Select>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Players Grid */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {filteredPlayers.map((player, index) => (
                    <ScaleFade key={player.id} in={true} delay={index * 0.1}>
                      <Card
                        bg={bgColor}
                        border="1px"
                        borderColor={borderColor}
                        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                        transition="all 0.2s"
                      >
                        <CardHeader>
                          <HStack justify="space-between">
                            <HStack spacing={3}>
                              <Avatar
                                size="md"
                                name={`${player.firstName} ${player.lastName}`}
                                bg={`${getPositionColor(player.position)}.500`}
                              />
                              <VStack align="start" spacing={1}>
                                <Heading size="sm">
                                  {player.firstName} {player.lastName}
                                </Heading>
                                <HStack>
                                  <Badge colorScheme={getPositionColor(player.position)}>
                                    #{player.jerseyNumber} {player.position}
                                  </Badge>
                                  <Badge colorScheme={getStatusColor(player.status)}>
                                    {player.status}
                                  </Badge>
                                </HStack>
                              </VStack>
                            </HStack>
                            <HStack>
                              <IconButton
                                aria-label="Edit player"
                                icon={<Edit />}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditPlayer(player)}
                              />
                              <IconButton
                                aria-label="Delete player"
                                icon={<Trash2 />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDeletePlayer(player.id)}
                              />
                            </HStack>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={3} align="stretch">
                            <HStack justify="space-between" fontSize="sm" color="gray.600">
                              <HStack>
                                <Icon as={User} boxSize={4} />
                                <Text>{player.age} years old</Text>
                              </HStack>
                              <HStack>
                                <Icon as={Star} boxSize={4} />
                                <Text>{player.stats.rating}/5</Text>
                              </HStack>
                            </HStack>
                            
                            <HStack justify="space-between" fontSize="sm" color="gray.600">
                              <HStack>
                                <Icon as={Phone} boxSize={4} />
                                <Text>{player.phone}</Text>
                              </HStack>
                              <HStack>
                                <Icon as={Mail} boxSize={4} />
                                <Text>{player.email}</Text>
                              </HStack>
                            </HStack>

                            <Divider />

                            <HStack justify="space-between" fontSize="sm">
                              <Text color="gray.600">Games Played:</Text>
                              <Text fontWeight="semibold">{player.stats.gamesPlayed}</Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="sm">
                              <Text color="gray.600">Attendance:</Text>
                              <Text fontWeight="semibold">
                                {Math.round((player.attendance.total / 24) * 100)}%
                              </Text>
                            </HStack>

                            {player.notes && (
                              <Box>
                                <Text fontSize="xs" color="gray.500" mb={1}>
                                  Notes:
                                </Text>
                                <Text fontSize="sm" color="gray.700">
                                  {player.notes}
                                </Text>
                              </Box>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    </ScaleFade>
                  ))}
                </SimpleGrid>

                {filteredPlayers.length === 0 && (
                  <Box textAlign="center" py={12}>
                    <Icon as={Users} boxSize={16} color="gray.400" mb={4} />
                    <Heading size="lg" color="gray.600" mb={2}>
                      No Players Found
                    </Heading>
                    <Text color="gray.500" mb={6}>
                      {searchQuery || filterPosition !== 'all' || filterStatus !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Add your first player to get started.'
                      }
                    </Text>
                    {(!searchQuery && filterPosition === 'all' && filterStatus === 'all') && (
                      <Button
                        leftIcon={<Plus />}
                        colorScheme="brand"
                        size="lg"
                        onClick={handleAddPlayer}
                      >
                        Add First Player
                      </Button>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>

            {/* Statistics Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                <Heading size="md">Team Statistics</Heading>
                <Text color="gray.600">
                  Comprehensive team and player statistics
                </Text>
                {/* Statistics content would go here */}
              </VStack>
            </TabPanel>

            {/* Attendance Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                <Heading size="md">Attendance Tracking</Heading>
                <Text color="gray.600">
                  Track player attendance for practices and games
                </Text>
                {/* Attendance content would go here */}
              </VStack>
            </TabPanel>

            {/* Medical Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                <Heading size="md">Medical Information</Heading>
                <Text color="gray.600">
                  Manage player medical information and emergency contacts
                </Text>
                {/* Medical content would go here */}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Player Modal */}
      <Modal isOpen={showPlayerModal} onClose={() => setShowPlayerModal(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedPlayer ? 'Edit Player' : 'Add New Player'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={playerForm.firstName}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={playerForm.lastName}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Jersey Number</FormLabel>
                  <NumberInput
                    value={playerForm.jerseyNumber}
                    onChange={(value) => setPlayerForm(prev => ({ ...prev, jerseyNumber: parseInt(value) || 0 }))}
                    min={0}
                    max={99}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Position</FormLabel>
                  <Select
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, position: e.target.value }))}
                  >
                    <option value="">Select position</option>
                    <option value="QB">Quarterback</option>
                    <option value="RB">Running Back</option>
                    <option value="WR">Wide Receiver</option>
                    <option value="TE">Tight End</option>
                    <option value="OL">Offensive Line</option>
                    <option value="DL">Defensive Line</option>
                    <option value="LB">Linebacker</option>
                    <option value="DB">Defensive Back</option>
                    <option value="K">Kicker</option>
                    <option value="P">Punter</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Phone</FormLabel>
                  <Input
                    value={playerForm.phone}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={playerForm.email}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="player@email.com"
                  />
                </FormControl>
              </SimpleGrid>

              <HStack spacing={4}>
                <Button
                  colorScheme="brand"
                  onClick={handleSavePlayer}
                  isLoading={isSaving}
                >
                  {selectedPlayer ? 'Update Player' : 'Add Player'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPlayerModal(false)}
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EnhancedTeamManagement;





