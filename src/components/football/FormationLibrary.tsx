import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Card,
  CardHeader,
  CardBody,
  Badge,
  useToast,
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
  Divider,
  Collapse,
  Input,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import {
  Users,
  Shield,
  Star,
  Target,
  Search,
  Play,
  BookOpen,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

// Types
interface Formation {
  id: string;
  name: string;
  type: 'offense' | 'defense' | 'special';
  personnel: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  successRate: number;
  usageCount: number;
  tags: string[];
  image?: string;
  players: FormationPlayer[];
  situations: string[];
  pros: string[];
  cons: string[];
}

interface FormationPlayer {
  position: string;
  x: number;
  y: number;
  number: string;
  color: string;
}

// Formation Data
const FORMATIONS: Formation[] = [
  // Offensive Formations
  {
    id: 'shotgun-spread',
    name: 'Shotgun Spread',
    type: 'offense',
    personnel: '11',
    description: 'QB in shotgun with 1 RB and 4 WR spread across the field',
    difficulty: 'beginner',
    successRate: 0.72,
    usageCount: 1250,
    tags: ['passing', 'spread', 'modern'],
    situations: ['3rd and long', '2-minute drill', 'passing situations'],
    pros: ['Great for passing', 'Spreads defense thin', 'Quick reads'],
    cons: ['Vulnerable to blitz', 'Limited run options', 'Complex protection'],
    players: [
      { position: 'qb', x: 50, y: 45, number: '12', color: '#DC2626' },
      { position: 'rb', x: 50, y: 35, number: '23', color: '#059669' },
      { position: 'wr', x: 15, y: 45, number: '84', color: '#2563EB' },
      { position: 'wr', x: 85, y: 45, number: '85', color: '#2563EB' },
      { position: 'wr', x: 25, y: 45, number: '86', color: '#2563EB' },
      { position: 'wr', x: 75, y: 45, number: '88', color: '#2563EB' },
      { position: 'c', x: 50, y: 55, number: '52', color: '#6B7280' },
      { position: 'g', x: 40, y: 55, number: '70', color: '#6B7280' },
      { position: 'g', x: 60, y: 55, number: '71', color: '#6B7280' },
      { position: 't', x: 30, y: 55, number: '76', color: '#6B7280' },
      { position: 't', x: 70, y: 55, number: '77', color: '#6B7280' }
    ]
  },
  {
    id: 'i-formation',
    name: 'I-Formation',
    type: 'offense',
    personnel: '21',
    description: 'Traditional I-formation with QB under center, FB and RB behind',
    difficulty: 'beginner',
    successRate: 0.68,
    usageCount: 890,
    tags: ['running', 'traditional', 'power'],
    situations: ['1st and 10', 'goal line', 'short yardage'],
    pros: ['Strong running game', 'Power blocking', 'Play action'],
    cons: ['Limited passing', 'Predictable', 'Slow developing'],
    players: [
      { position: 'qb', x: 50, y: 50, number: '12', color: '#DC2626' },
      { position: 'fb', x: 50, y: 45, number: '44', color: '#7C3AED' },
      { position: 'rb', x: 50, y: 40, number: '23', color: '#059669' },
      { position: 'wr', x: 15, y: 45, number: '84', color: '#2563EB' },
      { position: 'wr', x: 85, y: 45, number: '85', color: '#2563EB' },
      { position: 'te', x: 75, y: 50, number: '87', color: '#EA580C' },
      { position: 'c', x: 50, y: 55, number: '52', color: '#6B7280' },
      { position: 'g', x: 40, y: 55, number: '70', color: '#6B7280' },
      { position: 'g', x: 60, y: 55, number: '71', color: '#6B7280' },
      { position: 't', x: 30, y: 55, number: '76', color: '#6B7280' },
      { position: 't', x: 70, y: 55, number: '77', color: '#6B7280' }
    ]
  },
  {
    id: 'pistol',
    name: 'Pistol',
    type: 'offense',
    personnel: '11',
    description: 'QB 3 yards behind center with RB behind QB',
    difficulty: 'intermediate',
    successRate: 0.71,
    usageCount: 650,
    tags: ['balanced', 'modern', 'versatile'],
    situations: ['Balanced attack', 'Read option', 'Play action'],
    pros: ['Balanced run/pass', 'Read option threat', 'Play action effective'],
    cons: ['Complex reads', 'Timing sensitive', 'Limited deep passing'],
    players: [
      { position: 'qb', x: 50, y: 42, number: '12', color: '#DC2626' },
      { position: 'rb', x: 50, y: 35, number: '23', color: '#059669' },
      { position: 'wr', x: 15, y: 45, number: '84', color: '#2563EB' },
      { position: 'wr', x: 85, y: 45, number: '85', color: '#2563EB' },
      { position: 'wr', x: 25, y: 45, number: '86', color: '#2563EB' },
      { position: 'te', x: 75, y: 50, number: '87', color: '#EA580C' },
      { position: 'c', x: 50, y: 55, number: '52', color: '#6B7280' },
      { position: 'g', x: 40, y: 55, number: '70', color: '#6B7280' },
      { position: 'g', x: 60, y: 55, number: '71', color: '#6B7280' },
      { position: 't', x: 30, y: 55, number: '76', color: '#6B7280' },
      { position: 't', x: 70, y: 55, number: '77', color: '#6B7280' }
    ]
  },
  {
    id: 'empty',
    name: 'Empty',
    type: 'offense',
    personnel: '00',
    description: 'No RB, 5 WR spread across the field',
    difficulty: 'advanced',
    successRate: 0.65,
    usageCount: 320,
    tags: ['passing', 'spread', 'hurry-up'],
    situations: ['2-minute drill', '3rd and long', 'hurry-up offense'],
    pros: ['Maximum passing', 'Quick tempo', 'Spreads defense'],
    cons: ['No run threat', 'Vulnerable to pressure', 'Complex protection'],
    players: [
      { position: 'qb', x: 50, y: 50, number: '12', color: '#DC2626' },
      { position: 'wr', x: 10, y: 45, number: '84', color: '#2563EB' },
      { position: 'wr', x: 90, y: 45, number: '85', color: '#2563EB' },
      { position: 'wr', x: 25, y: 45, number: '86', color: '#2563EB' },
      { position: 'wr', x: 75, y: 45, number: '88', color: '#2563EB' },
      { position: 'wr', x: 50, y: 45, number: '89', color: '#2563EB' },
      { position: 'c', x: 50, y: 55, number: '52', color: '#6B7280' },
      { position: 'g', x: 40, y: 55, number: '70', color: '#6B7280' },
      { position: 'g', x: 60, y: 55, number: '71', color: '#6B7280' },
      { position: 't', x: 30, y: 55, number: '76', color: '#6B7280' },
      { position: 't', x: 70, y: 55, number: '77', color: '#6B7280' }
    ]
  },

  // Defensive Formations
  {
    id: '4-3',
    name: '4-3 Defense',
    type: 'defense',
    personnel: '43',
    description: '4 defensive linemen, 3 linebackers, 4 defensive backs',
    difficulty: 'beginner',
    successRate: 0.69,
    usageCount: 1100,
    tags: ['balanced', 'traditional', 'versatile'],
    situations: ['Balanced defense', 'Run stopping', 'Zone coverage'],
    pros: ['Strong run defense', 'Versatile', 'Good pass rush'],
    cons: ['Vulnerable to spread', 'Limited blitz options', 'Can be predictable'],
    players: [
      { position: 'de', x: 25, y: 55, number: '91', color: '#DC2626' },
      { position: 'de', x: 75, y: 55, number: '92', color: '#DC2626' },
      { position: 'dt', x: 40, y: 55, number: '95', color: '#059669' },
      { position: 'dt', x: 60, y: 55, number: '96', color: '#059669' },
      { position: 'lb', x: 35, y: 48, number: '54', color: '#2563EB' },
      { position: 'lb', x: 50, y: 48, number: '55', color: '#2563EB' },
      { position: 'lb', x: 65, y: 48, number: '56', color: '#2563EB' },
      { position: 'cb', x: 20, y: 40, number: '24', color: '#7C3AED' },
      { position: 'cb', x: 80, y: 40, number: '25', color: '#7C3AED' },
      { position: 's', x: 35, y: 35, number: '31', color: '#EA580C' },
      { position: 's', x: 65, y: 35, number: '32', color: '#EA580C' }
    ]
  },
  {
    id: '3-4',
    name: '3-4 Defense',
    type: 'defense',
    personnel: '34',
    description: '3 defensive linemen, 4 linebackers, 4 defensive backs',
    difficulty: 'intermediate',
    successRate: 0.71,
    usageCount: 780,
    tags: ['versatile', 'blitz-heavy', 'modern'],
    situations: ['Blitz packages', 'Pass defense', 'Versatile coverage'],
    pros: ['Versatile blitzing', 'Good pass defense', 'Multiple looks'],
    cons: ['Vulnerable to run', 'Complex assignments', 'Gap control issues'],
    players: [
      { position: 'de', x: 30, y: 55, number: '91', color: '#DC2626' },
      { position: 'de', x: 70, y: 55, number: '92', color: '#DC2626' },
      { position: 'dt', x: 50, y: 55, number: '95', color: '#059669' },
      { position: 'lb', x: 25, y: 48, number: '54', color: '#2563EB' },
      { position: 'lb', x: 40, y: 48, number: '55', color: '#2563EB' },
      { position: 'lb', x: 60, y: 48, number: '56', color: '#2563EB' },
      { position: 'lb', x: 75, y: 48, number: '57', color: '#2563EB' },
      { position: 'cb', x: 20, y: 40, number: '24', color: '#7C3AED' },
      { position: 'cb', x: 80, y: 40, number: '25', color: '#7C3AED' },
      { position: 's', x: 35, y: 35, number: '31', color: '#EA580C' },
      { position: 's', x: 65, y: 35, number: '32', color: '#EA580C' }
    ]
  },
  {
    id: 'nickel',
    name: 'Nickel',
    type: 'defense',
    personnel: '42',
    description: '4 DL, 2 LB, 5 DB - extra defensive back for passing',
    difficulty: 'intermediate',
    successRate: 0.73,
    usageCount: 920,
    tags: ['passing', 'modern', 'coverage'],
    situations: ['3rd and long', 'Passing situations', 'Spread offenses'],
    pros: ['Excellent pass coverage', 'Versatile', 'Good against spread'],
    cons: ['Vulnerable to run', 'Limited blitzing', 'Can be outmuscled'],
    players: [
      { position: 'de', x: 25, y: 55, number: '91', color: '#DC2626' },
      { position: 'de', x: 75, y: 55, number: '92', color: '#DC2626' },
      { position: 'dt', x: 40, y: 55, number: '95', color: '#059669' },
      { position: 'dt', x: 60, y: 55, number: '96', color: '#059669' },
      { position: 'lb', x: 35, y: 48, number: '54', color: '#2563EB' },
      { position: 'lb', x: 65, y: 48, number: '56', color: '#2563EB' },
      { position: 'cb', x: 15, y: 40, number: '24', color: '#7C3AED' },
      { position: 'cb', x: 85, y: 40, number: '25', color: '#7C3AED' },
      { position: 'nickel', x: 50, y: 40, number: '21', color: '#F59E0B' },
      { position: 's', x: 30, y: 35, number: '31', color: '#EA580C' },
      { position: 's', x: 70, y: 35, number: '32', color: '#EA580C' }
    ]
  }
];

// Formation Library Component
const FormationLibrary: React.FC<{
  onFormationSelect: (formation: Formation) => void;
  currentType?: 'offense' | 'defense' | 'special';
}> = ({ onFormationSelect, currentType = 'offense' }) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'offense' | 'defense' | 'special'>(currentType);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'success' | 'usage'>('name');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Filter and sort formations
  const filteredFormations = FORMATIONS
    .filter(formation => {
      const matchesType = formation.type === selectedType;
      const matchesSearch = formation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           formation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           formation.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'success':
          return b.successRate - a.successRate;
        case 'usage':
          return b.usageCount - a.usageCount;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleFormationSelect = useCallback((formation: Formation) => {
    onFormationSelect(formation);
    toast({
      title: 'Formation Loaded',
      description: `${formation.name} has been applied to your play`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  }, [onFormationSelect, toast]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 0.75) return 'green';
    if (rate >= 0.65) return 'yellow';
    return 'red';
  };

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" p={4}>
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <HStack spacing={2}>
          <Icon as={BookOpen} color="blue.500" />
          <Text fontWeight="bold" fontSize="lg">Formation Library</Text>
        </HStack>
        <HStack spacing={2}>
          <IconButton
            icon={<Icon as={viewMode === 'grid' ? Grid3X3 : List} />}
            aria-label="Toggle view mode"
            size="sm"
            variant="ghost"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          />
        </HStack>
      </HStack>

      {/* Search and Filters */}
      <VStack spacing={3} mb={4}>
        <InputGroup>
          <InputLeftElement>
            <Icon as={Search} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search formations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="sm"
          />
        </InputGroup>

        <HStack spacing={2} w="full">
          <Button
            size="sm"
            variant={selectedType === 'offense' ? 'solid' : 'outline'}
            colorScheme="blue"
            leftIcon={<Icon as={Play} />}
            onClick={() => setSelectedType('offense')}
          >
            Offense
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'defense' ? 'solid' : 'outline'}
            colorScheme="red"
            leftIcon={<Icon as={Shield} />}
            onClick={() => setSelectedType('defense')}
          >
            Defense
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'special' ? 'solid' : 'outline'}
            colorScheme="purple"
            leftIcon={<Icon as={Star} />}
            onClick={() => setSelectedType('special')}
          >
            Special
          </Button>
        </HStack>
      </VStack>

      {/* Formations Grid/List */}
      {viewMode === 'grid' ? (
        <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={4}>
          {filteredFormations.map((formation) => (
            <Card key={formation.id} variant="outline" size="sm" cursor="pointer" 
                  onClick={() => handleFormationSelect(formation)}
                  _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                  transition="all 0.2s">
              <CardHeader pb={2}>
                <HStack justify="space-between">
                  <Text fontWeight="bold" fontSize="md">{formation.name}</Text>
                  <Badge colorScheme={getDifficultyColor(formation.difficulty)} size="sm">
                    {formation.difficulty}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {formation.description}
                  </Text>
                  
                  <HStack spacing={4} fontSize="xs">
                    <HStack>
                      <Icon as={Users} size={12} />
                      <Text>{formation.personnel}</Text>
                    </HStack>
                    <HStack>
                      <Icon as={TrendingUp} size={12} />
                      <Text>{Math.round(formation.successRate * 100)}%</Text>
                    </HStack>
                    <HStack>
                      <Icon as={Clock} size={12} />
                      <Text>{formation.usageCount}</Text>
                    </HStack>
                  </HStack>

                  <HStack spacing={1} flexWrap="wrap">
                    {formation.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} colorScheme="gray" size="xs">
                        {tag}
                      </Badge>
                    ))}
                    {formation.tags.length > 3 && (
                      <Badge colorScheme="gray" size="xs">+{formation.tags.length - 3}</Badge>
                    )}
                  </HStack>

                  <Button
                    leftIcon={<Icon as={CheckCircle} />}
                    colorScheme="blue"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFormationSelect(formation);
                    }}
                  >
                    Use Formation
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </Grid>
      ) : (
        <VStack spacing={2} align="stretch">
          {filteredFormations.map((formation) => (
            <Card key={formation.id} variant="outline" size="sm">
              <CardBody p={3}>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack>
                      <Text fontWeight="bold">{formation.name}</Text>
                      <Badge colorScheme={getDifficultyColor(formation.difficulty)} size="sm">
                        {formation.difficulty}
                      </Badge>
                      <Badge colorScheme={getSuccessColor(formation.successRate)} size="sm">
                        {Math.round(formation.successRate * 100)}%
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                      {formation.description}
                    </Text>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color="gray.500">{formation.personnel}</Text>
                      <Text fontSize="xs" color="gray.500">•</Text>
                      <Text fontSize="xs" color="gray.500">{formation.usageCount} uses</Text>
                    </HStack>
                  </VStack>
                  <Button
                    leftIcon={<Icon as={CheckCircle} />}
                    colorScheme="blue"
                    size="sm"
                    onClick={() => handleFormationSelect(formation)}
                  >
                    Use
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </VStack>
      )}

      {/* Empty State */}
      {filteredFormations.length === 0 && (
        <Box textAlign="center" py={8}>
          <Icon as={Search} size={48} color="gray.300" mb={4} />
          <Text color="gray.500">No formations found matching your search</Text>
        </Box>
      )}

      {/* Quick Stats */}
      <Box mt={4} p={3} bg="gray.50" borderRadius="md">
        <HStack justify="space-between" fontSize="sm">
          <Text>Showing {filteredFormations.length} formations</Text>
          <Text color="gray.500">
            {selectedType === 'offense' ? 'Offensive' : 
             selectedType === 'defense' ? 'Defensive' : 'Special Teams'} formations
          </Text>
        </HStack>
      </Box>
    </Box>
  );
};

export default FormationLibrary; 