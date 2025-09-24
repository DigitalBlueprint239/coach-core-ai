// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Badge,
  Icon,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  useDisclosure,
} from '@chakra-ui/react';
import { Calendar, Plus, Trophy, MapPin, Clock, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/game/game-service';
import { Game } from '../../types/game';
import GameForm from './GameForm';
import { gameDataService } from '../../services/data/data-service';
import { syncService } from '../../services/data/sync-service';
import { useAuth } from '../../hooks/useAuth';

interface GameCalendarProps {
  teamId: string;
}

const GameCalendar: React.FC<GameCalendarProps> = ({ teamId }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    if (user) {
      loadGames();
      setupSyncStatus();
    }
  }, [teamId, user]);

  const loadGames = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const gamesData = await gameDataService.readMany<Game>('games', {
        where: [{ field: 'teamId', operator: '==', value: user.uid }],
        orderBy: [{ field: 'date', direction: 'asc' }],
      });
      setGames(gamesData);
    } catch (error) {
      console.error('Failed to load games:', error);
      setError('Failed to load games. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSyncStatus = () => {
    const unsubscribe = syncService.onStatusChange((status) => {
      setSyncStatus(status);
    });
    
    return unsubscribe;
  };

  const handleGameCreate = () => {
    setEditingGame(null);
    onOpen();
  };

  const handleGameEdit = (game: Game) => {
    setEditingGame(game);
    onOpen();
  };

  const handleGameDelete = async (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this game?') && user) {
      try {
        await gameDataService.delete('games', gameId);
        await loadGames(); // Reload the list
      } catch (error) {
        console.error('Failed to delete game:', error);
        setError('Failed to delete game. Please try again.');
      }
    }
  };

  const handleGameSave = async (gameData: any) => {
    if (!user) return;
    
    try {
      const gameWithTeamId = {
        ...gameData,
        teamId: user.uid,
        date: new Date(gameData.date),
      };
      
      if (editingGame) {
        // Update existing game
        await gameDataService.update('games', editingGame.id, gameWithTeamId);
      } else {
        // Create new game
        await gameDataService.create('games', gameWithTeamId);
      }
      await loadGames(); // Reload the list
      onClose();
    } catch (error) {
      console.error('Failed to save game:', error);
      setError('Failed to save game. Please try again.');
    }
  };

  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'live': return 'green';
      case 'completed': return 'gray';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatScore = (score: { home: number; away: number }) => {
    return `${score.home} - ${score.away}`;
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Loading games...</Text>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={6}>
        <Heading size="lg">Game Schedule</Heading>
        <Button
          leftIcon={<Plus />}
          colorScheme="blue"
          onClick={handleGameCreate}
        >
          Add Game
        </Button>
      </HStack>

      {/* Sync Status Indicator */}
      {syncStatus && (
        <Alert 
          status={syncStatus.isOnline ? 'success' : 'warning'} 
          mb={4}
          borderRadius="md"
        >
          <AlertIcon />
          <Box>
            <AlertTitle>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </AlertTitle>
            <AlertDescription>
              {syncStatus.isOnline 
                ? syncStatus.isSyncing 
                  ? 'Syncing data...' 
                  : syncStatus.lastSync 
                    ? `Last synced: ${syncStatus.lastSync.toLocaleTimeString()}`
                    : 'Ready to sync'
                : 'Working offline - changes will sync when online'
              }
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {games.length === 0 ? (
        <Card bg={bgColor} border="1px" borderColor={borderColor}>
          <CardBody textAlign="center" py={12}>
            <Icon as={Calendar} boxSize={12} color="gray.400" mb={4} />
            <Text fontSize="lg" color="gray.600" mb={4}>
              No games scheduled
            </Text>
            <Text color="gray.500" mb={6}>
              Start by adding your first game to track your team's schedule
            </Text>
            <Button colorScheme="blue" onClick={handleGameCreate}>
              Schedule Your First Game
            </Button>
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {games.map(game => (
            <Card
              key={game.id}
              bg={bgColor}
              border="1px"
              borderColor={borderColor}
              _hover={{ bg: hoverBg, shadow: 'md' }}
              transition="all 0.2s"
            >
              <CardHeader>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold" fontSize="lg">
                      vs {game.opponent}
                    </Text>
                    <HStack spacing={2}>
                      <Icon as={Calendar} boxSize={4} color="gray.500" />
                      <Text fontSize="sm" color="gray.600">
                        {formatDate(game.date)}
                      </Text>
                    </HStack>
                  </VStack>
                  <Badge colorScheme={getStatusColor(game.status)}>
                    {game.status}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="2xl" fontWeight="bold">
                      {formatScore(game.score)}
                    </Text>
                  </HStack>
                  
                  <HStack spacing={4}>
                    <HStack spacing={1}>
                      <Icon as={MapPin} boxSize={4} color="gray.500" />
                      <Text fontSize="sm" color="gray.600">
                        {game.venue}
                      </Text>
                    </HStack>
                  </HStack>

                  {game.notes && (
                    <Text fontSize="sm" color="gray.600" noOfLines={2}>
                      {game.notes}
                    </Text>
                  )}

                  <HStack spacing={2} justify="flex-end">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Edit />}
                      onClick={() => handleGameEdit(game)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      leftIcon={<Trash2 />}
                      onClick={() => handleGameDelete(game.id)}
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => navigate(`/games/${game.id}`)}
                    >
                      View Details
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <GameForm
        isOpen={isOpen}
        onClose={onClose}
        onSave={handleGameSave}
        game={editingGame}
      />
    </Box>
  );
};

export default GameCalendar;
