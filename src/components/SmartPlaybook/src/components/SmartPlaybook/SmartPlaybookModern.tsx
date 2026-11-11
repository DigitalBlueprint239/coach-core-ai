import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  IconButton,
  Badge,
  useToast,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Divider,
  Spinner,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiSave, 
  FiFolder, 
  FiSettings, 
  FiRotateCcw, 
  FiRotateCw,
  FiTrash2,
  FiUsers,
  FiMap,
  FiPlay,
  FiPause,
  FiSquare
} from 'react-icons/fi';

interface Player {
  id: string;
  x: number;
  y: number;
  number: string;
  position: string;
  color: string;
  selected: boolean;
}

interface Route {
  id: string;
  playerId: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  type: string;
}

interface Play {
  id: string;
  name: string;
  players: Player[];
  routes: Route[];
  formation: string;
  phase: string;
  type: string;
  createdAt: Date;
}

const SmartPlaybookModern: React.FC = () => {
  // Core state
  const [players, setPlayers] = useState<Player[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'player' | 'route' | 'delete'>('view');
  const [savedPlays, setSavedPlays] = useState<Play[]>([]);
  const [currentPlayName, setCurrentPlayName] = useState('');
  const [currentPlayPhase, setCurrentPlayPhase] = useState('offense');
  const [currentPlayType, setCurrentPlayType] = useState('pass');
  const [isPlaying, setIsPlaying] = useState(false);

  // UI state
  const { isOpen: isLibraryOpen, onOpen: onLibraryOpen, onClose: onLibraryClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load saved plays from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smartPlaybook_plays');
      if (saved) {
        setSavedPlays(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved plays:', error);
    }
  }, []);

  // Save plays to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('smartPlaybook_plays', JSON.stringify(savedPlays));
    } catch (error) {
      console.error('Error saving plays:', error);
    }
  }, [savedPlays]);

  const addPlayer = useCallback((x: number, y: number) => {
    const newPlayer: Player = {
      id: `player_${Date.now()}`,
      x,
      y,
      number: `${players.length + 1}`,
      position: 'QB',
      color: '#3B82F6',
      selected: false,
    };
    setPlayers(prev => [...prev, newPlayer]);
    toast({
      title: 'Player Added',
      description: `Player ${newPlayer.number} added to the field`,
      status: 'success',
      duration: 2000,
    });
  }, [players.length, toast]);

  const removePlayer = useCallback((playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    setRoutes(prev => prev.filter(r => r.playerId !== playerId));
    toast({
      title: 'Player Removed',
      description: 'Player has been removed from the field',
      status: 'info',
      duration: 2000,
    });
  }, [toast]);

  const savePlay = useCallback(() => {
    if (!currentPlayName.trim()) {
      toast({
        title: 'Play Name Required',
        description: 'Please enter a name for this play',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    const newPlay: Play = {
      id: `play_${Date.now()}`,
      name: currentPlayName,
      players: [...players],
      routes: [...routes],
      formation: 'custom',
      phase: currentPlayPhase,
      type: currentPlayType,
      createdAt: new Date(),
    };

    setSavedPlays(prev => [newPlay, ...prev]);
    setCurrentPlayName('');
    toast({
      title: 'Play Saved',
      description: `${newPlay.name} has been saved to your library`,
      status: 'success',
      duration: 3000,
    });
  }, [currentPlayName, players, routes, currentPlayPhase, currentPlayType, toast]);

  const loadPlay = useCallback((play: Play) => {
    setPlayers(play.players);
    setRoutes(play.routes);
    setCurrentPlayPhase(play.phase);
    setCurrentPlayType(play.type);
    onLibraryClose();
    toast({
      title: 'Play Loaded',
      description: `${play.name} has been loaded`,
      status: 'success',
      duration: 2000,
    });
  }, [onLibraryClose, toast]);

  const clearField = useCallback(() => {
    setPlayers([]);
    setRoutes([]);
    setSelectedPlayerId(null);
    setSelectedRouteId(null);
    toast({
      title: 'Field Cleared',
      description: 'All players and routes have been removed',
      status: 'info',
      duration: 2000,
    });
  }, [toast]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (mode === 'player') {
      addPlayer(x, y);
    }
  }, [mode, addPlayer]);

  return (
    <Container maxW="full" p={0}>
      <VStack spacing={0} align="stretch" h="100vh">
        {/* Header */}
        <Box bg="white" borderBottom="1px" borderColor="gray.200" p={4}>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="lg" color="brand.600">Smart Playbook</Heading>
              <Text fontSize="sm" color="gray.600">
                {mode === 'view' && 'View Mode'}
                {mode === 'player' && 'Add Players'}
                {mode === 'route' && 'Draw Routes'}
                {mode === 'delete' && 'Delete Mode'}
              </Text>
            </VStack>
            
            <HStack spacing={2}>
              <Badge colorScheme="blue" variant="subtle">
                {players.length} Players
              </Badge>
              <Badge colorScheme="green" variant="subtle">
                {routes.length} Routes
              </Badge>
            </HStack>
          </HStack>
        </Box>

        <HStack spacing={0} flex={1} align="stretch">
          {/* Main Canvas Area */}
          <Box flex={1} bg="gray.50" position="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{
                width: '100%',
                height: '100%',
                cursor: mode === 'player' ? 'crosshair' : 'default',
                backgroundColor: '#2d5016', // Football field green
              }}
              onClick={handleCanvasClick}
            />
            
            {/* Field Overlay */}
            <Box
              position="absolute"
              top={4}
              left={4}
              bg="white"
              borderRadius="md"
              p={3}
              boxShadow="md"
            >
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="medium">Field Controls</Text>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant={mode === 'view' ? 'solid' : 'outline'}
                    onClick={() => setMode('view')}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === 'player' ? 'solid' : 'outline'}
                    onClick={() => setMode('player')}
                    leftIcon={<FiUsers />}
                  >
                    Add Player
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === 'route' ? 'solid' : 'outline'}
                    onClick={() => setMode('route')}
                    leftIcon={<FiMap />}
                  >
                    Draw Route
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === 'delete' ? 'solid' : 'outline'}
                    onClick={() => setMode('delete')}
                    leftIcon={<FiTrash2 />}
                  >
                    Delete
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </Box>

          {/* Sidebar */}
          <Box w="350px" bg="white" borderLeft="1px" borderColor="gray.200">
            <Tabs>
              <TabList>
                <Tab>Players</Tab>
                <Tab>Routes</Tab>
                <Tab>Plays</Tab>
              </TabList>

              <TabPanels>
                {/* Players Panel */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="medium">Players ({players.length})</Text>
                      <Button size="sm" leftIcon={<FiPlus />} onClick={() => setMode('player')}>
                        Add Player
                      </Button>
                    </HStack>
                    
                    <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
                      {players.map((player) => (
                        <Card key={player.id} size="sm">
                          <CardBody p={3}>
                            <HStack justify="space-between">
                              <VStack align="start" spacing={1}>
                                <Text fontWeight="medium">#{player.number}</Text>
                                <Text fontSize="sm" color="gray.600">{player.position}</Text>
                              </VStack>
                              <HStack spacing={1}>
                                <IconButton
                                  size="sm"
                                  icon={<FiTrash2 />}
                                  onClick={() => removePlayer(player.id)}
                                  colorScheme="red"
                                  variant="ghost"
                                />
                              </HStack>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  </VStack>
                </TabPanel>

                {/* Routes Panel */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="medium">Routes ({routes.length})</Text>
                      <Button size="sm" leftIcon={<FiMap />} onClick={() => setMode('route')}>
                        Draw Route
                      </Button>
                    </HStack>
                    
                    <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
                      {routes.map((route) => (
                        <Card key={route.id} size="sm">
                          <CardBody p={3}>
                            <HStack justify="space-between">
                              <VStack align="start" spacing={1}>
                                <Text fontWeight="medium">{route.type}</Text>
                                <Text fontSize="sm" color="gray.600">
                                  Player #{players.find(p => p.id === route.playerId)?.number}
                                </Text>
                              </VStack>
                              <Box
                                w={4}
                                h={4}
                                borderRadius="full"
                                bg={route.color}
                              />
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  </VStack>
                </TabPanel>

                {/* Plays Panel */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="medium">Saved Plays</Text>
                      <Button size="sm" leftIcon={<FiFolder />} onClick={onLibraryOpen}>
                        Library
                      </Button>
                    </HStack>
                    
                    <VStack spacing={3} align="stretch">
                      <Card>
                        <CardHeader pb={2}>
                          <Text fontSize="sm" fontWeight="medium">Save Current Play</Text>
                        </CardHeader>
                        <CardBody pt={0}>
                          <VStack spacing={3} align="stretch">
                            <input
                              type="text"
                              placeholder="Play name..."
                              value={currentPlayName}
                              onChange={(e) => setCurrentPlayName(e.target.value)}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '14px',
                              }}
                            />
                            <HStack spacing={2}>
                              <select
                                value={currentPlayPhase}
                                onChange={(e) => setCurrentPlayPhase(e.target.value)}
                                style={{
                                  padding: '6px 8px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                }}
                              >
                                <option value="offense">Offense</option>
                                <option value="defense">Defense</option>
                                <option value="special">Special Teams</option>
                              </select>
                              <select
                                value={currentPlayType}
                                onChange={(e) => setCurrentPlayType(e.target.value)}
                                style={{
                                  padding: '6px 8px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                }}
                              >
                                <option value="pass">Pass</option>
                                <option value="run">Run</option>
                                <option value="kick">Kick</option>
                              </select>
                            </HStack>
                            <Button
                              size="sm"
                              leftIcon={<FiSave />}
                              onClick={savePlay}
                              isDisabled={!currentPlayName.trim()}
                            >
                              Save Play
                            </Button>
                          </VStack>
                        </CardBody>
                      </Card>
                    </VStack>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </HStack>

        {/* Footer */}
        <Box bg="white" borderTop="1px" borderColor="gray.200" p={3}>
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Button size="sm" variant="outline" onClick={clearField}>
                Clear Field
              </Button>
              <Button size="sm" variant="outline" leftIcon={<FiRotateCcw />}>
                Undo
              </Button>
              <Button size="sm" variant="outline" leftIcon={<FiRotateCw />}>
                Redo
              </Button>
            </HStack>
            
            <HStack spacing={2}>
              <IconButton
                size="sm"
                icon={isPlaying ? <FiPause /> : <FiPlay />}
                onClick={() => setIsPlaying(!isPlaying)}
                colorScheme="blue"
              />
              <IconButton
                size="sm"
                icon={<FiSettings />}
                onClick={onSettingsOpen}
                variant="ghost"
              />
            </HStack>
          </HStack>
        </Box>
      </VStack>

      {/* Play Library Drawer */}
      <Drawer isOpen={isLibraryOpen} placement="right" onClose={onLibraryClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Play Library</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {savedPlays.map((play) => (
                <Card key={play.id} cursor="pointer" onClick={() => loadPlay(play)}>
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontWeight="medium">{play.name}</Text>
                      <HStack spacing={2}>
                        <Badge colorScheme="blue" variant="subtle">
                          {play.phase}
                        </Badge>
                        <Badge colorScheme="green" variant="subtle">
                          {play.type}
                        </Badge>
                        <Badge colorScheme="purple" variant="subtle">
                          {play.players.length} players
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {play.createdAt.toLocaleDateString()}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Settings Drawer */}
      <Drawer isOpen={isSettingsOpen} placement="right" onClose={onSettingsClose} size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Settings</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              <Text>Settings coming soon...</Text>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Container>
  );
};

export default SmartPlaybookModern; 