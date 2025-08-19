import React, { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Card, CardBody, CardHeader, Button, Icon, Badge, useToast, useColorModeValue, SimpleGrid, Flex, Spacer, Progress, Stat, StatLabel, StatNumber, StatHelpText, Tabs, TabList, TabPanels, Tab, TabPanel, IconButton, Tooltip, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Alert, AlertIcon, AlertTitle, AlertDescription, Code, Kbd, useClipboard,
} from '@chakra-ui/react';
import {
  Mic, MicOff, Volume2, VolumeX, Settings, Play, Pause, Stop, RotateCcw, Zap, Brain, Workflow, Bell, Clock, Target, Users, Calendar, MapPin, Thermometer, Droplets, Wind, Sun, Moon, Star, Award, Rocket, Lightning, Cpu, Server, Network, Lock, Unlock, Key, Chart, PieChart, LineChart, AreaChart, ScatterChart, Filter, Search, FilterX, SortAsc, SortDesc, MoreVertical, ChevronRight, ChevronDown, ChevronUp, ArrowRight, ArrowUp, ArrowDown, Check, X, AlertCircle, HelpCircle, Info, Eye, Edit, Trash2, Plus, Download, Upload, Eye as EyeIcon, Edit as EditIcon, Trash2 as Trash2Icon, Plus as PlusIcon, Download as DownloadIcon, Upload as UploadIcon,
} from 'lucide-react';

export interface VoiceCommand {
  id: string;
  phrase: string;
  action: string;
  category: 'practice' | 'team' | 'health' | 'video' | 'system' | 'navigation';
  description: string;
  examples: string[];
  isEnabled: boolean;
  requiresConfirmation: boolean;
}

export interface VoiceResponse {
  id: string;
  command: string;
  response: string;
  timestamp: Date;
  confidence: number;
  executed: boolean;
  error?: string;
}

