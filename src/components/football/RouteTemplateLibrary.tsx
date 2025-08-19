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
  Divider,
  Collapse,
  Input,
  InputGroup,
  InputLeftElement,
  Progress,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Target,
  Search,
  BookOpen,
  Filter,
  Grid3X3,
  List as LucideList,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  Shield,
  Users,
  Play,
  Star,
  Lightbulb
} from 'lucide-react';

// Types
interface RouteTemplate {
  id: string;
  name: string;
  category: 'passing' | 'running' | 'motion' | 'blocking' | 'special';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  successRate: number;
  usageCount: number;
  tags: string[];
  situations: string[];
  routes: RouteDefinition[];
  pros: string[];
  cons: string[];
  estimatedYards: number;
  timeToExecute: number;
}

interface RouteDefinition {
  playerPosition: string;
  routeName: string;
  routeType: string;
  points: Point[];
  color: string;
  description: string;
}

interface Point {
  x: number;
  y: number;
}

// Route Template Data
const ROUTE_TEMPLATES: RouteTemplate[] = [
  // Passing Routes
  {
    id: 'slant-flat',
    name: 'Slant-Flat Combination',
    category: 'passing',
    difficulty: 'beginner',
    description: 'Quick slant route with flat route for high-percentage completion',
    successRate: 0.78,
    usageCount: 850,
    tags: ['quick', 'high-percentage', 'zone-beater'],
    situations: ['2nd and medium', '3rd and short', 'zone coverage'],
    estimatedYards: 8,
    timeToExecute: 2.5,
    pros: ['High completion rate', 'Quick developing', 'Good vs zone'],
    cons: ['Limited yards after catch', 'Can be defended by man', 'Predictable'],
    routes: [
      {
        playerPosition: 'wr',
        routeName: 'Slant',
        routeType: 'slant',
        points: [{ x: 20, y: 20 }, { x: 35, y: 35 }, { x: 50, y: 35 }],
        color: '#3B82F6',
        description: 'Quick slant route to the middle'
      },
      {
        playerPosition: 'wr',
        routeName: 'Flat',
        routeType: 'flat',
        points: [{ x: 80, y: 20 }, { x: 85, y: 20 }, { x: 85, y: 35 }],
        color: '#10B981',
        description: 'Flat route to the sideline'
      }
    ]
  },
  {
    id: 'curl-flat',
    name: 'Curl-Flat Combination',
    category: 'passing',
    difficulty: 'beginner',
    description: 'Curl route with flat route to create spacing',
    successRate: 0.75,
    usageCount: 720,
    tags: ['spacing', 'zone-beater', 'intermediate'],
    situations: ['2nd and medium', 'Zone coverage', 'Intermediate passing'],
    estimatedYards: 12,
    timeToExecute: 3.0,
    pros: ['Good spacing', 'Multiple options', 'Zone beater'],
    cons: ['Can be defended by man', 'Timing sensitive', 'Limited deep threat'],
    routes: [
      {
        playerPosition: 'wr',
        routeName: 'Curl',
        routeType: 'curl',
        points: [{ x: 20, y: 20 }, { x: 25, y: 25 }, { x: 20, y: 35 }],
        color: '#F59E0B',
        description: 'Curl route back to the quarterback'
      },
      {
        playerPosition: 'wr',
        routeName: 'Flat',
        routeType: 'flat',
        points: [{ x: 80, y: 20 }, { x: 85, y: 20 }, { x: 85, y: 35 }],
        color: '#10B981',
        description: 'Flat route to the sideline'
      }
    ]
  },
  {
    id: 'four-verticals',
    name: 'Four Verticals',
    category: 'passing',
    difficulty: 'intermediate',
    description: 'Four receivers run vertical routes to stretch the defense',
    successRate: 0.65,
    usageCount: 450,
    tags: ['vertical', 'stretch', 'deep-threat'],
    situations: ['3rd and long', '2-minute drill', 'Deep passing'],
    estimatedYards: 15,
    timeToExecute: 3.8,
    pros: ['Stretches defense', 'Deep threat', 'Forces single coverage'],
    cons: ['Low completion rate', 'Long developing', 'Vulnerable to pressure'],
    routes: [
      {
        playerPosition: 'wr',
        routeName: 'Go',
        routeType: 'go',
        points: [{ x: 15, y: 20 }, { x: 15, y: 10 }],
        color: '#EF4444',
        description: 'Vertical route down the sideline'
      },
      {
        playerPosition: 'wr',
        routeName: 'Go',
        routeType: 'go',
        points: [{ x: 85, y: 20 }, { x: 85, y: 10 }],
        color: '#EF4444',
        description: 'Vertical route down the sideline'
      },
      {
        playerPosition: 'wr',
        routeName: 'Go',
        routeType: 'go',
        points: [{ x: 35, y: 20 }, { x: 35, y: 10 }],
        color: '#EF4444',
        description: 'Vertical route up the seam'
      },
      {
        playerPosition: 'te',
        routeName: 'Go',
        routeType: 'go',
        points: [{ x: 65, y: 20 }, { x: 65, y: 10 }],
        color: '#EF4444',
        description: 'Vertical route up the seam'
      }
    ]
  },
  {
    id: 'mesh-concept',
    name: 'Mesh Concept',
    category: 'passing',
    difficulty: 'intermediate',
    description: 'Two crossing routes create natural pick plays',
    successRate: 0.71,
    usageCount: 380,
    tags: ['crossing', 'man-beater', 'separation'],
    situations: ['Man coverage', 'Intermediate passing', 'Creating separation'],
    estimatedYards: 12,
    timeToExecute: 3.2,
    pros: ['Creates separation', 'Good vs man', 'Multiple options'],
    cons: ['Can be illegal', 'Timing sensitive', 'Complex reads'],
    routes: [
      {
        playerPosition: 'wr',
        routeName: 'Cross',
        routeType: 'cross',
        points: [{ x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 }],
        color: '#8B5CF6',
        description: 'Crossing route from left to right'
      },
      {
        playerPosition: 'wr',
        routeName: 'Cross',
        routeType: 'cross',
        points: [{ x: 80, y: 20 }, { x: 50, y: 20 }, { x: 20, y: 20 }],
        color: '#EC4899',
        description: 'Crossing route from right to left'
      }
    ]
  },
  {
    id: 'post-corner',
    name: 'Post-Corner',
    category: 'passing',
    difficulty: 'advanced',
    description: 'Post route with corner route for deep threat',
    successRate: 0.58,
    usageCount: 220,
    tags: ['deep-threat', 'advanced', 'double-move'],
    situations: ['3rd and long', 'Deep passing', 'Cover 2 beater'],
    estimatedYards: 20,
    timeToExecute: 4.2,
    pros: ['Deep threat', 'Double move', 'Cover 2 beater'],
    cons: ['Low completion rate', 'Long developing', 'Complex timing'],
    routes: [
      {
        playerPosition: 'wr',
        routeName: 'Post',
        routeType: 'post',
        points: [{ x: 20, y: 20 }, { x: 30, y: 30 }, { x: 40, y: 15 }],
        color: '#06B6D4',
        description: 'Post route to the middle'
      },
      {
        playerPosition: 'wr',
        routeName: 'Corner',
        routeType: 'corner',
        points: [{ x: 80, y: 20 }, { x: 85, y: 25 }, { x: 85, y: 15 }],
        color: '#F97316',
        description: 'Corner route to the back corner'
      }
    ]
  },

  // Running Routes
  {
    id: 'power-run',
    name: 'Power Run',
    category: 'running',
    difficulty: 'beginner',
    description: 'Traditional power run with pulling guard',
    successRate: 0.68,
    usageCount: 950,
    tags: ['power', 'traditional', 'short-yardage'],
    situations: ['1st and 10', 'Goal line', 'Short yardage'],
    estimatedYards: 4,
    timeToExecute: 2.8,
    pros: ['High success rate', 'Power blocking', 'Good for short yardage'],
    cons: ['Predictable', 'Limited big play potential', 'Requires good blocking'],
    routes: [
      {
        playerPosition: 'rb',
        routeName: 'Power',
        routeType: 'power',
        points: [{ x: 50, y: 35 }, { x: 60, y: 35 }, { x: 70, y: 35 }],
        color: '#059669',
        description: 'Power run to the right side'
      },
      {
        playerPosition: 'g',
        routeName: 'Pull',
        routeType: 'pull',
        points: [{ x: 40, y: 55 }, { x: 60, y: 55 }, { x: 65, y: 45 }],
        color: '#6B7280',
        description: 'Pulling guard for power blocking'
      }
    ]
  },
  {
    id: 'sweep',
    name: 'Sweep',
    category: 'running',
    difficulty: 'intermediate',
    description: 'Outside run with multiple blockers',
    successRate: 0.62,
    usageCount: 420,
    tags: ['outside', 'speed', 'multiple-blockers'],
    situations: ['Outside run', 'Speed play', 'Multiple blockers'],
    estimatedYards: 6,
    timeToExecute: 3.5,
    pros: ['Speed play', 'Multiple blockers', 'Outside threat'],
    cons: ['Can be strung out', 'Requires good blocking', 'Vulnerable to pursuit'],
    routes: [
      {
        playerPosition: 'rb',
        routeName: 'Sweep',
        routeType: 'sweep',
        points: [{ x: 50, y: 35 }, { x: 70, y: 35 }, { x: 85, y: 35 }],
        color: '#059669',
        description: 'Sweep run to the outside'
      },
      {
        playerPosition: 'wr',
        routeName: 'Block',
        routeType: 'block',
        points: [{ x: 15, y: 45 }, { x: 20, y: 40 }, { x: 25, y: 35 }],
        color: '#2563EB',
        description: 'Blocking route for the sweep'
      }
    ]
  },

  // Motion Routes
  {
    id: 'jet-sweep',
    name: 'Jet Sweep',
    category: 'motion',
    difficulty: 'intermediate',
    description: 'Quick sweep with motion before snap',
    successRate: 0.64,
    usageCount: 280,
    tags: ['motion', 'speed', 'trick-play'],
    situations: ['Trick play', 'Speed play', 'Motion offense'],
    estimatedYards: 8,
    timeToExecute: 2.2,
    pros: ['Quick developing', 'Speed play', 'Trick element'],
    cons: ['Can be defended', 'Timing sensitive', 'Limited options'],
    routes: [
      {
        playerPosition: 'wr',
        routeName: 'Jet Motion',
        routeType: 'motion',
        points: [{ x: 15, y: 45 }, { x: 50, y: 45 }, { x: 85, y: 45 }],
        color: '#F59E0B',
        description: 'Jet motion across the formation'
      },
      {
        playerPosition: 'wr',
        routeName: 'Sweep',
        routeType: 'sweep',
        points: [{ x: 85, y: 45 }, { x: 85, y: 35 }, { x: 85, y: 25 }],
        color: '#059669',
        description: 'Sweep run after motion'
      }
    ]
  }
];

