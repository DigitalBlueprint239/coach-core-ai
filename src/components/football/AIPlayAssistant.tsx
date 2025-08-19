import React, { useState, useCallback, useEffect } from 'react';
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
  Progress,
  Spinner,
  Collapse,
  Divider,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import {
  Brain,
  Zap,
  Target,
  TrendingUp,
  Lightbulb,
  Star,
  Clock,
  Users,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

// Types
interface PlaySuggestion {
  id: string;
  name: string;
  formation: string;
  description: string;
  confidence: number;
  reasoning: string;
  successRate: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  estimatedYards: number;
  timeToExecute: number;
}

interface RouteOptimization {
  playerId: string;
  originalRoute: any[];
  optimizedRoute: any[];
  improvement: number;
  reasoning: string;
}

interface DefenseAnalysis {
  formation: string;
  weaknesses: string[];
  strengths: string[];
  recommendations: string[];
  blitzProbability: number;
  coverageType: string;
}

interface GameContext {
  down: number;
  distance: number;
  fieldPosition: number;
  timeRemaining: number;
  score: { home: number; away: number };
  timeouts: { home: number; away: number };
}

// Mock AI Service
class AIPlayService {
  private static instance: AIPlayService;
  
  static getInstance(): AIPlayService {
    if (!AIPlayService.instance) {
      AIPlayService.instance = new AIPlayService();
    }
    return AIPlayService.instance;
  }

  async suggestPlays(context: GameContext): Promise<PlaySuggestion[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const suggestions: PlaySuggestion[] = [
      {
        id: 'suggestion-1',
        name: 'Slant-Flat Combination',
        formation: 'Shotgun Spread',
        description: 'Quick slant route with flat route for high-percentage completion',
        confidence: 0.85,
        reasoning: 'High success rate on 2nd and medium, exploits zone coverage',
        successRate: 0.78,
        difficulty: 'beginner',
        tags: ['quick', 'high-percentage', 'zone-beater'],
        estimatedYards: 8,
        timeToExecute: 2.5
      },
      {
        id: 'suggestion-2',
        name: 'Four Verticals',
        formation: 'Shotgun Empty',
        description: 'Four receivers run vertical routes to stretch the defense',
        confidence: 0.72,
        reasoning: 'Good for 3rd and long, forces single coverage',
        successRate: 0.65,
        difficulty: 'intermediate',
        tags: ['vertical', 'stretch', 'deep-threat'],
        estimatedYards: 15,
        timeToExecute: 3.8
      },
      {
        id: 'suggestion-3',
        name: 'Mesh Concept',
        formation: 'Trips Right',
        description: 'Two crossing routes create natural pick plays',
        confidence: 0.68,
        reasoning: 'Effective against man coverage, creates separation',
        successRate: 0.71,
        difficulty: 'intermediate',
        tags: ['crossing', 'man-beater', 'separation'],
        estimatedYards: 12,
        timeToExecute: 3.2
      }
    ];

    // Filter based on context
    return suggestions.filter(s => {
      if (context.distance > 8 && s.estimatedYards < 10) return false;
      if (context.timeRemaining < 120 && s.timeToExecute > 3) return false;
      return true;
    });
  }

  async optimizeRoutes(currentPlay: any): Promise<RouteOptimization[]> {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    return [
      {
        playerId: 'player-1',
        originalRoute: [{ x: 50, y: 50 }, { x: 60, y: 60 }],
        optimizedRoute: [{ x: 50, y: 50 }, { x: 55, y: 55 }, { x: 60, y: 60 }],
        improvement: 0.15,
        reasoning: 'Added intermediate point for smoother route and better timing'
      }
    ];
  }

  async analyzeDefense(offensivePlay: any): Promise<DefenseAnalysis> {
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1000));
    
    return {
      formation: '4-3 Cover 2',
      weaknesses: [
        'Vulnerable to deep middle routes',
        'Linebackers can be isolated in coverage',
        'Safety rotation creates opportunities'
      ],
      strengths: [
        'Strong run defense',
        'Good pass rush from edges',
        'Solid underneath coverage'
      ],
      recommendations: [
        'Attack the deep middle seam',
        'Use motion to create mismatches',
        'Target linebackers in coverage'
      ],
      blitzProbability: 0.35,
      coverageType: 'Cover 2 Zone'
    };
  }

  async generatePlayName(play: any): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    const names = [
      'Thunder Bolt',
      'Lightning Strike',
      'Golden Arrow',
      'Silver Bullet',
      'Dragon Fire',
      'Phoenix Rise',
      'Eagle Eye',
      'Tiger Claw'
    ];
    
    return names[Math.floor(Math.random() * names.length)];
  }
}

