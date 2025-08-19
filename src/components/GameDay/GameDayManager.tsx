import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  useColorModeValue,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Progress,
  Grid,
  GridItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Select,
  Input,
  Textarea,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import {
  Trophy,
  Users,
  Clock,
  Target,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  Brain,
  MessageSquare,
  Calendar,
  MapPin,
  Flag,
  Award,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAppStore } from '../../services/state/app-store';
import { dataService, Game, Player } from '../../services/firebase/data-service';
import { enhancedAIService, AICoachingRequest } from '../../services/ai/enhanced-ai-service';
import { LoadingButton, LoadingSpinner, SkeletonCard } from '../ui/LoadingStates';

interface GameDayState {
  currentQuarter: number;
  timeRemaining: number;
  isGameActive: boolean;
  score: { us: number; them: number };
  possession: 'us' | 'them';
  down: number;
  distance: number;
  fieldPosition: number;
  playHistory: PlayRecord[];
  substitutions: SubstitutionRecord[];
  timeouts: { us: number; them: number };
  injuries: InjuryRecord[];
}

interface PlayRecord {
  id: string;
  quarter: number;
  time: string;
  down: number;
  distance: number;
  fieldPosition: number;
  play: string;
  result: string;
  yards: number;
  notes: string;
  timestamp: Date;
}

interface SubstitutionRecord {
  id: string;
  playerIn: string;
  playerOut: string;
  position: string;
  quarter: number;
  time: string;
  reason: string;
  timestamp: Date;
}

interface InjuryRecord {
  id: string;
  playerId: string;
  playerName: string;
  injury: string;
  severity: 'minor' | 'moderate' | 'severe';
  quarter: number;
  time: string;
  action: string;
  timestamp: Date;
}

interface AIPlayCall {
  play: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  risk: 'low' | 'medium' | 'high';
}

