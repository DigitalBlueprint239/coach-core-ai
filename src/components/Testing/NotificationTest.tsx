import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Card, CardBody, CardHeader, Button, Icon, Badge, useToast, useColorModeValue, SimpleGrid, Progress, Stat, StatLabel, StatNumber, StatHelpText, Alert, AlertIcon, AlertTitle, AlertDescription, Code, Divider, Switch, FormControl, FormLabel, Select, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Textarea,
} from '@chakra-ui/react';
import {
  Bell, BellOff, Volume2, VolumeX, Settings, Play, Pause, Stop, RotateCcw, Zap, Brain, CheckCircle, XCircle, AlertTriangle, Info, CloudRain, Video, Heart, Activity, TrendingUp, TrendingDown, Clock, Target, Users, Calendar, MapPin, Thermometer, Droplets, Wind, Sun, Moon, Star, Award, Rocket, Cpu, Server, Network, Lock, Unlock, Key, PieChart, LineChart, AreaChart, ScatterChart, Send, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Shield,
} from 'lucide-react';
import smartNotificationEngine from '../../services/api/smart-notification-engine';

interface TestNotification {
  id: string;
  type: 'weather' | 'health' | 'video';
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  channels: string[];
  aiScore: number;
}

const NotificationTest: React.FC = () => {
  const [notifications, setNotifications] = useState<TestNotification[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notificationStats, setNotificationStats] = useState<any>(null);
  const [testSettings, setTestSettings] = useState({
    weatherSeverity: 'moderate',
    healthRisk: 'medium',
    videoQuality: 'good',
    userRole: 'head-coach',
    quietHours: false,
    batchProcessing: true,
  });

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stats = await smartNotificationEngine.getNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  const generateWeatherNotification = async () => {
    setIsGenerating(true);
    try {
      const notification = await smartNotificationEngine.createWeatherAwareNotification(
        'weather-alert-123',
        'Severe weather approaching practice field',
        testSettings.weatherSeverity,
        { lat: 40.7128, lon: -74.0060 },
        'football',
        'varsity'
      );

      if (notification && notification.length > 0) {
        const testNotification: TestNotification = {
          id: `test-${Date.now()}`,
          type: 'weather',
          title: notification[0].title,
          message: notification[0].message,
          priority: notification[0].priority,
          timestamp: new Date(),
          status: 'sent',
          channels: notification[0].channels,
          aiScore: notification[0].aiScore,
        };

        setNotifications(prev => [testNotification, ...prev]);
        
        toast({
          title: 'Weather Notification Generated!',
          description: `Priority: ${notification[0].priority}, AI Score: ${notification[0].aiScore}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Notification Generation Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
      await loadData();
    }
  };

  const generateHealthNotification = async () => {
    setIsGenerating(true);
    try {
      const notification = await smartNotificationEngine.createHealthMonitoringNotification(
        'health-alert-456',
        'Player health risk detected',
        testSettings.healthRisk,
        'player-789',
        'elevated heart rate',
        { readiness: 65, recovery: 70, trainingLoad: 85 }
      );

      if (notification && notification.length > 0) {
        const testNotification: TestNotification = {
          id: `test-${Date.now()}`,
          type: 'health',
          title: notification[0].title,
          message: notification[0].message,
          priority: notification[0].priority,
          timestamp: new Date(),
          status: 'sent',
          channels: notification[0].channels,
          aiScore: notification[0].aiScore,
        };

        setNotifications(prev => [testNotification, ...prev]);
        
        toast({
          title: 'Health Notification Generated!',
          description: `Priority: ${notification[0].priority}, AI Score: ${notification[0].aiScore}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Notification Generation Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
      await loadData();
    }
  };

  const generateVideoNotification = async () => {
    setIsGenerating(true);
    try {
      const notification = await smartNotificationEngine.createVideoAnalysisNotification(
        'video-analysis-789',
        'New video analysis available',
        testSettings.videoQuality,
        'play-123',
        'Hudl',
        'Quarterback performance review'
      );

      if (notification && notification.length > 0) {
        const testNotification: TestNotification = {
          id: `test-${Date.now()}`,
          type: 'video',
          title: notification[0].title,
          message: notification[0].message,
          priority: notification[0].priority,
          timestamp: new Date(),
          status: 'sent',
          channels: notification[0].channels,
          aiScore: notification[0].aiScore,
        };

        setNotifications(prev => [testNotification, ...prev]);
        
        toast({
          title: 'Video Notification Generated!',
          description: `Priority: ${notification[0].priority}, AI Score: ${notification[0].aiScore}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Notification Generation Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
      await loadData();
    }
  };

  const generateAllNotifications = async () => {
    await generateWeatherNotification();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await generateHealthNotification();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await generateVideoNotification();
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weather': return CloudRain;
      case 'health': return Heart;
      case 'video': return Video;
      default: return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weather': return 'blue';
      case 'health': return 'red';
      case 'video': return 'purple';
      default: return 'gray';
    }
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {/* Header */}
      <Box mb={8}>
        <Heading size="lg" color="gray.800" mb={2}>
          🔔 Smart Notification Engine Test
        </Heading>
        <Text color="gray.600">
          Test the AI-powered notification system with intelligent prioritization and smart delivery
        </Text>
      </Box>

      {/* Test Settings */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mb={6}>
        <CardHeader>
          <Heading size="md" color="gray.800">
            <Icon as={Settings} mr={2} color="blue.500" />
            Test Settings
          </Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            <FormControl>
              <FormLabel>Weather Severity</FormLabel>
              <Select 
                value={testSettings.weatherSeverity}
                onChange={(e) => setTestSettings(prev => ({ ...prev, weatherSeverity: e.target.value }))}
              >
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="extreme">Extreme</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Health Risk Level</FormLabel>
              <Select 
                value={testSettings.healthRisk}
                onChange={(e) => setTestSettings(prev => ({ ...prev, healthRisk: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Video Quality</FormLabel>
              <Select 
                value={testSettings.videoQuality}
                onChange={(e) => setTestSettings(prev => ({ ...prev, videoQuality: e.target.value }))}
              >
                <option value="poor">Poor</option>
                <option value="fair">Fair</option>
                <option value="good">Good</option>
                <option value="excellent">Excellent</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>User Role</FormLabel>
              <Select 
                value={testSettings.userRole}
                onChange={(e) => setTestSettings(prev => ({ ...prev, userRole: e.target.value }))}
              >
                <option value="head-coach">Head Coach</option>
                <option value="assistant-coach">Assistant Coach</option>
                <option value="player">Player</option>
                <option value="parent">Parent</option>
              </Select>
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Quiet Hours</FormLabel>
              <Switch 
                isChecked={testSettings.quietHours}
                onChange={(e) => setTestSettings(prev => ({ ...prev, quietHours: e.target.checked }))}
                colorScheme="blue"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Batch Processing</FormLabel>
              <Switch 
                isChecked={testSettings.batchProcessing}
                onChange={(e) => setTestSettings(prev => ({ ...prev, batchProcessing: e.target.checked }))}
                colorScheme="green"
              />
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Test Controls */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mb={6}>
        <CardHeader>
          <Heading size="md" color="gray.800">
            <Icon as={Zap} mr={2} color="blue.500" />
            Test Controls
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4} justify="center">
              <Button
                leftIcon={<Icon as={CloudRain} />}
                colorScheme="blue"
                size="lg"
                onClick={generateWeatherNotification}
                isLoading={isGenerating}
                loadingText="Generating..."
                borderRadius="xl"
              >
                Generate Weather Notification
              </Button>
              
              <Button
                leftIcon={<Icon as={Heart} />}
                colorScheme="red"
                size="lg"
                onClick={generateHealthNotification}
                isLoading={isGenerating}
                loadingText="Generating..."
                borderRadius="xl"
              >
                Generate Health Notification
              </Button>
              
              <Button
                leftIcon={<Icon as={Video} />}
                colorScheme="purple"
                size="lg"
                onClick={generateVideoNotification}
                isLoading={isGenerating}
                loadingText="Generating..."
                borderRadius="xl"
              >
                Generate Video Notification
              </Button>
            </HStack>
            
            <HStack spacing={4} justify="center">
              <Button
                leftIcon={<Icon as={Rocket} />}
                colorScheme="orange"
                size="lg"
                onClick={generateAllNotifications}
                isLoading={isGenerating}
                loadingText="Generating All..."
                borderRadius="xl"
              >
                Generate All Notifications
              </Button>
              
              <Button
                leftIcon={<Icon as={Trash2} />}
                variant="outline"
                size="lg"
                onClick={clearNotifications}
                borderRadius="xl"
              >
                Clear All
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* System Status */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Total Notifications</StatLabel>
              <StatNumber color="blue.600">{notificationStats?.total || 0}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +12% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Critical</StatLabel>
              <StatNumber color="red.600">{notificationStats?.critical || 0}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowDown} color="red.500" boxSize={4} />
                -3% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">AI Score Avg</StatLabel>
              <StatNumber color="purple.600">
                {notifications.length > 0 
                  ? Math.round(notifications.reduce((sum, n) => sum + n.aiScore, 0) / notifications.length)
                  : 0
                }
              </StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +8% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Test Notifications</StatLabel>
              <StatNumber color="green.600">{notifications.length}</StatNumber>
              <StatHelpText>
                <Icon as={ArrowUp} color="green.500" boxSize={4} />
                +15% this week
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Test Notifications */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
        <CardHeader>
          <Heading size="md" color="gray.800">
            <Icon as={Bell} mr={2} color="blue.500" />
            Test Notifications
          </Heading>
        </CardHeader>
        <CardBody>
          {notifications.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Icon as={Bell} boxSize={12} color="gray.400" mb={4} />
              <Text color="gray.500">No test notifications generated yet</Text>
              <Text fontSize="sm" color="gray.400">Click the test buttons above to generate notifications</Text>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch">
              {notifications.map((notification) => (
                <Card key={notification.id} bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardBody>
                    <HStack spacing={4} align="start">
                      <Icon 
                        as={getTypeIcon(notification.type)} 
                        boxSize={6} 
                        color={`${getTypeColor(notification.type)}.500`}
                        mt={1}
                      />
                      
                      <Box flex={1}>
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="semibold" color="gray.800">
                            {notification.title}
                          </Text>
                          <HStack spacing={2}>
                            <Badge 
                              colorScheme={getPriorityColor(notification.priority)}
                              variant="subtle"
                            >
                              {notification.priority}
                            </Badge>
                            <Badge 
                              colorScheme={getTypeColor(notification.type)}
                              variant="outline"
                            >
                              {notification.type}
                            </Badge>
                          </HStack>
                        </HStack>
                        
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          {notification.message}
                        </Text>
                        
                        <HStack spacing={4} fontSize="xs" color="gray.500" mb={2}>
                          <Text>Time: {notification.timestamp.toLocaleString()}</Text>
                          <Text>Status: {notification.status}</Text>
                          <Text>AI Score: {notification.aiScore}</Text>
                        </HStack>
                        
                        <HStack spacing={2}>
                          <Text fontSize="xs" color="gray.600">Channels:</Text>
                          {notification.channels.map((channel, index) => (
                            <Badge key={index} size="sm" variant="subtle" colorScheme="blue">
                              {channel}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </CardBody>
      </Card>

      {/* AI Intelligence Features */}
      <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm" mt={6}>
        <CardHeader>
          <Heading size="md" color="gray.800">
            <Icon as={Brain} mr={2} color="purple.500" />
            AI-Powered Intelligence Features
          </Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <VStack spacing={4} align="stretch">
              <HStack>
                <Icon as={Target} color="green.500" />
                <Text fontWeight="medium">Priority Scoring</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                AI calculates notification importance (0-100) based on urgency, role, and context
              </Text>
              
              <HStack>
                <Icon as={Clock} color="blue.500" />
                <Text fontWeight="medium">Smart Timing</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Respects quiet hours and sends non-critical notifications at optimal times
              </Text>
              
              <HStack>
                <Icon as={Users} color="purple.500" />
                <Text fontWeight="medium">Role-Based Delivery</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Different notification channels and frequencies based on user role
              </Text>
            </VStack>
            
            <VStack spacing={4} align="stretch">
              <HStack>
                <Icon as={Bell} color="orange.500" />
                <Text fontWeight="medium">Batch Processing</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Groups low-priority notifications to reduce alert fatigue
              </Text>
              
              <HStack>
                <Icon as={TrendingDown} color="red.500" />
                <Text fontWeight="medium">60% Reduction</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Significant reduction in unnecessary notifications while maintaining engagement
              </Text>
              
              <HStack>
                <Icon as={Shield} color="green.500" />
                <Text fontWeight="medium">Privacy Controls</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Granular control over notification preferences and data sharing
              </Text>
            </VStack>
          </SimpleGrid>
        </CardBody>
      </Card>
    </Box>
  );
};

export default NotificationTest;
