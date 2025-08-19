import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Input,
  InputGroup,
  InputLeftElement,
  Select,
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
  Avatar,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Divider,
  SimpleGrid,
  Image,
  AspectRatio,
  useColorModeValue
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
  Search,
  Filter,
  Grid3X3,
  List,
  Star,
  BookOpen,
  FileText,
  Video,
  Image as ImageIcon,
  Palette,
  Brain,
  Zap,
  TrendingUp,
  Clock,
  Calendar,
  Tag,
  Plus,
  Edit,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Heart,
  Bookmark,
  Download as DownloadIcon,
  ExternalLink,
  Lock,
  Unlock,
  Users as TeamIcon,
  Award,
  Trophy,
  Target as GoalIcon,
  BarChart3,
  PieChart,
  Activity,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  RefreshCw,
  Archive,
  Folder,
  FolderOpen,
  FolderPlus,
  Tag as TagIcon,
  Hash,
  Hash as HashIcon,
  Hash as HashIcon2,
  Hash as HashIcon3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Play {
  id: string;
  name: string;
  type: 'offense' | 'defense' | 'special';
  formation: string;
  personnel: string;
  down: number;
  distance: number;
  fieldPosition: number;
  players: any[];
  routes: any[];
  movements: any[];
  notes: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  successRate?: number;
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  isFavorite: boolean;
  thumbnail?: string;
  views: number;
  likes: number;
  category: string;
  subcategory: string;
  aiGenerated: boolean;
  aiScore?: number;
}