const GameDayManager: React.FC = () => {
  const [gameState, setGameState] = useState<GameDayState>({
    currentQuarter: 1,
    timeRemaining: 900, // 15 minutes in seconds
    isGameActive: false,
    score: { us: 0, them: 0 },
    possession: 'us',
    down: 1,
    distance: 10,
    fieldPosition: 20,
    playHistory: [],
    substitutions: [],
    timeouts: { us: 3, them: 3 },
    injuries: [],
  });

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [aiPlayCall, setAiPlayCall] = useState<AIPlayCall | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayCallModal, setShowPlayCallModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [showInjuryModal, setShowInjuryModal] = useState(false);

  const toast = useToast();
  const { currentTeam, currentGame, setCurrentGame } = useAppStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');

  // Load game data
  useEffect(() => {
    if (currentGame) {
      setSelectedGame(currentGame);
      loadGameData(currentGame.id);
    }
  }, [currentGame]);

  // Game timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState.isGameActive && gameState.timeRemaining > 0) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.isGameActive, gameState.timeRemaining]);

  // Load game data
  const loadGameData = async (gameId: string) => {
    try {
      setIsLoading(true);
      const game = await dataService.get<Game>('games', gameId);
      if (game) {
        setSelectedGame(game);
        setGameState(prev => ({
          ...prev,
          score: game.score,
          playHistory: game.playByPlay || [],
        }));
      }

      if (currentTeam) {
        const teamPlayers = await dataService.query<Player>('players', [
          { field: 'teamId', operator: '==', value: currentTeam.id }
        ]);
        setPlayers(teamPlayers);
      }
    } catch (error) {
      console.error('Error loading game data:', error);
      toast({
        title: 'Error loading game data',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Game controls
  const startGame = () => {
    setGameState(prev => ({ ...prev, isGameActive: true }));
    toast({
      title: 'Game Started',
      description: 'The game is now in progress.',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, isGameActive: false }));
    toast({
      title: 'Game Paused',
      description: 'The game has been paused.',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const endQuarter = () => {
    if (gameState.currentQuarter < 4) {
      setGameState(prev => ({
        ...prev,
        currentQuarter: prev.currentQuarter + 1,
        timeRemaining: 900,
        down: 1,
        distance: 10,
        fieldPosition: 20,
      }));
      
      toast({
        title: `Quarter ${gameState.currentQuarter} Ended`,
        description: `Starting Quarter ${gameState.currentQuarter + 1}`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } else {
      endGame();
    }
  };

  const endGame = () => {
    setGameState(prev => ({ ...prev, isGameActive: false }));
    toast({
      title: 'Game Ended',
      description: 'Final score recorded.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // AI Play Calling
  const generateAIPlayCall = async () => {
    if (!currentTeam) return;

    try {
      setIsLoading(true);
      
      const request: AICoachingRequest = {
        query: `Generate a play call for ${gameState.down} and ${gameState.distance} at the ${gameState.fieldPosition} yard line`,
        context: {
          teamId: currentTeam.id,
          ageGroup: currentTeam.ageGroup,
          sport: currentTeam.sport,
          userRole: 'head-coach',
          experience: 'intermediate',
        },
        requestType: 'game-strategy',
        constraints: {
          timeAvailable: 30,
          playerCount: players.length,
        },
      };

      const response = await enhancedAIService.generateCoachingResponse(request);
      
      if (response.success) {
        const playCall: AIPlayCall = {
          play: response.response,
          confidence: response.confidence,
          reasoning: response.suggestions.join(', '),
          alternatives: response.relatedTopics,
          risk: response.implementation.difficulty === 'easy' ? 'low' : 
                response.implementation.difficulty === 'medium' ? 'medium' : 'high',
        };
        
        setAiPlayCall(playCall);
        setShowPlayCallModal(true);
      }
    } catch (error) {
      console.error('Error generating AI play call:', error);
      toast({
        title: 'AI Play Call Failed',
        description: 'Please try again or call a play manually.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Record play
  const recordPlay = (play: string, result: string, yards: number, notes: string = '') => {
    const newPlay: PlayRecord = {
      id: Date.now().toString(),
      quarter: gameState.currentQuarter,
      time: formatTime(gameState.timeRemaining),
      down: gameState.down,
      distance: gameState.distance,
      fieldPosition: gameState.fieldPosition,
      play,
      result,
      yards,
      notes,
      timestamp: new Date(),
    };

    setGameState(prev => ({
      ...prev,
      playHistory: [newPlay, ...prev.playHistory],
      fieldPosition: Math.max(0, Math.min(100, prev.fieldPosition + yards)),
      down: yards >= prev.distance ? 1 : prev.down + 1,
      distance: yards >= prev.distance ? 10 : prev.distance - yards,
    }));

    // Update score if touchdown
    if (result.toLowerCase().includes('touchdown')) {
      setGameState(prev => ({
        ...prev,
        score: { ...prev.score, us: prev.score.us + 6 },
      }));
    }

    toast({
      title: 'Play Recorded',
      description: `${play} - ${result}`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Record substitution
  const recordSubstitution = (playerIn: string, playerOut: string, position: string, reason: string) => {
    const newSub: SubstitutionRecord = {
      id: Date.now().toString(),
      playerIn,
      playerOut,
      position,
      quarter: gameState.currentQuarter,
      time: formatTime(gameState.timeRemaining),
      reason,
      timestamp: new Date(),
    };

    setGameState(prev => ({
      ...prev,
      substitutions: [newSub, ...prev.substitutions],
    }));

    toast({
      title: 'Substitution Recorded',
      description: `${playerIn} in for ${playerOut}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Record injury
  const recordInjury = (playerId: string, playerName: string, injury: string, severity: 'minor' | 'moderate' | 'severe', action: string) => {
    const newInjury: InjuryRecord = {
      id: Date.now().toString(),
      playerId,
      playerName,
      injury,
      severity,
      quarter: gameState.currentQuarter,
      time: formatTime(gameState.timeRemaining),
      action,
      timestamp: new Date(),
    };

    setGameState(prev => ({
      ...prev,
      injuries: [newInjury, ...prev.injuries],
    }));

    toast({
      title: 'Injury Recorded',
      description: `${playerName} - ${injury}`,
      status: 'warning',
      duration: 3000,
      isClosable: true,
    });
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get possession arrow
  const getPossessionArrow = () => {
    return gameState.possession === 'us' ? '→' : '←';
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading game data..." />;
  }

  if (!selectedGame) {
    return (
      <Box p={6}>
        <Text>No game selected. Please select a game to manage.</Text>
      </Box>
    );
  }

  return (
    <Box p={6} bg={bgColor}>
      <VStack spacing={6} align="stretch">
        {/* Game Header */}
        <Card>
          <CardHeader>
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Heading size="lg" color={textColor}>
                  {selectedGame.opponent} vs {currentTeam?.name}
                </Heading>
                <HStack spacing={4}>
                  <Text color="gray.600">
                    <Icon as={Calendar} boxSize={4} mr={2} />
                    {new Date(selectedGame.date).toLocaleDateString()}
                  </Text>
                  <Text color="gray.600">
                    <Icon as={MapPin} boxSize={4} mr={2} />
                    {selectedGame.location}
                  </Text>
                  <Badge colorScheme={selectedGame.homeAway === 'home' ? 'green' : 'blue'}>
                    {selectedGame.homeAway.toUpperCase()}
                  </Badge>
                </HStack>
              </VStack>
              
              <HStack spacing={4}>
                <Button
                  leftIcon={<Play />}
                  colorScheme="green"
                  onClick={startGame}
                  isDisabled={gameState.isGameActive}
                >
                  Start Game
                </Button>
                <Button
                  leftIcon={<Pause />}
                  colorScheme="orange"
                  onClick={pauseGame}
                  isDisabled={!gameState.isGameActive}
                >
                  Pause
                </Button>
                <Button
                  leftIcon={<RotateCcw />}
                  colorScheme="blue"
                  onClick={endQuarter}
                  isDisabled={!gameState.isGameActive}
                >
                  End Quarter
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
        </Card>

        {/* Game Status */}
        <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6}>
          {/* Score and Time */}
          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <HStack spacing={8} justify="center">
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                        {gameState.score.us}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {currentTeam?.name}
                      </Text>
                    </VStack>
                    
                    <VStack>
                      <Text fontSize="4xl" fontWeight="bold" color="red.600">
                        VS
                      </Text>
                    </VStack>
                    
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="red.600">
                        {gameState.score.them}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {selectedGame.opponent}
                      </Text>
                    </VStack>
                  </HStack>
                  
                  <VStack spacing={2}>
                    <Text fontSize="lg" fontWeight="semibold">
                      Quarter {gameState.currentQuarter}
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="purple.600">
                      {formatTime(gameState.timeRemaining)}
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* Game Situation */}
          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontSize="lg" fontWeight="semibold">
                    Game Situation
                  </Text>
                  
                  <HStack spacing={6} justify="center">
                    <VStack>
                      <Text fontSize="sm" color="gray.600">Down</Text>
                      <Text fontSize="2xl" fontWeight="bold">{gameState.down}</Text>
                    </VStack>
                    
                    <VStack>
                      <Text fontSize="sm" color="gray.600">Distance</Text>
                      <Text fontSize="2xl" fontWeight="bold">{gameState.distance}</Text>
                    </VStack>
                    
                    <VStack>
                      <Text fontSize="sm" color="gray.600">Field Position</Text>
                      <Text fontSize="2xl" fontWeight="bold">{gameState.fieldPosition}</Text>
                    </VStack>
                  </HStack>
                  
                  <HStack spacing={4}>
                    <Text fontSize="sm" color="gray.600">Possession:</Text>
                    <Text fontSize="lg" fontWeight="bold" color={gameState.possession === 'us' ? 'blue.600' : 'red.600'}>
                      {getPossessionArrow()} {gameState.possession === 'us' ? currentTeam?.name : selectedGame.opponent}
                    </Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* AI Play Calling */}
          <GridItem>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <HStack spacing={2}>
                    <Icon as={Brain} boxSize={5} color="purple.500" />
                    <Text fontSize="lg" fontWeight="semibold">
                      AI Play Call
                    </Text>
                  </HStack>
                  
                  <Button
                    leftIcon={<Zap />}
                    colorScheme="purple"
                    onClick={generateAIPlayCall}
                    isLoading={isLoading}
                    isFullWidth
                  >
                    Generate Play Call
                  </Button>
                  
                  {aiPlayCall && (
                    <VStack spacing={2} align="stretch">
                      <Text fontSize="sm" fontWeight="medium">
                        Suggested Play: {aiPlayCall.play}
                      </Text>
                      <Badge colorScheme={aiPlayCall.risk === 'low' ? 'green' : aiPlayCall.risk === 'medium' ? 'yellow' : 'red'}>
                        Risk: {aiPlayCall.risk}
                      </Badge>
                    </VStack>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Game Actions */}
        <Card>
          <CardHeader>
            <HStack justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="semibold">
                Game Actions
              </Text>
              <HStack spacing={3}>
                <Button
                  leftIcon={<Users />}
                  variant="outline"
                  onClick={() => setShowSubstitutionModal(true)}
                >
                  Record Substitution
                </Button>
                <Button
                  leftIcon={<Activity />}
                  variant="outline"
                  onClick={() => setShowInjuryModal(true)}
                >
                  Record Injury
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Quick Play Recording */}
              <HStack spacing={4} align="end">
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Play
                  </Text>
                  <Input placeholder="e.g., Run up the middle" />
                </Box>
                
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Result
                  </Text>
                  <Input placeholder="e.g., 3 yard gain" />
                </Box>
                
                <Box w="100px">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Yards
                  </Text>
                  <Input placeholder="0" type="number" />
                </Box>
                
                <Button colorScheme="blue" onClick={() => recordPlay('Run up middle', '3 yard gain', 3)}>
                  Record
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Game History */}
        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold">
              Play by Play
            </Text>
          </CardHeader>
          
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Q</Th>
                    <Th>Time</Th>
                    <Th>Down</Th>
                    <Th>Distance</Th>
                    <Th>Field</Th>
                    <Th>Play</Th>
                    <Th>Result</Th>
                    <Th>Yards</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {gameState.playHistory.map((play) => (
                    <Tr key={play.id}>
                      <Td>{play.quarter}</Td>
                      <Td>{play.time}</Td>
                      <Td>{play.down}</Td>
                      <Td>{play.distance}</Td>
                      <Td>{play.fieldPosition}</Td>
                      <Td>{play.play}</Td>
                      <Td>{play.result}</Td>
                      <Td>{play.yards}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>

      {/* AI Play Call Modal */}
      <Modal isOpen={showPlayCallModal} onClose={() => setShowPlayCallModal(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>AI Play Call</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {aiPlayCall && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="semibold" mb={2}>Suggested Play:</Text>
                  <Text fontSize="lg" p={3} bg="gray.50" borderRadius="md">
                    {aiPlayCall.play}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontWeight="semibold" mb={2}>Reasoning:</Text>
                  <Text>{aiPlayCall.reasoning}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="semibold" mb={2}>Confidence:</Text>
                  <Progress value={aiPlayCall.confidence * 100} colorScheme="blue" />
                  <Text fontSize="sm" mt={1}>
                    {Math.round(aiPlayCall.confidence * 100)}% confident
                  </Text>
                </Box>
                
                <Box>
                  <Text fontWeight="semibold" mb={2}>Risk Level:</Text>
                  <Badge colorScheme={aiPlayCall.risk === 'low' ? 'green' : aiPlayCall.risk === 'medium' ? 'yellow' : 'red'}>
                    {aiPlayCall.risk.toUpperCase()}
                  </Badge>
                </Box>
                
                {aiPlayCall.alternatives.length > 0 && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Alternative Plays:</Text>
                    <VStack spacing={2} align="stretch">
                      {aiPlayCall.alternatives.map((alt, index) => (
                        <Text key={index} fontSize="sm" color="gray.600">
                          • {alt}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => setShowPlayCallModal(false)}>
              Use This Play
            </Button>
            <Button variant="ghost" onClick={() => setShowPlayCallModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Substitution Modal */}
      <Modal isOpen={showSubstitutionModal} onClose={() => setShowSubstitutionModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Substitution</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Player Coming In
                </Text>
                <Select placeholder="Select player">
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName} - {player.position}
                    </option>
                  ))}
                </Select>
              </Box>
              
              <Box w="100%">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Player Going Out
                </Text>
                <Select placeholder="Select player">
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName} - {player.position}
                    </option>
                  ))}
                </Select>
              </Box>
              
              <Box w="100%">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Reason
                </Text>
                <Select placeholder="Select reason">
                  <option value="tired">Tired</option>
                  <option value="injury">Injury</option>
                  <option value="strategy">Strategy</option>
                  <option value="performance">Performance</option>
                </Select>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => setShowSubstitutionModal(false)}>
              Record
            </Button>
            <Button variant="ghost" onClick={() => setShowSubstitutionModal(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Injury Modal */}
      <Modal isOpen={showInjuryModal} onClose={() => setShowInjuryModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Injury</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Player
                </Text>
                <Select placeholder="Select player">
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </Select>
              </Box>
              
              <Box w="100%">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Injury Description
                </Text>
                <Textarea placeholder="Describe the injury..." />
              </Box>
              
              <Box w="100%">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Severity
                </Text>
                <Select placeholder="Select severity">
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </Select>
              </Box>
              
              <Box w="100%">
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Action Taken
                </Text>
                <Textarea placeholder="What action was taken?" />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => setShowInjuryModal(false)}>
              Record
            </Button>
            <Button variant="ghost" onClick={() => setShowInjuryModal(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GameDayManager;