// AI Assistant Component
const AIPlayAssistant: React.FC<{
  currentPlay: any;
  gameContext: GameContext;
  onSuggestionSelect: (suggestion: PlaySuggestion) => void;
  onRouteOptimization: (optimizations: RouteOptimization[]) => void;
}> = ({ currentPlay, gameContext, onSuggestionSelect, onRouteOptimization }) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaySuggestion[]>([]);
  const [defenseAnalysis, setDefenseAnalysis] = useState<DefenseAnalysis | null>(null);
  const [routeOptimizations, setRouteOptimizations] = useState<RouteOptimization[]>([]);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'analysis' | 'optimization'>('suggestions');
  const [showDetails, setShowDetails] = useState(false);

  const aiService = AIPlayService.getInstance();

  const generateSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const newSuggestions = await aiService.suggestPlays(gameContext);
      setSuggestions(newSuggestions);
      toast({
        title: 'AI Suggestions Generated',
        description: `Found ${newSuggestions.length} optimal plays for this situation`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'AI Service Error',
        description: 'Failed to generate suggestions. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [gameContext, toast]);

  const analyzeDefense = useCallback(async () => {
    if (!currentPlay) return;
    
    setIsLoading(true);
    try {
      const analysis = await aiService.analyzeDefense(currentPlay);
      setDefenseAnalysis(analysis);
      toast({
        title: 'Defense Analysis Complete',
        description: 'AI has analyzed the defensive formation and tendencies',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze defense. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPlay, toast]);

  const optimizeRoutes = useCallback(async () => {
    if (!currentPlay || currentPlay.routes.length === 0) {
      toast({
        title: 'No Routes to Optimize',
        description: 'Add some routes to your play first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const optimizations = await aiService.optimizeRoutes(currentPlay);
      setRouteOptimizations(optimizations);
      onRouteOptimization(optimizations);
      toast({
        title: 'Routes Optimized',
        description: `AI optimized ${optimizations.length} routes for better performance`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Optimization Failed',
        description: 'Could not optimize routes. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPlay, onRouteOptimization, toast]);

  const generatePlayName = useCallback(async () => {
    if (!currentPlay) return;
    
    try {
      const name = await aiService.generatePlayName(currentPlay);
      toast({
        title: 'Play Name Generated',
        description: `AI suggests: "${name}"`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Name Generation Failed',
        description: 'Could not generate play name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [currentPlay, toast]);

  useEffect(() => {
    // Auto-generate suggestions when game context changes
    if (gameContext.down > 0) {
      generateSuggestions();
    }
  }, [gameContext.down, gameContext.distance, generateSuggestions]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'yellow';
    return 'red';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'yellow';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" p={4}>
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <HStack spacing={2}>
          <Icon as={Brain} color="blue.500" />
          <Text fontWeight="bold" fontSize="lg">AI Play Assistant</Text>
        </HStack>
        <IconButton
          icon={<Icon as={showDetails ? ChevronUp : ChevronDown} />}
          aria-label="Toggle details"
          size="sm"
          variant="ghost"
          onClick={() => setShowDetails(!showDetails)}
        />
      </HStack>

      {/* Quick Actions */}
      <HStack spacing={2} mb={4}>
        <Button
          leftIcon={<Icon as={Zap} />}
          colorScheme="blue"
          size="sm"
          onClick={generateSuggestions}
          isLoading={isLoading && activeTab === 'suggestions'}
          loadingText="Analyzing..."
        >
          Get Suggestions
        </Button>
        <Button
          leftIcon={<Icon as={Target} />}
          colorScheme="purple"
          size="sm"
          onClick={analyzeDefense}
          isLoading={isLoading && activeTab === 'analysis'}
          loadingText="Analyzing..."
        >
          Analyze Defense
        </Button>
        <Button
          leftIcon={<Icon as={TrendingUp} />}
          colorScheme="green"
          size="sm"
          onClick={optimizeRoutes}
          isLoading={isLoading && activeTab === 'optimization'}
          loadingText="Optimizing..."
        >
          Optimize Routes
        </Button>
      </HStack>

      <Collapse in={showDetails}>
        <Divider mb={4} />
        
        {/* Tab Navigation */}
        <HStack spacing={1} mb={4}>
          <Button
            size="sm"
            variant={activeTab === 'suggestions' ? 'solid' : 'ghost'}
            colorScheme="blue"
            onClick={() => setActiveTab('suggestions')}
          >
            Suggestions
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'analysis' ? 'solid' : 'ghost'}
            colorScheme="purple"
            onClick={() => setActiveTab('analysis')}
          >
            Defense
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'optimization' ? 'solid' : 'ghost'}
            colorScheme="green"
            onClick={() => setActiveTab('optimization')}
          >
            Optimization
          </Button>
        </HStack>

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <VStack spacing={3} align="stretch">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} variant="outline" size="sm">
                <CardHeader pb={2}>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">{suggestion.name}</Text>
                    <Badge colorScheme={getConfidenceColor(suggestion.confidence)}>
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={2} align="stretch">
                    <Text fontSize="sm" color="gray.600">
                      {suggestion.description}
                    </Text>
                    
                    <HStack spacing={4} fontSize="xs">
                      <HStack>
                        <Icon as={Users} size={12} />
                        <Text>{suggestion.formation}</Text>
                      </HStack>
                      <HStack>
                        <Icon as={ArrowRight} size={12} />
                        <Text>{suggestion.estimatedYards} yards</Text>
                      </HStack>
                      <HStack>
                        <Icon as={Clock} size={12} />
                        <Text>{suggestion.timeToExecute}s</Text>
                      </HStack>
                    </HStack>

                    <HStack spacing={2}>
                      <Badge colorScheme={getDifficultyColor(suggestion.difficulty)} size="sm">
                        {suggestion.difficulty}
                      </Badge>
                      {suggestion.tags.map((tag, index) => (
                        <Badge key={index} colorScheme="gray" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </HStack>

                    <Progress
                      value={suggestion.successRate * 100}
                      colorScheme="green"
                      size="sm"
                    />
                    <Text fontSize="xs" color="gray.500">
                      Success Rate: {Math.round(suggestion.successRate * 100)}%
                    </Text>

                    <Button
                      leftIcon={<Icon as={CheckCircle} />}
                      colorScheme="blue"
                      size="sm"
                      onClick={() => onSuggestionSelect(suggestion)}
                    >
                      Use This Play
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}

        {/* Defense Analysis Tab */}
        {activeTab === 'analysis' && defenseAnalysis && (
          <VStack spacing={4} align="stretch">
            <Card variant="outline" size="sm">
              <CardHeader pb={2}>
                <Text fontWeight="bold">Defensive Formation: {defenseAnalysis.formation}</Text>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <Box>
                    <Text fontWeight="medium" fontSize="sm" mb={2}>Weaknesses</Text>
                    <List spacing={1}>
                      {defenseAnalysis.weaknesses.map((weakness, index) => (
                        <ListItem key={index} fontSize="sm">
                          <ListIcon as={AlertCircle} color="red.500" />
                          {weakness}
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Box>
                    <Text fontWeight="medium" fontSize="sm" mb={2}>Strengths</Text>
                    <List spacing={1}>
                      {defenseAnalysis.strengths.map((strength, index) => (
                        <ListItem key={index} fontSize="sm">
                          <ListIcon as={CheckCircle} color="green.500" />
                          {strength}
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Box>
                    <Text fontWeight="medium" fontSize="sm" mb={2}>Recommendations</Text>
                    <List spacing={1}>
                      {defenseAnalysis.recommendations.map((rec, index) => (
                        <ListItem key={index} fontSize="sm">
                          <ListIcon as={Lightbulb} color="yellow.500" />
                          {rec}
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <HStack justify="space-between">
                    <Text fontSize="sm">Blitz Probability:</Text>
                    <Badge colorScheme="orange">{Math.round(defenseAnalysis.blitzProbability * 100)}%</Badge>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        )}

        {/* Route Optimization Tab */}
        {activeTab === 'optimization' && (
          <VStack spacing={3} align="stretch">
            {routeOptimizations.map((optimization, index) => (
              <Card key={index} variant="outline" size="sm">
                <CardHeader pb={2}>
                  <Text fontWeight="bold">Route Optimization</Text>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm">Player {optimization.playerId}</Text>
                      <Badge colorScheme="green">
                        +{Math.round(optimization.improvement * 100)}% improvement
                      </Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color="gray.600">
                      {optimization.reasoning}
                    </Text>

                    <Button
                      leftIcon={<Icon as={TrendingUp} />}
                      colorScheme="green"
                      size="sm"
                    >
                      Apply Optimization
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </Collapse>

      {/* Quick Tips */}
      <Box mt={4} p={3} bg="blue.50" borderRadius="md">
        <HStack spacing={2} mb={2}>
          <Icon as={Info} color="blue.500" />
          <Text fontWeight="medium" fontSize="sm">AI Tips</Text>
        </HStack>
        <Text fontSize="xs" color="gray.600">
          • AI analyzes game situation, field position, and defensive tendencies
          • Suggestions are ranked by confidence and success probability
          • Route optimizations improve timing and spacing
          • Defense analysis reveals coverage weaknesses and blitz tendencies
        </Text>
      </Box>
    </Box>
  );
};

export default AIPlayAssistant; 