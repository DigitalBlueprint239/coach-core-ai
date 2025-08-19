import React, { useState } from 'react';
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
  SimpleGrid,
  Badge,
  Avatar,
  IconButton,
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
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useToast,
  Icon,
  Divider,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  BarChart3,
  Calendar,
  Award,
  Target,
  TrendingUp,
  Filter as FilterIcon,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import PlayerRegistration from './PlayerRegistration';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  jerseyNumber: string;
  grade: string;
  school: string;
  status: 'active' | 'inactive' | 'injured';
  lastPractice: string;
  attendanceRate: number;
  goals: number;
  assists: number;
}

const PlayerManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Mock data - replace with actual API calls
  const [players, setPlayers] = useState<Player[]>([
    {
      id: '1',
      firstName: 'Alex',
      lastName: 'Johnson',
      position: 'Forward',
      jerseyNumber: '10',
      grade: '11th',
      school: 'Lincoln High',
      status: 'active',
      lastPractice: '2024-01-15',
      attendanceRate: 95,
      goals: 12,
      assists: 8,
    },
    {
      id: '2',
      firstName: 'Sarah',
      lastName: 'Williams',
      position: 'Midfielder',
      jerseyNumber: '8',
      grade: '10th',
      school: 'Lincoln High',
      status: 'active',
      lastPractice: '2024-01-15',
      attendanceRate: 88,
      goals: 6,
      assists: 15,
    },
    {
      id: '3',
      firstName: 'Mike',
      lastName: 'Davis',
      position: 'Defender',
      jerseyNumber: '4',
      grade: '12th',
      school: 'Lincoln High',
      status: 'injured',
      lastPractice: '2024-01-10',
      attendanceRate: 75,
      goals: 2,
      assists: 3,
    },
  ]);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = !filterPosition || player.position === filterPosition;
    const matchesStatus = !filterStatus || player.status === filterStatus;
    
    return matchesSearch && matchesPosition && matchesStatus;
  });

  const stats = {
    totalPlayers: players.length,
    activePlayers: players.filter(p => p.status === 'active').length,
    injuredPlayers: players.filter(p => p.status === 'injured').length,
    averageAttendance: Math.round(players.reduce((sum, p) => sum + p.attendanceRate, 0) / players.length),
    totalGoals: players.reduce((sum, p) => sum + p.goals, 0),
    totalAssists: players.reduce((sum, p) => sum + p.assists, 0),
  };

  const handleAddPlayer = () => {
    onOpen();
  };

  const handleEditPlayer = (playerId: string) => {
    // Implement edit functionality
    toast({
      title: 'Edit Player',
      description: `Editing player ${playerId}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleDeletePlayer = (playerId: string) => {
    // Implement delete functionality
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    toast({
      title: 'Player Deleted',
      description: 'Player has been removed from the team',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleViewPlayer = (playerId: string) => {
    // Implement view functionality
    toast({
      title: 'View Player',
      description: `Viewing player ${playerId}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'injured':
        return 'red';
      case 'inactive':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Forward':
        return 'blue';
      case 'Midfielder':
        return 'purple';
      case 'Defender':
        return 'orange';
      case 'Goalkeeper':
        return 'teal';
      default:
        return 'gray';
    }
  };

  return (
    <Box minH="100vh" bg="dark.50" p={6}>
      {/* Header */}
      <Box mb={8}>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between" align="center">
            <Box>
              <Heading size="xl" color="dark.800">
                Player Management
              </Heading>
              <Text color="dark.600" fontSize="lg">
                Manage your team roster, track performance, and handle registrations
              </Text>
            </Box>
            <Button
              variant="brand-primary"
              size="lg"
              onClick={handleAddPlayer}
              leftIcon={<Icon as={UserPlus} />}
              boxShadow="brand-glow"
              px={8}
            >
              Add New Player
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Stats Overview */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel color="dark.600" fontSize="sm">Total Players</StatLabel>
              <StatNumber color="dark.800" fontSize="2xl">{stats.totalPlayers}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +12% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel color="dark.600" fontSize="sm">Active Players</StatLabel>
              <StatNumber color="dark.800" fontSize="2xl">{stats.activePlayers}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +8% improvement
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel color="dark.600" fontSize="sm">Avg Attendance</StatLabel>
              <StatNumber color="dark.800" fontSize="2xl">{stats.averageAttendance}%</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +15% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel color="dark.600" fontSize="sm">Total Goals</StatLabel>
              <StatNumber color="dark.800" fontSize="2xl">{stats.totalGoals}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +5% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab value="overview">Overview</Tab>
              <Tab value="roster">Roster</Tab>
              <Tab value="performance">Performance</Tab>
              <Tab value="attendance">Attendance</Tab>
            </TabList>
          </Tabs>
        </CardHeader>
        <CardBody>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabPanels>
              {/* Overview Tab */}
              <TabPanel value="overview">
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" color="dark.800" mb={4}>
                      Team Overview
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Card>
                        <CardBody>
                          <VStack spacing={4}>
                            <HStack w="full" justify="space-between">
                              <Text color="dark.700" fontWeight="600">Position Distribution</Text>
                              <Icon as={BarChart3} color="primary.500" />
                            </HStack>
                            <VStack spacing={2} w="full">
                              <HStack w="full" justify="space-between">
                                <Text color="dark.600">Forwards</Text>
                                <Badge colorScheme="blue">{players.filter(p => p.position === 'Forward').length}</Badge>
                              </HStack>
                              <HStack w="full" justify="space-between">
                                <Text color="dark.600">Midfielders</Text>
                                <Badge colorScheme="purple">{players.filter(p => p.position === 'Midfielder').length}</Badge>
                              </HStack>
                              <HStack w="full" justify="space-between">
                                <Text color="dark.600">Defenders</Text>
                                <Badge colorScheme="orange">{players.filter(p => p.position === 'Defender').length}</Badge>
                              </HStack>
                              <HStack w="full" justify="space-between">
                                <Text color="dark.600">Goalkeepers</Text>
                                <Badge colorScheme="teal">{players.filter(p => p.position === 'Goalkeeper').length}</Badge>
                              </HStack>
                            </VStack>
                          </VStack>
                        </CardBody>
                      </Card>

                      <Card>
                        <CardBody>
                          <VStack spacing={4}>
                            <HStack w="full" justify="space-between">
                              <Text color="dark.700" fontWeight="600">Recent Activity</Text>
                              <Icon as={Calendar} color="primary.500" />
                            </HStack>
                            <VStack spacing={2} w="full">
                              <HStack w="full" justify="space-between">
                                <Text color="dark.600" fontSize="sm">Last Practice</Text>
                                <Text color="dark.800" fontSize="sm">Jan 15, 2024</Text>
                              </HStack>
                              <HStack w="full" justify="space-between">
                                <Text color="dark.600" fontSize="sm">Next Game</Text>
                                <Text color="dark.800" fontSize="sm">Jan 22, 2024</Text>
                              </HStack>
                              <HStack w="full" justify="space-between">
                                <Text color="dark.600" fontSize="sm">Team Meeting</Text>
                                <Text color="dark.800" fontSize="sm">Jan 18, 2024</Text>
                              </HStack>
                            </VStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </SimpleGrid>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Roster Tab */}
              <TabPanel value="roster">
                <VStack spacing={6} align="stretch">
                  {/* Search and Filters */}
                  <HStack spacing={4} wrap="wrap">
                    <InputGroup maxW="300px">
                      <InputLeftElement>
                        <Icon as={Search} color="dark.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        borderRadius="xl"
                        border="2px solid"
                        borderColor="dark.300"
                        _focus={{
                          borderColor: 'primary.500',
                          boxShadow: 'brand-glow',
                        }}
                      />
                    </InputGroup>

                    <Select
                      placeholder="All Positions"
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value)}
                      maxW="200px"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="dark.300"
                      _focus={{
                        borderColor: 'primary.500',
                        boxShadow: 'brand-glow',
                      }}
                    >
                      <option value="Forward">Forward</option>
                      <option value="Midfielder">Midfielder</option>
                      <option value="Defender">Defender</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                    </Select>

                    <Select
                      placeholder="All Statuses"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      maxW="200px"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="dark.300"
                      _focus={{
                        borderColor: 'primary.500',
                        boxShadow: 'brand-glow',
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="injured">Injured</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </HStack>

                  {/* Players Table */}
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th color="dark.700">Player</Th>
                          <Th color="dark.700">Position</Th>
                          <Th color="dark.700">Jersey</Th>
                          <Th color="dark.700">Grade</Th>
                          <Th color="dark.700">Status</Th>
                          <Th color="dark.700">Attendance</Th>
                          <Th color="dark.700">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredPlayers.map((player) => (
                          <Tr key={player.id}>
                            <Td>
                              <HStack spacing={3}>
                                <Avatar size="sm" name={`${player.firstName} ${player.lastName}`} />
                                <Box>
                                  <Text fontWeight="600" color="dark.800">
                                    {player.firstName} {player.lastName}
                                  </Text>
                                  <Text fontSize="sm" color="dark.600">
                                    {player.school}
                                  </Text>
                                </Box>
                              </HStack>
                            </Td>
                            <Td>
                              <Badge colorScheme={getPositionColor(player.position)}>
                                {player.position}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontWeight="600" color="dark.800">
                                #{player.jerseyNumber}
                              </Text>
                            </Td>
                            <Td>
                              <Text color="dark.700">{player.grade}</Text>
                            </Td>
                            <Td>
                              <Badge colorScheme={getStatusColor(player.status)}>
                                {player.status}
                              </Badge>
                            </Td>
                            <Td>
                              <Text color="dark.700">{player.attendanceRate}%</Text>
                            </Td>
                            <Td>
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<Icon as={MoreVertical} />}
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Actions"
                                />
                                <MenuList>
                                  <MenuItem icon={<Icon as={Eye} />} onClick={() => handleViewPlayer(player.id)}>
                                    View Profile
                                  </MenuItem>
                                  <MenuItem icon={<Icon as={Edit} />} onClick={() => handleEditPlayer(player.id)}>
                                    Edit
                                  </MenuItem>
                                  <MenuDivider />
                                  <MenuItem icon={<Icon as={Trash2} />} onClick={() => handleDeletePlayer(player.id)}>
                                    Remove
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Performance Tab */}
              <TabPanel value="performance">
                <VStack spacing={6} align="stretch">
                  <Heading size="md" color="dark.800" mb={4}>
                    Performance Metrics
                  </Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <Card>
                      <CardHeader>
                        <Heading size="sm" color="dark.800">Top Scorers</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3}>
                          {players
                            .sort((a, b) => b.goals - a.goals)
                            .slice(0, 5)
                            .map((player, index) => (
                              <HStack key={player.id} w="full" justify="space-between">
                                <HStack spacing={3}>
                                  <Text color="dark.600" fontWeight="600">
                                    #{index + 1}
                                  </Text>
                                  <Text color="dark.800">
                                    {player.firstName} {player.lastName}
                                  </Text>
                                </HStack>
                                <HStack spacing={2}>
                                  <Icon as={Target} color="primary.500" size={16} />
                                  <Text color="dark.800" fontWeight="600">
                                    {player.goals}
                                  </Text>
                                </HStack>
                              </HStack>
                            ))}
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader>
                        <Heading size="sm" color="dark.800">Top Assists</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3}>
                          {players
                            .sort((a, b) => b.assists - a.assists)
                            .slice(0, 5)
                            .map((player, index) => (
                              <HStack key={player.id} w="full" justify="space-between">
                                <HStack spacing={3}>
                                  <Text color="dark.600" fontWeight="600">
                                    #{index + 1}
                                  </Text>
                                  <Text color="dark.800">
                                    {player.firstName} {player.lastName}
                                  </Text>
                                </HStack>
                                <HStack spacing={2}>
                                  <Icon as={Award} color="primary.500" size={16} />
                                  <Text color="dark.800" fontWeight="600">
                                    {player.assists}
                                  </Text>
                                </HStack>
                              </HStack>
                            ))}
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </VStack>
              </TabPanel>

              {/* Attendance Tab */}
              <TabPanel value="attendance">
                <VStack spacing={6} align="stretch">
                  <Heading size="md" color="dark.800" mb={4}>
                    Attendance Tracking
                  </Heading>
                  
                  <Card>
                    <CardBody>
                      <VStack spacing={4}>
                        {players
                          .sort((a, b) => b.attendanceRate - a.attendanceRate)
                          .map((player) => (
                            <HStack key={player.id} w="full" justify="space-between">
                              <HStack spacing={3}>
                                <Avatar size="sm" name={`${player.firstName} ${player.lastName}`} />
                                <Box>
                                  <Text fontWeight="600" color="dark.800">
                                    {player.firstName} {player.lastName}
                                  </Text>
                                  <Text fontSize="sm" color="dark.600">
                                    {player.position} • #{player.jerseyNumber}
                                  </Text>
                                </Box>
                              </HStack>
                              <HStack spacing={3}>
                                <Text color="dark.700" fontWeight="600">
                                  {player.attendanceRate}%
                                </Text>
                                <Box
                                  w="100px"
                                  h="8px"
                                  bg="dark.200"
                                  borderRadius="full"
                                  overflow="hidden"
                                >
                                  <Box
                                    h="full"
                                    bg={player.attendanceRate >= 90 ? 'green.500' : player.attendanceRate >= 75 ? 'yellow.500' : 'red.500'}
                                    w={`${player.attendanceRate}%`}
                                  />
                                </Box>
                              </HStack>
                            </HStack>
                          ))}
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>

      {/* Player Registration Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack justify="space-between" align="center">
              <Text>Player Registration</Text>
              <ModalCloseButton />
            </HStack>
          </ModalHeader>
          <ModalBody p={0}>
            <PlayerRegistration />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PlayerManagementDashboard;