// Route Template Library Component
const RouteTemplateLibrary: React.FC<{
  onTemplateSelect: (template: RouteTemplate) => void;
  currentCategory?: string;
}> = ({ onTemplateSelect, currentCategory = 'passing' }) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'success' | 'usage'>('name');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Filter and sort templates
  const filteredTemplates = ROUTE_TEMPLATES
    .filter(template => {
      const matchesCategory = template.category === selectedCategory;
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
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

  const handleTemplateSelect = useCallback((template: RouteTemplate) => {
    onTemplateSelect(template);
    toast({
      title: 'Route Template Applied',
      description: `${template.name} has been added to your play`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  }, [onTemplateSelect, toast]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'passing': return 'blue';
      case 'running': return 'green';
      case 'motion': return 'purple';
      case 'blocking': return 'orange';
      case 'special': return 'pink';
      default: return 'gray';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'passing': return ArrowUp;
      case 'running': return ArrowRight;
      case 'motion': return Play;
      case 'blocking': return Shield;
      case 'special': return Star;
      default: return Target;
    }
  };

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" p={4}>
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <HStack spacing={2}>
          <Icon as={BookOpen} color="blue.500" />
          <Text fontWeight="bold" fontSize="lg">Route Template Library</Text>
        </HStack>
        <HStack spacing={2}>
          <IconButton
                            icon={<Icon as={viewMode === 'grid' ? Grid3X3 : LucideList} />}
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
            placeholder="Search route templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="sm"
          />
        </InputGroup>

        <HStack spacing={2} w="full" flexWrap="wrap">
          {['passing', 'running', 'motion', 'blocking', 'special'].map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'solid' : 'outline'}
              colorScheme={getCategoryColor(category)}
              leftIcon={<Icon as={getCategoryIcon(category)} />}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </HStack>
      </VStack>

      {/* Templates Grid/List */}
      {viewMode === 'grid' ? (
        <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
          {filteredTemplates.map((template) => (
            <Card key={template.id} variant="outline" size="sm" cursor="pointer" 
                  onClick={() => handleTemplateSelect(template)}
                  _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                  transition="all 0.2s">
              <CardHeader pb={2}>
                <HStack justify="space-between">
                  <Text fontWeight="bold" fontSize="md">{template.name}</Text>
                  <Badge colorScheme={getDifficultyColor(template.difficulty)} size="sm">
                    {template.difficulty}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {template.description}
                  </Text>
                  
                  <HStack spacing={4} fontSize="xs">
                    <HStack>
                      <Icon as={Users} size={12} />
                      <Text>{template.routes.length} routes</Text>
                    </HStack>
                    <HStack>
                      <Icon as={TrendingUp} size={12} />
                      <Text>{Math.round(template.successRate * 100)}%</Text>
                    </HStack>
                    <HStack>
                      <Icon as={ArrowRight} size={12} />
                      <Text>{template.estimatedYards} yards</Text>
                    </HStack>
                    <HStack>
                      <Icon as={Clock} size={12} />
                      <Text>{template.timeToExecute}s</Text>
                    </HStack>
                  </HStack>

                  <Progress
                    value={template.successRate * 100}
                    colorScheme="green"
                    size="sm"
                  />

                  <HStack spacing={1} flexWrap="wrap">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} colorScheme="gray" size="xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge colorScheme="gray" size="xs">+{template.tags.length - 3}</Badge>
                    )}
                  </HStack>

                  <Button
                    leftIcon={<Icon as={CheckCircle} />}
                    colorScheme="blue"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateSelect(template);
                    }}
                  >
                    Apply Template
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </Grid>
      ) : (
        <VStack spacing={2} align="stretch">
          {filteredTemplates.map((template) => (
            <Card key={template.id} variant="outline" size="sm">
              <CardBody p={3}>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack>
                      <Text fontWeight="bold">{template.name}</Text>
                      <Badge colorScheme={getDifficultyColor(template.difficulty)} size="sm">
                        {template.difficulty}
                      </Badge>
                      <Badge colorScheme={getCategoryColor(template.category)} size="sm">
                        {template.category}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                      {template.description}
                    </Text>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color="gray.500">{template.routes.length} routes</Text>
                      <Text fontSize="xs" color="gray.500">•</Text>
                      <Text fontSize="xs" color="gray.500">{Math.round(template.successRate * 100)}% success</Text>
                      <Text fontSize="xs" color="gray.500">•</Text>
                      <Text fontSize="xs" color="gray.500">{template.estimatedYards} yards</Text>
                    </HStack>
                  </VStack>
                  <Button
                    leftIcon={<Icon as={CheckCircle} />}
                    colorScheme="blue"
                    size="sm"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    Apply
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </VStack>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Box textAlign="center" py={8}>
          <Icon as={Search} size={48} color="gray.300" mb={4} />
          <Text color="gray.500">No route templates found matching your search</Text>
        </Box>
      )}

      {/* Quick Stats */}
      <Box mt={4} p={3} bg="gray.50" borderRadius="md">
        <HStack justify="space-between" fontSize="sm">
          <Text>Showing {filteredTemplates.length} templates</Text>
          <Text color="gray.500">
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} routes
          </Text>
        </HStack>
      </Box>
    </Box>
  );
};

export default RouteTemplateLibrary; 