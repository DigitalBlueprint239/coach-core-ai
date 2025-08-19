import React, { useState, useEffect } from 'react';
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
  Cancel,
} from 'lucide-react';

interface Player {
  id: string;
  number: string;
  firstName: string;
  lastName: string;
  position: string;
  grade: number;
  height: string;
  weight: number;
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;
  medicalNotes: string;
  isActive: boolean;
  isCaptain: boolean;
  joinDate: Date;
  lastAttendance: Date;
  attendanceRate: number;
  performanceRating: number;
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
  activePlayers: number;
  averageAttendance: number;
  topPerformers: Player[];
  recentAbsences: Player[];
}

const TeamManagement: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const { isOpen: isPlayerModalOpen, onOpen: onPlayerModalOpen, onClose: onPlayerModalClose } = useDisclosure();
  const { isOpen: isAttendanceModalOpen, onOpen: onAttendanceModalOpen, onClose: onAttendanceModalClose } = useDisclosure();
  
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Sample players
  const samplePlayers: Player[] = [
    {
      id: '1',
      number: '12',
      firstName: 'Mike',
      lastName: 'Johnson',
      position: 'QB',
      grade: 12,
      height: '6\'2"',
      weight: 185,
      phone: '(555) 123-4567',
      email: 'mike.johnson@email.com',
      emergencyContact: 'Sarah Johnson',
      emergencyPhone: '(555) 123-4568',
      address: '123 Main St, Anytown, USA',
      medicalNotes: 'No known allergies',
      isActive: true,
      isCaptain: true,
      joinDate: new Date('2023-08-01'),
      lastAttendance: new Date(),
      attendanceRate: 95,
      performanceRating: 92,
    },
    {
      id: '2',
      number: '23',
      firstName: 'David',
      lastName: 'Smith',
      position: 'RB',
      grade: 11,
      height: '5\'10"',
      weight: 175,
      phone: '(555) 234-5678',
      email: 'david.smith@email.com',
      emergencyContact: 'John Smith',
      emergencyPhone: '(555) 234-5679',
      address: '456 Oak Ave, Anytown, USA',
      medicalNotes: 'Asthma - carries inhaler',
      isActive: true,
      isCaptain: false,
      joinDate: new Date('2023-08-01'),
      lastAttendance: new Date(),
      attendanceRate: 88,
      performanceRating: 87,
    },
    {
      id: '3',
      number: '85',
      firstName: 'Chris',
      lastName: 'Williams',
      position: 'WR',
      grade: 12,
      height: '6\'0"',
      weight: 180,
      phone: '(555) 345-6789',
      email: 'chris.williams@email.com',
      emergencyContact: 'Lisa Williams',
      emergencyPhone: '(555) 345-6790',
      address: '789 Pine Rd, Anytown, USA',
      medicalNotes: 'No known conditions',
      isActive: true,
      isCaptain: false,
      joinDate: new Date('2023-08-01'),
      lastAttendance: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      attendanceRate: 78,
      performanceRating: 85,
    },
  ];

  useEffect(() => {
    setPlayers(samplePlayers);
  }, []);

  const handleAddPlayer = () => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      number: '',
      firstName: '',
      lastName: '',
      position: '',
      grade: 9,
      height: '',
      weight: 0,
      phone: '',
      email: '',
      emergencyContact: '',
      emergencyPhone: '',
      address: '',
      medicalNotes: '',
      isActive: true,
      isCaptain: false,
      joinDate: new Date(),
      lastAttendance: new Date(),
      attendanceRate: 100,
      performanceRating: 70,
    };
    
    setSelectedPlayer(newPlayer);
    setIsEditing(true);
    onPlayerModalOpen();
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setIsEditing(true);
    onPlayerModalOpen();
  };

  const handleDeletePlayer = (playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    
    toast({
      title: 'Player Removed',
      description: 'Player has been removed from the team',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleSavePlayer = () => {
    if (!selectedPlayer) return;
    
    if (isEditing) {
      setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? selectedPlayer : p));
    } else {
      setPlayers(prev => [selectedPlayer, ...prev]);
    }
    
    setIsEditing(false);
    setSelectedPlayer(null);
    onPlayerModalClose();
    
    toast({
      title: 'Player Saved',
      description: 'Player information has been saved successfully',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleAttendanceCheck = (playerId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      playerId,
      date: new Date(),
      status,
      notes: '',
    };
    
    setAttendanceRecords(prev => [newRecord, ...prev]);
    
    // Update player's last attendance
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, lastAttendance: new Date() } : p
    ));
    
    toast({
      title: 'Attendance Recorded',
      description: `Marked as ${status}`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = `${player.firstName} ${player.lastName} ${player.number} ${player.position}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesPosition = filterPosition === 'all' || player.position === filterPosition;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && player.isActive) ||
      (filterStatus === 'inactive' && !player.isActive);
    
    return matchesSearch && matchesPosition && matchesStatus;
  });

  const teamStats: TeamStats = {
    totalPlayers: players.length,
    activePlayers: players.filter(p => p.isActive).length,
    averageAttendance: Math.round(players.reduce((sum, p) => sum + p.attendanceRate, 0) / players.length),
    topPerformers: players.sort((a, b) => b.performanceRating - a.performanceRating).slice(0, 3),
    recentAbsences: players.filter(p => p.attendanceRate < 80).slice(0, 3),
  };

  const getPositionColor = (position: string): string => {
    const colors: { [key: string]: string } = {
      'QB': 'red.500',
      'RB': 'blue.500',
      'WR': 'green.500',
      'TE': 'purple.500',
      'OL': 'orange.500',
      'DL': 'red.600',
      'LB': 'yellow.500',
      'CB': 'cyan.500',
      'S': 'pink.500',
      'K': 'gray.500',
      'P': 'gray.600',
    };
    return colors[position] || 'gray.500';
  };

  const getAttendanceColor = (rate: number): string => {
    if (rate >= 90) return 'green';
    if (rate >= 80) return 'yellow';
    if (rate >= 70) return 'orange';
    return 'red';
  };

  const getPerformanceColor = (rating: number): string => {
    if (rating >= 90) return 'green';
    if (rating >= 80) return 'blue';
    if (rating >= 70) return 'yellow';
    return 'red';
  };

  return (
    <Box minH="100vh" bg={bgColor} p={6}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg" color="brand.600">
            Team Management
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Manage roster, track attendance, and monitor player performance
          </Text>
        </VStack>
        
        <HStack spacing={4}>
          <Button
            leftIcon={<Icon as={Download} />}
            variant="outline"
            colorScheme="brand"
          >
            Export Roster
          </Button>
          <Button
            leftIcon={<Icon as={Upload} />}
            variant="outline"
            colorScheme="brand"
          >
            Import Roster
          </Button>
          <Button
            leftIcon={<Icon as={UserPlus} />}
            colorScheme="brand"
            variant="gradient"
            onClick={handleAddPlayer}
          >
            Add Player
          </Button>
        </HStack>
      </Flex>

      {/* Team Stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <VStack spacing={2}>
              <Icon as={Users} boxSize={8} color="brand.500" />
              <Text fontSize="2xl" fontWeight="bold" color="brand.600">
                {teamStats.totalPlayers}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Total Players
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <VStack spacing={2}>
              <Icon as={CheckCircle} boxSize={8} color="green.500" />
              <Text fontSize="2xl" fontWeight="bold" color="green.600">
                {teamStats.activePlayers}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Active Players
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <VStack spacing={2}>
              <Icon as={Calendar} boxSize={8} color="blue.500" />
              <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                {teamStats.averageAttendance}%
              </Text>
              <Text fontSize="sm" color="gray.600">
                Avg Attendance
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card variant="elevated" bg={cardBg}>
          <CardBody>
            <VStack spacing={2}>
              <Icon as={Star} boxSize={8} color="yellow.500" />
              <Text fontSize="2xl" fontWeight="bold" color="yellow.600">
                {teamStats.topPerformers.length}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Top Performers
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Tabs variant="enclosed" colorScheme="brand" mb={6}>
        <TabList>
          <Tab>Roster</Tab>
          <Tab>Attendance</Tab>
          <Tab>Performance</Tab>
        </TabList>
        
        <TabPanels>
          {/* Roster Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Search and Filters */}
              <Card variant="elevated" bg={cardBg}>
                <CardBody>
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                    <InputGroup>
                      <InputLeftElement>
                        <Icon as={Search} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                    
                    <Select
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value)}
                    >
                      <option value="all">All Positions</option>
                      <option value="QB">QB</option>
                      <option value="RB">RB</option>
                      <option value="WR">WR</option>
                      <option value="TE">TE</option>
                      <option value="OL">OL</option>
                      <option value="DL">DL</option>
                      <option value="LB">LB</option>
                      <option value="CB">CB</option>
                      <option value="S">S</option>
                      <option value="K">K</option>
                      <option value="P">P</option>
                    </Select>
                    
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </Grid>
                </CardBody>
              </Card>

              {/* Players Table */}
              <Card variant="elevated" bg={cardBg}>
                <CardHeader>
                  <Heading size="md" color="gray.800">
                    Team Roster ({filteredPlayers.length} players)
                  </Heading>
                </CardHeader>
                <CardBody p={0}>
                  <TableContainer>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Player</Th>
                          <Th>Position</Th>
                          <Th>Grade</Th>
                          <Th>Contact</Th>
                          <Th>Attendance</Th>
                          <Th>Performance</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredPlayers.map((player) => (
                          <Tr key={player.id}>
                            <Td>
                              <HStack spacing={3}>
                                <Avatar size="sm" name={`${player.firstName} ${player.lastName}`}>
                                  {player.isCaptain && (
                                    <AvatarBadge boxSize="1em" bg="yellow.500" />
                                  )}
                                </Avatar>
                                <VStack align="start" spacing={0}>
                                  <Text fontWeight="semibold">
                                    #{player.number} {player.firstName} {player.lastName}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {player.isCaptain ? 'Captain' : 'Player'}
                                  </Text>
                                </VStack>
                              </HStack>
                            </Td>
                            <Td>
                              <Badge colorScheme="blue" variant="subtle">
                                {player.position}
                              </Badge>
                            </Td>
                            <Td>{player.grade}</Td>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm">{player.phone}</Text>
                                <Text fontSize="xs" color="gray.500">{player.email}</Text>
                              </VStack>
                            </Td>
                            <Td>
                              <Badge colorScheme={getAttendanceColor(player.attendanceRate)} variant="subtle">
                                {player.attendanceRate}%
                              </Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme={getPerformanceColor(player.performanceRating)} variant="subtle">
                                {player.performanceRating}
                              </Badge>
                            </Td>
                            <Td>
                              <HStack spacing={1}>
                                <IconButton
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="blue"
                                  icon={<Icon as={Eye} boxSize={4} />}
                                  aria-label="View player"
                                  onClick={() => handleEditPlayer(player)}
                                />
                                <IconButton
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="green"
                                  icon={<Icon as={Edit} boxSize={4} />}
                                  aria-label="Edit player"
                                  onClick={() => handleEditPlayer(player)}
                                />
                                <IconButton
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  icon={<Icon as={Trash2} boxSize={4} />}
                                  aria-label="Delete player"
                                  onClick={() => handleDeletePlayer(player.id)}
                                />
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
          
          {/* Attendance Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Card variant="elevated" bg={cardBg}>
                <CardHeader>
                  <Heading size="md" color="gray.800">
                    Quick Attendance Check
                  </Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {players.map((player) => (
                      <Card key={player.id} variant="outline" size="sm">
                        <CardBody p={3}>
                          <VStack spacing={3} align="stretch">
                            <HStack justify="space-between">
                              <Text fontWeight="semibold">
                                #{player.number} {player.firstName} {player.lastName}
                              </Text>
                              <Badge colorScheme="blue" variant="subtle">
                                {player.position}
                              </Badge>
                            </HStack>
                            
                            <HStack spacing={2} justify="center">
                              <Button
                                size="sm"
                                colorScheme="green"
                                variant="outline"
                                onClick={() => handleAttendanceCheck(player.id, 'present')}
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => handleAttendanceCheck(player.id, 'absent')}
                              >
                                Absent
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="yellow"
                                variant="outline"
                                onClick={() => handleAttendanceCheck(player.id, 'late')}
                              >
                                Late
                              </Button>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
          
          {/* Performance Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {/* Top Performers */}
                <Card variant="elevated" bg={cardBg}>
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      Top Performers
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      {teamStats.topPerformers.map((player, index) => (
                        <HStack key={player.id} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                          <HStack spacing={3}>
                            <Badge colorScheme="yellow" variant="solid">
                              #{index + 1}
                            </Badge>
                            <Text fontWeight="semibold">
                              #{player.number} {player.firstName} {player.lastName}
                            </Text>
                          </HStack>
                          <Badge colorScheme={getPerformanceColor(player.performanceRating)} variant="solid">
                            {player.performanceRating}
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>

                {/* Attendance Concerns */}
                <Card variant="elevated" bg={cardBg}>
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      Attendance Concerns
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      {teamStats.recentAbsences.map((player) => (
                        <HStack key={player.id} justify="space-between" p={3} bg="red.50" borderRadius="md">
                          <Text fontWeight="semibold">
                            #{player.number} {player.firstName} {player.lastName}
                          </Text>
                          <Badge colorScheme="red" variant="solid">
                            {player.attendanceRate}%
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Player Modal */}
      <Modal isOpen={isPlayerModalOpen} onClose={onPlayerModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isEditing ? 'Edit Player' : 'Add New Player'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedPlayer && (
              <VStack spacing={4} align="stretch">
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Jersey Number
                    </Text>
                    <Input
                      value={selectedPlayer.number}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, number: e.target.value })}
                      placeholder="Enter jersey number"
                    />
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Position
                    </Text>
                    <Select
                      value={selectedPlayer.position}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, position: e.target.value })}
                    >
                      <option value="">Select Position</option>
                      <option value="QB">QB</option>
                      <option value="RB">RB</option>
                      <option value="WR">WR</option>
                      <option value="TE">TE</option>
                      <option value="OL">OL</option>
                      <option value="DL">DL</option>
                      <option value="LB">LB</option>
                      <option value="CB">CB</option>
                      <option value="S">S</option>
                      <option value="K">K</option>
                      <option value="P">P</option>
                    </Select>
                  </Box>
                </Grid>
                
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      First Name
                    </Text>
                    <Input
                      value={selectedPlayer.firstName}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Last Name
                    </Text>
                    <Input
                      value={selectedPlayer.lastName}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </Box>
                </Grid>
                
                <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Grade
                    </Text>
                    <NumberInput
                      value={selectedPlayer.grade}
                      onChange={(value) => setSelectedPlayer({ ...selectedPlayer, grade: parseInt(value) })}
                      min={9}
                      max={12}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Height
                    </Text>
                    <Input
                      value={selectedPlayer.height}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, height: e.target.value })}
                      placeholder="e.g., 6'2&quot;"
                    />
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Weight (lbs)
                    </Text>
                    <NumberInput
                      value={selectedPlayer.weight}
                      onChange={(value) => setSelectedPlayer({ ...selectedPlayer, weight: parseInt(value) })}
                      min={100}
                      max={400}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Box>
                </Grid>
                
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Phone
                    </Text>
                    <Input
                      value={selectedPlayer.phone}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Email
                    </Text>
                    <Input
                      value={selectedPlayer.email}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </Box>
                </Grid>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Medical Notes
                  </Text>
                  <Textarea
                    value={selectedPlayer.medicalNotes}
                    onChange={(e) => setSelectedPlayer({ ...selectedPlayer, medicalNotes: e.target.value })}
                    placeholder="Enter any medical notes or allergies"
                    rows={3}
                  />
                </Box>
                
                <HStack spacing={4}>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="is-active" mb="0">
                      Active Player
                    </FormLabel>
                    <Switch
                      id="is-active"
                      isChecked={selectedPlayer.isActive}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, isActive: e.target.checked })}
                    />
                  </FormControl>
                  
                  <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="is-captain" mb="0">
                      Team Captain
                    </FormLabel>
                    <Switch
                      id="is-captain"
                      isChecked={selectedPlayer.isCaptain}
                      onChange={(e) => setSelectedPlayer({ ...selectedPlayer, isCaptain: e.target.checked })}
                    />
                  </FormControl>
                </HStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPlayerModalClose}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={handleSavePlayer}>
              Save Player
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TeamManagement;