const PlayLibrary: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [plays, setPlays] = useState<Play[]>([]);
  const [filteredPlays, setFilteredPlays] = useState<Play[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'offense' | 'defense' | 'special'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'success' | 'usage' | 'views'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load plays from Firestore
  useEffect(() => {
    loadPlays();
  }, []);

  const loadPlays = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to get plays from Firestore
      // For now, we'll use an empty array that will be populated when backend is ready
      const fetchedPlays: Play[] = [];
      
      setPlays(fetchedPlays);
      setFilteredPlays(fetchedPlays);
    } catch (error) {
      console.error('Error loading plays:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plays. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setPlays([]);
      setFilteredPlays([]);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = {
    offense: [
      { id: 'running', name: 'Running', icon: Users, count: 12 },
      { id: 'passing', name: 'Passing', icon: Target, count: 18 },
      { id: 'rpo', name: 'RPO', icon: Zap, count: 8 },
      { id: 'screen', name: 'Screen', icon: Shield, count: 6 },
      { id: 'trick', name: 'Trick', icon: Star, count: 4 }
    ],
    defense: [
      { id: 'pass-defense', name: 'Pass Defense', icon: Shield, count: 15 },
      { id: 'run-defense', name: 'Run Defense', icon: Users, count: 10 },
      { id: 'pass-rush', name: 'Pass Rush', icon: Target, count: 12 },
      { id: 'blitz', name: 'Blitz', icon: Zap, count: 8 },
      { id: 'coverage', name: 'Coverage', icon: Eye, count: 14 }
    ],
    special: [
      { id: 'field-goal', name: 'Field Goal', icon: Target, count: 6 },
      { id: 'punt', name: 'Punt', icon: Users, count: 4 },
      { id: 'kickoff', name: 'Kickoff', icon: Zap, count: 3 },
      { id: 'return', name: 'Return', icon: ChevronRight, count: 5 }
    ]
  };

  useEffect(() => {
    let filtered = plays;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(play =>
        play.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        play.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        play.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(play => play.type === selectedType);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(play => play.difficulty === selectedDifficulty);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(play => play.category.toLowerCase() === selectedCategory);
    }

    // Sort plays
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'created':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updated':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'success':
          aValue = a.successRate || 0;
          bValue = b.successRate || 0;
          break;
        case 'usage':
          aValue = a.usageCount || 0;
          bValue = b.usageCount || 0;
          break;
        case 'views':
          aValue = a.views;
          bValue = b.views;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPlays(filtered);
  }, [plays, searchTerm, selectedType, selectedDifficulty, selectedCategory, sortBy, sortOrder]);

  const handleFavorite = (playId: string) => {
    setPlays(prev => prev.map(play =>
      play.id === playId ? { ...play, isFavorite: !play.isFavorite } : play
    ));
  };

  const handleDelete = (playId: string) => {
    setPlays(prev => prev.filter(play => play.id !== playId));
    toast({
      title: 'Play deleted',
      description: 'The play has been removed from your library.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleShare = (play: Play) => {
    toast({
      title: 'Play shared!',
      description: `${play.name} has been shared with your team.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'offense': return Target;
      case 'defense': return Shield;
      case 'special': return Star;
      default: return Play;
    }
  };

  const stats = {
    total: plays.length,
    offense: plays.filter(p => p.type === 'offense').length,
    defense: plays.filter(p => p.type === 'defense').length,
    special: plays.filter(p => p.type === 'special').length,
    favorites: plays.filter(p => p.isFavorite).length,
    aiGenerated: plays.filter(p => p.aiGenerated).length,
    avgSuccessRate: plays.reduce((acc, p) => acc + (p.successRate || 0), 0) / plays.length
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bg="var(--team-surface-50)" p={8}>
        <VStack spacing={8} align="center">
          <Icon as={Play} w={16} h={16} color="var(--team-primary)" />
          <Text fontSize="xl" fontWeight="medium">Loading Play Library...</Text>
          <Progress size="lg" w="300px" colorScheme="blue" isIndeterminate />
        </VStack>
      </Box>
    );
  }

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
            <Icon as={BookOpen} w={8} h={8} color="white" />
            <VStack align="start" spacing={0}>
              <Heading size="lg" color="white">Play Library</Heading>
              <Text color="whiteAlpha.900" fontSize="sm">
                Browse, manage, and organize your football plays
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={Upload} />}
              variant="outline"
              color="white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: 'whiteAlpha.100' }}
            >
              Import Plays
            </Button>
            <Button
              leftIcon={<Icon as={Plus} />}
              bg="white"
              color="var(--team-primary)"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
              className="team-glow"
            >
              Create New Play
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Flex h="calc(100vh - 80px)">
        {/* Left Sidebar - Filters and Categories */}
        <Box w="300px" bg="white" borderRight="1px solid" borderColor="var(--team-border-light)" p={4}>
          <VStack spacing={6} align="stretch">
            {/* Search */}
            <Box>
              <Text fontWeight="medium" mb={3}>Search Plays</Text>
              <InputGroup>
                <InputLeftElement>
                  <Icon as={Search} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search plays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                />
              </InputGroup>
            </Box>

            <Divider />

            {/* Quick Stats */}
            <Box>
              <Text fontWeight="medium" mb={3}>Library Stats</Text>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm">Total Plays</Text>
                  <Badge colorScheme="blue">{stats.total}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Favorites</Text>
                  <Badge colorScheme="yellow">{stats.favorites}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">AI Generated</Text>
                  <Badge colorScheme="purple">{stats.aiGenerated}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Avg Success Rate</Text>
                  <Badge colorScheme="green">{stats.avgSuccessRate.toFixed(1)}%</Badge>
                </HStack>
              </VStack>
            </Box>

            <Divider />

            {/* Filters */}
            <Box>
              <Text fontWeight="medium" mb={3}>Filters</Text>
              <VStack spacing={3} align="stretch">
                <FormControl>
                  <FormLabel fontSize="sm">Play Type</FormLabel>
                  <Select 
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    size="sm"
                  >
                    <option value="all">All Types</option>
                    <option value="offense">Offense</option>
                    <option value="defense">Defense</option>
                    <option value="special">Special Teams</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Difficulty</FormLabel>
                  <Select 
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                    size="sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Category</FormLabel>
                  <Select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    size="sm"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(categories).map(([type, cats]) => (
                      <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                        {cats.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name} ({cat.count})</option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </FormControl>
              </VStack>
            </Box>

            <Divider />

            {/* Categories */}
            <Box>
              <Text fontWeight="medium" mb={3}>Categories</Text>
              <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
                <TabList>
                  <Tab>Offense</Tab>
                  <Tab>Defense</Tab>
                  <Tab>Special</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel p={0} pt={3}>
                    <VStack spacing={2} align="stretch">
                      {categories.offense.map(cat => (
                        <Button
                          key={cat.id}
                          leftIcon={<Icon as={cat.icon} />}
                          variant="ghost"
                          size="sm"
                          justifyContent="start"
                          onClick={() => setSelectedCategory(cat.id)}
                        >
                          {cat.name} ({cat.count})
                        </Button>
                      ))}
                    </VStack>
                  </TabPanel>
                  <TabPanel p={0} pt={3}>
                    <VStack spacing={2} align="stretch">
                      {categories.defense.map(cat => (
                        <Button
                          key={cat.id}
                          leftIcon={<Icon as={cat.icon} />}
                          variant="ghost"
                          size="sm"
                          justifyContent="start"
                          onClick={() => setSelectedCategory(cat.id)}
                        >
                          {cat.name} ({cat.count})
                        </Button>
                      ))}
                    </VStack>
                  </TabPanel>
                  <TabPanel p={0} pt={3}>
                    <VStack spacing={2} align="stretch">
                      {categories.special.map(cat => (
                        <Button
                          key={cat.id}
                          leftIcon={<Icon as={cat.icon} />}
                          variant="ghost"
                          size="sm"
                          justifyContent="start"
                          onClick={() => setSelectedCategory(cat.id)}
                        >
                          {cat.name} ({cat.count})
                        </Button>
                      ))}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex={1} p={6}>
          {/* Toolbar */}
          <Flex justify="space-between" align="center" mb={6}>
            <HStack spacing={4}>
              <Text fontSize="lg" fontWeight="medium">
                {filteredPlays.length} plays found
              </Text>
              <Badge colorScheme="blue">{selectedType !== 'all' ? selectedType : 'all types'}</Badge>
            </HStack>

            <HStack spacing={3}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                size="sm"
                w="150px"
              >
                <option value="created">Date Created</option>
                <option value="updated">Last Updated</option>
                <option value="name">Name</option>
                <option value="success">Success Rate</option>
                <option value="usage">Usage Count</option>
                <option value="views">Views</option>
              </Select>

              <IconButton
                icon={<Icon as={sortOrder === 'asc' ? SortAsc : SortDesc} />}
                aria-label="Toggle sort order"
                size="sm"
                variant="ghost"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              />

              <IconButton
                icon={<Icon as={viewMode === 'grid' ? Grid3X3 : List} />}
                aria-label="Toggle view mode"
                size="sm"
                variant="ghost"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              />
            </HStack>
          </Flex>

          {/* Plays Grid/List */}
          {isLoading ? (
            <VStack spacing={6} align="center" py={12}>
              <Box
                w={16}
                h={16}
                bg="primary.100"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={Clock} boxSize={8} color="primary.600" />
              </Box>
              <Text fontSize="lg" color="gray.600" fontWeight="500">
                Loading plays...
              </Text>
            </VStack>
          ) : filteredPlays.length === 0 ? (
            <VStack spacing={6} align="center" py={12}>
              <Box
                w={16}
                h={16}
                bg="gray.100"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={BookOpen} boxSize={8} color="gray.500" />
              </Box>
              <VStack spacing={2} align="center">
                <Text fontSize="lg" color="gray.600" fontWeight="500">
                  No plays found
                </Text>
                <Text fontSize="md" color="gray.500" textAlign="center">
                  {searchTerm || selectedType !== 'all' || selectedDifficulty !== 'all' || selectedCategory !== 'all'
                    ? 'Try adjusting your filters to see more plays'
                    : 'Start by creating your first play or importing from your playbook'
                  }
                </Text>
              </VStack>
              <HStack spacing={4}>
                <Button
                  variant="brand-primary"
                  leftIcon={<Icon as={Plus} />}
                  onClick={() => {
                    // TODO: Navigate to play creation
                    toast({
                      title: 'Coming Soon',
                      description: 'Play creation will be available in the next update',
                      status: 'info',
                      duration: 3000,
                      isClosable: true,
                    });
                  }}
                >
                  Create Play
                </Button>
                <Button
                  variant="brand-outline"
                  leftIcon={<Icon as={Upload} />}
                  onClick={() => {
                    // TODO: Navigate to play import
                    toast({
                      title: 'Coming Soon',
                      description: 'Play import will be available in the next update',
                      status: 'info',
                      duration: 3000,
                      isClosable: true,
                    });
                  }}
                >
                  Import Plays
                </Button>
              </HStack>
            </VStack>
          ) : (
            <>
              {viewMode === 'grid' ? (
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
              {filteredPlays.map((play) => (
                <motion.div
                  key={play.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    cursor="pointer"
                    onClick={() => setSelectedPlay(play)}
                    _hover={{ shadow: 'lg' }}
                    position="relative"
                  >
                    <CardHeader pb={2}>
                      <Flex justify="space-between" align="start">
                        <VStack align="start" spacing={1}>
                          <HStack spacing={2}>
                            <Icon as={getTypeIcon(play.type)} color={`${play.type}.500`} />
                            <Text fontWeight="medium" fontSize="md">{play.name}</Text>
                          </HStack>
                          <HStack spacing={2}>
                            <Badge size="sm" colorScheme={getDifficultyColor(play.difficulty)}>
                              {play.difficulty}
                            </Badge>
                            <Badge size="sm" variant="outline">
                              {play.formation}
                            </Badge>
                            <Badge size="sm" variant="outline">
                              {play.personnel}
                            </Badge>
                          </HStack>
                        </VStack>

                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<Icon as={MoreVertical} />}
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <MenuList>
                            <MenuItem icon={<Icon as={Edit} />}>Edit Play</MenuItem>
                            <MenuItem icon={<Icon as={Share} />} onClick={() => handleShare(play)}>
                              Share Play
                            </MenuItem>
                            <MenuItem icon={<Icon as={DownloadIcon} />}>Export</MenuItem>
                            <MenuDivider />
                            <MenuItem 
                              icon={<Icon as={Trash2} />} 
                              color="red.500"
                              onClick={() => handleDelete(play.id)}
                            >
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>
                    </CardHeader>

                    <CardBody pt={0}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontSize="sm" color="gray.600" noOfLines={2}>
                          {play.notes}
                        </Text>

                        <HStack spacing={2} flexWrap="wrap">
                          {play.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} size="sm" variant="subtle" colorScheme="blue">
                              {tag}
                            </Badge>
                          ))}
                          {play.tags.length > 3 && (
                            <Badge size="sm" variant="subtle" colorScheme="gray">
                              +{play.tags.length - 3}
                            </Badge>
                          )}
                        </HStack>

                        <HStack justify="space-between" fontSize="sm" color="gray.500">
                          <HStack spacing={4}>
                            <HStack spacing={1}>
                              <Icon as={Eye} size={14} />
                              <Text>{play.views}</Text>
                            </HStack>
                            <HStack spacing={1}>
                              <Icon as={Heart} size={14} />
                              <Text>{play.likes}</Text>
                            </HStack>
                            <HStack spacing={1}>
                              <Icon as={Target} size={14} />
                              <Text>{play.usageCount || 0}</Text>
                            </HStack>
                          </HStack>
                          <Text>{play.createdBy}</Text>
                        </HStack>

                        {play.successRate && (
                          <Box>
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="xs" color="gray.500">Success Rate</Text>
                              <Text fontSize="xs" fontWeight="medium">{play.successRate}%</Text>
                            </HStack>
                            <Progress 
                              value={play.successRate} 
                              size="sm" 
                              colorScheme={play.successRate > 70 ? 'green' : play.successRate > 50 ? 'yellow' : 'red'}
                            />
                          </Box>
                        )}

                        {play.aiGenerated && (
                          <HStack spacing={1}>
                            <Icon as={Brain} size={14} color="purple.500" />
                            <Text fontSize="xs" color="purple.500">AI Generated</Text>
                            {play.aiScore && (
                              <Badge size="sm" colorScheme="purple">{play.aiScore}%</Badge>
                            )}
                          </HStack>
                        )}
                      </VStack>
                    </CardBody>

                    {/* Favorite Button */}
                    <IconButton
                      icon={<Icon as={play.isFavorite ? Star : Star} />}
                      aria-label="Toggle favorite"
                      size="sm"
                      variant="ghost"
                      position="absolute"
                      top={2}
                      right={2}
                      color={play.isFavorite ? 'yellow.400' : 'gray.400'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavorite(play.id);
                      }}
                    />
                  </Card>
                </motion.div>
              ))}
            </Grid>
          ) : (
            <VStack spacing={3} align="stretch">
              {filteredPlays.map((play) => (
                <Card
                  key={play.id}
                  cursor="pointer"
                  onClick={() => setSelectedPlay(play)}
                  _hover={{ shadow: 'md' }}
                >
                  <Flex justify="space-between" align="center" p={4}>
                    <HStack spacing={4}>
                      <Icon as={getTypeIcon(play.type)} color={`${play.type}.500`} />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">{play.name}</Text>
                        <HStack spacing={2}>
                          <Badge size="sm" colorScheme={getDifficultyColor(play.difficulty)}>
                            {play.difficulty}
                          </Badge>
                          <Badge size="sm" variant="outline">{play.formation}</Badge>
                          <Text fontSize="sm" color="gray.500">{play.notes}</Text>
                        </HStack>
                      </VStack>
                    </HStack>

                    <HStack spacing={4}>
                      <VStack align="end" spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">{play.successRate}%</Text>
                        <Text fontSize="xs" color="gray.500">Success Rate</Text>
                      </VStack>
                      <VStack align="end" spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">{play.usageCount || 0}</Text>
                        <Text fontSize="xs" color="gray.500">Uses</Text>
                      </VStack>
                      <IconButton
                        icon={<Icon as={play.isFavorite ? Star : Star} />}
                        aria-label="Toggle favorite"
                        size="sm"
                        variant="ghost"
                        color={play.isFavorite ? 'yellow.400' : 'gray.400'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFavorite(play.id);
                        }}
                      />
                    </HStack>
                  </Flex>
                </Card>
              ))}
            </VStack>
          )}
            </>
          )}
        </Box>
      </Flex>

      {/* Play Detail Modal */}
      <Modal isOpen={!!selectedPlay} onClose={() => setSelectedPlay(null)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Icon as={getTypeIcon(selectedPlay?.type || 'offense')} />
              <Text>{selectedPlay?.name}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedPlay && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Badge colorScheme={getDifficultyColor(selectedPlay.difficulty)}>
                      {selectedPlay.difficulty}
                    </Badge>
                    <Badge variant="outline">{selectedPlay.formation}</Badge>
                    <Badge variant="outline">{selectedPlay.personnel}</Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    Created by {selectedPlay.createdBy}
                  </Text>
                </HStack>

                <Text>{selectedPlay.notes}</Text>

                <HStack spacing={2} flexWrap="wrap">
                  {selectedPlay.tags.map((tag, index) => (
                    <Badge key={index} colorScheme="blue" variant="subtle">
                      {tag}
                    </Badge>
                  ))}
                </HStack>

                <SimpleGrid columns={2} spacing={4}>
                  <Stat>
                    <StatLabel>Success Rate</StatLabel>
                    <StatNumber>{selectedPlay.successRate}%</StatNumber>
                    <StatHelpText>
                      <Icon as={ArrowUp} color="green.500" boxSize={4} />
                      +12% this week
                    </StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Usage Count</StatLabel>
                    <StatNumber>{selectedPlay.usageCount || 0}</StatNumber>
                    <StatHelpText>Times used</StatHelpText>
                  </Stat>
                </SimpleGrid>

                <HStack justify="space-between">
                  <Button leftIcon={<Icon as={Edit} />} colorScheme="blue">
                    Edit Play
                  </Button>
                  <Button leftIcon={<Icon as={Share} />} variant="outline">
                    Share
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

export default PlayLibrary; 