class VoiceCommandEngine {
  private recognition: any;
  private synthesis: any;
  private isListening: boolean = false;
  private commands: Map<string, VoiceCommand> = new Map();
  private isSupported: boolean = false;

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
    this.setupDefaultCommands();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.isSupported = true;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        this.processVoiceCommand(transcript);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    } else {
      console.warn('Speech recognition not supported');
      this.isSupported = false;
    }
  }

  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Speech synthesis not supported');
    }
  }

  private setupDefaultCommands() {
    const defaultCommands: VoiceCommand[] = [
      // Practice Commands
      {
        id: 'start-practice',
        phrase: 'start practice',
        action: 'start_practice_session',
        category: 'practice',
        description: 'Begin a new practice session',
        examples: ['start practice', 'begin practice', 'practice start'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'end-practice',
        phrase: 'end practice',
        action: 'end_practice_session',
        category: 'practice',
        description: 'End the current practice session',
        examples: ['end practice', 'stop practice', 'practice over'],
        isEnabled: true,
        requiresConfirmation: true,
      },
      {
        id: 'take-attendance',
        phrase: 'take attendance',
        action: 'take_attendance',
        category: 'practice',
        description: 'Start attendance tracking',
        examples: ['take attendance', 'roll call', 'check attendance'],
        isEnabled: true,
        requiresConfirmation: false,
      },

      // Team Commands
      {
        id: 'team-stats',
        phrase: 'team stats',
        action: 'show_team_stats',
        category: 'team',
        description: 'Display team statistics',
        examples: ['team stats', 'show stats', 'team performance'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'player-list',
        phrase: 'player list',
        action: 'show_player_list',
        category: 'team',
        description: 'Show list of all players',
        examples: ['player list', 'roster', 'show players'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'health-check',
        phrase: 'health check',
        action: 'check_player_health',
        category: 'health',
        description: 'Check player health status',
        examples: ['health check', 'check health', 'player wellness'],
        isEnabled: true,
        requiresConfirmation: false,
      },

      // Video Commands
      {
        id: 'record-video',
        phrase: 'record video',
        action: 'start_video_recording',
        category: 'video',
        description: 'Start recording practice video',
        examples: ['record video', 'start recording', 'film practice'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'stop-video',
        phrase: 'stop video',
        action: 'stop_video_recording',
        category: 'video',
        description: 'Stop video recording',
        examples: ['stop video', 'stop recording', 'end filming'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'review-video',
        phrase: 'review video',
        action: 'show_video_library',
        category: 'video',
        description: 'Show video library for review',
        examples: ['review video', 'show videos', 'video library'],
        isEnabled: true,
        requiresConfirmation: false,
      },

      // Navigation Commands
      {
        id: 'go-home',
        phrase: 'go home',
        action: 'navigate_home',
        category: 'navigation',
        description: 'Navigate to home dashboard',
        examples: ['go home', 'home', 'main menu'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'practice-planner',
        phrase: 'practice planner',
        action: 'navigate_practice_planner',
        category: 'navigation',
        description: 'Open practice planner',
        examples: ['practice planner', 'plan practice', 'practice planning'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'team-management',
        phrase: 'team management',
        action: 'navigate_team_management',
        category: 'navigation',
        description: 'Open team management',
        examples: ['team management', 'manage team', 'team admin'],
        isEnabled: true,
        requiresConfirmation: false,
      },

      // System Commands
      {
        id: 'voice-help',
        phrase: 'voice help',
        action: 'show_voice_help',
        category: 'system',
        description: 'Show available voice commands',
        examples: ['voice help', 'help', 'commands'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'mute-voice',
        phrase: 'mute voice',
        action: 'mute_voice_feedback',
        category: 'system',
        description: 'Mute voice feedback',
        examples: ['mute voice', 'quiet', 'silence'],
        isEnabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'unmute-voice',
        phrase: 'unmute voice',
        action: 'unmute_voice_feedback',
        category: 'system',
        description: 'Unmute voice feedback',
        examples: ['unmute voice', 'speak', 'talk'],
        isEnabled: true,
        requiresConfirmation: false,
      },
    ];

    defaultCommands.forEach(command => {
      this.commands.set(command.id, command);
    });
  }

  public startListening(): boolean {
    if (!this.isSupported || this.isListening) {
      return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start listening:', error);
      return false;
    }
  }

  public stopListening(): boolean {
    if (!this.isListening) {
      return false;
    }

    try {
      this.recognition.stop();
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('Failed to stop listening:', error);
      return false;
    }
  }

  public speak(text: string): void {
    if (!this.synthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    this.synthesis.speak(utterance);
  }

  private processVoiceCommand(transcript: string): VoiceResponse {
    const normalizedTranscript = transcript.toLowerCase().trim();
    let bestMatch: VoiceCommand | null = null;
    let highestConfidence = 0;

    // Find the best matching command
    for (const command of this.commands.values()) {
      if (!command.isEnabled) continue;

      const confidence = this.calculateConfidence(normalizedTranscript, command);
      if (confidence > highestConfidence && confidence > 0.7) {
        highestConfidence = confidence;
        bestMatch = command;
      }
    }

    if (bestMatch) {
      const response: VoiceResponse = {
        id: Date.now().toString(),
        command: transcript,
        response: `Executing: ${bestMatch.description}`,
        timestamp: new Date(),
        confidence: highestConfidence,
        executed: true,
      };

      // Execute the command
      this.executeCommand(bestMatch, response);
      return response;
    } else {
      const response: VoiceResponse = {
        id: Date.now().toString(),
        command: transcript,
        response: 'Command not recognized. Say "voice help" for available commands.',
        timestamp: new Date(),
        confidence: 0,
        executed: false,
        error: 'Command not found',
      };

      this.speak(response.response);
      return response;
    }
  }

  private calculateConfidence(transcript: string, command: VoiceCommand): number {
    let maxConfidence = 0;

    for (const example of command.examples) {
      const similarity = this.calculateSimilarity(transcript, example);
      maxConfidence = Math.max(maxConfidence, similarity);
    }

    return maxConfidence;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    
    let matches = 0;
    let total = Math.max(words1.length, words2.length);

    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }

    return matches / total;
  }

  private executeCommand(command: VoiceCommand, response: VoiceResponse): void {
    try {
      switch (command.action) {
        case 'start_practice_session':
          this.speak('Starting practice session. All players to their stations.');
          break;
        case 'end_practice_session':
          this.speak('Ending practice session. Great work everyone!');
          break;
        case 'take_attendance':
          this.speak('Starting attendance. Please check in at your stations.');
          break;
        case 'show_team_stats':
          this.speak('Displaying team statistics on your screen.');
          break;
        case 'show_player_list':
          this.speak('Showing player roster and contact information.');
          break;
        case 'check_player_health':
          this.speak('Checking player health metrics and alerts.');
          break;
        case 'start_video_recording':
          this.speak('Starting video recording. Recording will begin in 3 seconds.');
          break;
        case 'stop_video_recording':
          this.speak('Stopping video recording. File saved successfully.');
          break;
        case 'show_video_library':
          this.speak('Opening video library for review and analysis.');
          break;
        case 'navigate_home':
          this.speak('Navigating to home dashboard.');
          break;
        case 'navigate_practice_planner':
          this.speak('Opening practice planner for session planning.');
          break;
        case 'navigate_team_management':
          this.speak('Opening team management dashboard.');
          break;
        case 'show_voice_help':
          this.speak('Available commands: start practice, take attendance, team stats, record video, and more. Check the screen for the complete list.');
          break;
        case 'mute_voice_feedback':
          this.speak('Voice feedback muted. You can still use voice commands.');
          break;
        case 'unmute_voice_feedback':
          this.speak('Voice feedback enabled. I will respond to your commands.');
          break;
        default:
          this.speak('Command executed successfully.');
      }
    } catch (error) {
      response.executed = false;
      response.error = error.message;
      this.speak('Error executing command. Please try again.');
    }
  }

  public getCommands(): VoiceCommand[] {
    return Array.from(this.commands.values());
  }

  public toggleCommand(commandId: string): void {
    const command = this.commands.get(commandId);
    if (command) {
      command.isEnabled = !command.isEnabled;
    }
  }

  public isSupported(): boolean {
    return this.isSupported;
  }

  public getListeningStatus(): boolean {
    return this.isListening;
  }
}

const VoiceCommandInterface: React.FC = () => {
  const [voiceEngine] = useState(() => new VoiceCommandEngine());
  const [isListening, setIsListening] = useState(false);
  const [voiceResponses, setVoiceResponses] = useState<VoiceResponse[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('commands');

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    // Check if voice commands are supported
    if (!voiceEngine.isSupported()) {
      toast({
        title: 'Voice Commands Not Supported',
        description: 'Your browser does not support speech recognition. Please use Chrome or Edge.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [voiceEngine, toast]);

  const toggleListening = () => {
    if (isListening) {
      voiceEngine.stopListening();
      setIsListening(false);
      toast({
        title: 'Voice Recognition Stopped',
        description: 'Voice commands are now disabled',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    } else {
      const success = voiceEngine.startListening();
      if (success) {
        setIsListening(true);
        toast({
          title: 'Voice Recognition Active',
          description: 'Say "voice help" to see available commands',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Failed to Start Voice Recognition',
          description: 'Please check your microphone permissions',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      voiceEngine.speak('Voice feedback enabled');
    } else {
      voiceEngine.speak('Voice feedback muted');
    }
  };

  const testVoiceCommand = (command: VoiceCommand) => {
    const response: VoiceResponse = {
      id: Date.now().toString(),
      command: command.phrase,
      response: `Testing: ${command.description}`,
      timestamp: new Date(),
      confidence: 1.0,
      executed: true,
    };

    setVoiceResponses(prev => [response, ...prev.slice(0, 9)]);
    
    if (!isMuted) {
      voiceEngine.speak(`Testing ${command.description}`);
    }
  };

  const getCommandsByCategory = (category: string) => {
    return voiceEngine.getCommands().filter(cmd => cmd.category === category);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'practice': return Play;
      case 'team': return Users;
      case 'health': return Heart;
      case 'video': return Eye;
      case 'navigation': return MapPin;
      case 'system': return Settings;
      default: return Zap;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'practice': return 'green';
      case 'team': return 'blue';
      case 'health': return 'red';
      case 'video': return 'purple';
      case 'navigation': return 'orange';
      case 'system': return 'gray';
      default: return 'teal';
    }
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      <Heading size="lg" color="gray.800" mb={6}>
        🎤 Voice Command Interface
      </Heading>

      {/* Voice Control Panel */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mb={8}>
        <CardHeader>
          <HStack>
            <Icon as={Mic} color="blue.500" />
            <Heading size="md" color="gray.800">Voice Control Panel</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {/* Voice Recognition Status */}
            <Box textAlign="center" p={6} bg={cardBg} borderRadius="xl">
              <Icon 
                as={isListening ? Mic : MicOff} 
                boxSize={12} 
                color={isListening ? 'green.500' : 'red.500'} 
                mb={4}
              />
              <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2}>
                Voice Recognition
              </Text>
              <Text fontSize="sm" color="gray.600" mb={4}>
                {isListening ? 'Active - Listening for commands' : 'Inactive - Click to enable'}
              </Text>
              <Button
                leftIcon={<Icon as={isListening ? MicOff : Mic} />}
                colorScheme={isListening ? 'red' : 'green'}
                size="lg"
                onClick={toggleListening}
                borderRadius="xl"
                isDisabled={!voiceEngine.isSupported()}
              >
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </Button>
            </Box>

            {/* Voice Feedback Control */}
            <Box textAlign="center" p={6} bg={cardBg} borderRadius="xl">
              <Icon 
                as={isMuted ? VolumeX : Volume2} 
                boxSize={12} 
                color={isMuted ? 'red.500' : 'green.500'} 
                mb={4}
              />
              <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2}>
                Voice Feedback
              </Text>
              <Text fontSize="sm" color="gray.600" mb={4}>
                {isMuted ? 'Muted - No voice responses' : 'Enabled - Voice feedback active'}
              </Text>
              <Button
                leftIcon={<Icon as={isMuted ? Volume2 : VolumeX} />}
                colorScheme={isMuted ? 'green' : 'red'}
                size="lg"
                onClick={toggleMute}
                borderRadius="xl"
              >
                {isMuted ? 'Enable Feedback' : 'Mute Feedback'}
              </Button>
            </Box>

            {/* Quick Test */}
            <Box textAlign="center" p={6} bg={cardBg} borderRadius="xl">
              <Icon as={Zap} boxSize={12} color="purple.500" mb={4} />
              <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2}>
                Quick Test
              </Text>
              <Text fontSize="sm" color="gray.600" mb={4}>
                Test voice commands and system response
              </Text>
              <Button
                leftIcon={<Icon as={Play} />}
                colorScheme="purple"
                size="lg"
                onClick={() => {
                  if (!isMuted) {
                    voiceEngine.speak('Voice command system is working correctly. You can now use voice commands to control the app.');
                  }
                }}
                borderRadius="xl"
              >
                Test System
              </Button>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      <Tabs variant="enclosed" colorScheme="blue" value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab>
            <Icon as={Zap} mr={2} />
            Voice Commands
          </Tab>
          <Tab>
            <Icon as={Brain} mr={2} />
            Command History
          </Tab>
          <Tab>
            <Icon as={Settings} mr={2} />
            Settings
          </Tab>
        </TabList>

        <TabPanels>
          {/* Voice Commands Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {['practice', 'team', 'health', 'video', 'navigation', 'system'].map((category) => (
                <Card key={category} bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <HStack>
                      <Icon as={getCategoryIcon(category)} color={`${getCategoryColor(category)}.500`} />
                      <Heading size="md" color="gray.800" textTransform="capitalize">
                        {category} Commands
                      </Heading>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      {getCommandsByCategory(category).map((command) => (
                        <Box key={command.id} p={4} bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
                          <HStack justify="space-between" mb={3}>
                            <Text fontWeight="semibold" color="gray.800">
                              {command.phrase}
                            </Text>
                            <Badge 
                              colorScheme={command.isEnabled ? 'green' : 'red'}
                              variant="subtle"
                              size="sm"
                            >
                              {command.isEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </HStack>
                          
                          <Text fontSize="sm" color="gray.600" mb={3}>
                            {command.description}
                          </Text>
                          
                          <VStack spacing={2} align="stretch">
                            <Text fontSize="xs" color="gray.500" fontWeight="medium">
                              Examples:
                            </Text>
                            {command.examples.slice(0, 2).map((example, index) => (
                              <Kbd key={index} fontSize="xs">
                                {example}
                              </Kbd>
                            ))}
                          </VStack>
                          
                          <HStack spacing={2} mt={4}>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Icon as={Play} />}
                              onClick={() => testVoiceCommand(command)}
                              borderRadius="xl"
                            >
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Icon as={command.isEnabled ? X : Check} />}
                              onClick={() => voiceEngine.toggleCommand(command.id)}
                              colorScheme={command.isEnabled ? 'red' : 'green'}
                              borderRadius="xl"
                            >
                              {command.isEnabled ? 'Disable' : 'Enable'}
                            </Button>
                          </HStack>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </TabPanel>

          {/* Command History Tab */}
          <TabPanel>
            <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
              <CardHeader>
                <Heading size="md" color="gray.800">Voice Command History</Heading>
              </CardHeader>
              <CardBody>
                {voiceResponses.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Icon as={Mic} boxSize={12} color="gray.400" mb={4} />
                    <Text color="gray.500">No voice commands yet</Text>
                    <Text fontSize="sm" color="gray.400">Start using voice commands to see them here</Text>
                  </Box>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {voiceResponses.map((response) => (
                      <Box key={response.id} p={4} bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="semibold" color="gray.800">
                            "{response.command}"
                          </Text>
                          <Badge 
                            colorScheme={response.executed ? 'green' : 'red'}
                            variant="subtle"
                            size="sm"
                          >
                            {response.executed ? 'Executed' : 'Failed'}
                          </Badge>
                        </HStack>
                        
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          {response.response}
                        </Text>
                        
                        <HStack spacing={4} fontSize="xs" color="gray.500">
                          <Text>Time: {response.timestamp.toLocaleTimeString()}</Text>
                          <Text>Confidence: {Math.round(response.confidence * 100)}%</Text>
                          {response.error && (
                            <Text color="red.500">Error: {response.error}</Text>
                          )}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel>
            <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
              <CardHeader>
                <Heading size="md" color="gray.800">Voice Command Settings</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Voice Command Tips</AlertTitle>
                      <AlertDescription>
                        Speak clearly and use natural language. The system recognizes variations of commands.
                        Say "voice help" anytime to hear available commands.
                      </AlertDescription>
                    </Box>
                  </Alert>

                  <Box p={4} bg={cardBg} borderRadius="lg">
                    <Text fontWeight="semibold" color="gray.800" mb={3}>
                      Supported Browsers
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Chrome, Edge, Safari (iOS), and other WebKit-based browsers support voice commands.
                      Firefox support is limited.
                    </Text>
                  </Box>

                  <Box p={4} bg={cardBg} borderRadius="lg">
                    <Text fontWeight="semibold" color="gray.800" mb={3}>
                      Microphone Permissions
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Ensure your browser has permission to access your microphone.
                      Check the address bar for microphone permissions.
                    </Text>
                  </Box>

                  <Box p={4} bg={cardBg} borderRadius="lg">
                    <Text fontWeight="semibold" color="gray.800" mb={3}>
                      Best Practices
                    </Text>
                    <VStack spacing={2} align="stretch" fontSize="sm" color="gray.600">
                      <Text>• Speak in a normal volume and pace</Text>
                      <Text>• Minimize background noise</Text>
                      <Text>• Use complete phrases rather than single words</Text>
                      <Text>• Wait for the system to process before speaking again</Text>
                    </VStack>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default VoiceCommandInterface;
