import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Button,
  Icon,
  Badge,
  useToast,
  useColorModeValue,
  Grid,
  GridItem,
  Flex,
  Spacer,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  ListIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  IconButton,
  Tooltip,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Link,
  SimpleGrid,
  Avatar,
  AvatarGroup,
  Tag,
  TagLabel,
  TagLeftIcon,
  TagRightIcon,
  Kbd,
  useClipboard,
} from '@chakra-ui/react';
import {
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Play,
  Pause,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  Database,
  Cloud,
  Wifi,
  WifiOff,
  Activity,
  BarChart3,
  Zap,
  Shield,
  Globe,
  Smartphone,
  Watch,
  Heart,
  Video,
  CloudRain,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Brain,
  Workflow,
  Bell,
  Clock,
  Target,
  Users,
  Calendar,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Moon,
  Star,
  Award,
  Rocket,
  Lightning,
  Cpu,
  Server,
  Network,
  Lock,
  Unlock,
  Key,
  Chart,
  PieChart,
  LineChart,
  AreaChart,
  ScatterChart,
  Filter,
  Search,
  FilterX,
  SortAsc,
  SortDesc,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Info as InfoIcon,
  Zap as ZapIcon,
  Target as TargetIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  Thermometer as ThermometerIcon,
  Droplets as DropletsIcon,
  Wind as WindIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Star as StarIcon,
  Award as AwardIcon,
  Rocket as RocketIcon,
  Lightning as LightningIcon,
  Cpu as CpuIcon,
  Server as ServerIcon,
  Network as NetworkIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Key as KeyIcon,
  Chart as ChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  ScatterChart as ScatterChartIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  FilterX as FilterXIcon,
  SortAsc as SortAscIcon,
  SortDesc as SortDescIcon,
  MoreVertical as MoreVerticalIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Check as CheckIcon,
  X as XIcon,
  AlertCircle as AlertCircleIcon,
  HelpCircle as HelpCircleIcon,
} from 'lucide-react';
import intelligentDataOrchestrator from '../../services/api/intelligent-orchestrator';
import smartNotificationEngine from '../../services/api/smart-notification-engine';
import apiIntegrationManager from '../../services/api/api-integration-manager';

const WorkflowOptimizationDashboard: React.FC = () => {
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [workflowStats, setWorkflowStats] = useState<any>(null);
  const [notificationStats, setNotificationStats] = useState<any>(null);
  const [integrationStats, setIntegrationStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [workflows, stats, notifications, integrations] = await Promise.all([
        intelligentDataOrchestrator.getAllWorkflows(),
        intelligentDataOrchestrator.getCacheStats(),
        smartNotificationEngine.getNotificationStats(),
        apiIntegrationManager.getMetrics(),
      ]);

      setActiveWorkflows(workflows);
      setWorkflowStats(stats);
      setNotificationStats(notifications);
      setIntegrationStats(integrations);
    } catch (error) {
      console.error('Failed to load workflow optimization data:', error);
    }
  };

  const executeWeatherAwareWorkflow = async () => {
    try {
      const workflow = await intelligentDataOrchestrator.executeWeatherAwarePracticePlanning(
        'team-123',
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        { lat: 40.7128, lon: -74.0060 } // NYC coordinates
      );

      toast({
        title: 'Weather-Aware Workflow Started',
        description: `Workflow ID: ${workflow.id}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await loadData();
    } catch (error) {
      toast({
        title: 'Workflow Execution Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const executeVideoAnalysisWorkflow = async () => {
    try {
      const workflow = await intelligentDataOrchestrator.executeVideoEnhancedPlayAnalysis(
        'video-123',
        'team-123',
        'play-review'
      );

      toast({
        title: 'Video Analysis Workflow Started',
        description: `Workflow ID: ${workflow.id}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await loadData();
    } catch (error) {
      toast({
        title: 'Workflow Execution Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const executeHealthMonitoringWorkflow = async () => {
    try {
      const workflow = await intelligentDataOrchestrator.executeRealTimeHealthMonitoring(
        'team-123',
        'practice-456'
      );

      toast({
        title: 'Health Monitoring Workflow Started',
        description: `Workflow ID: ${workflow.id}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await loadData();
    } catch (error) {
      toast({
        title: 'Workflow Execution Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getWorkflowStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return Activity;
      case 'completed': return CheckCircle;
      case 'failed': return XCircle;
      default: return Info;
    }
  };

  const getWorkflowTypeIcon = (type: string) => {
    switch (type) {
      case 'weather-aware-practice-planning': return CloudRain;
      case 'video-enhanced-play-analysis': return Video;
      case 'real-time-health-monitoring': return Heart;
      default: return Workflow;
    }
  };

  const getWorkflowTypeColor = (type: string) => {
    switch (type) {
      case 'weather-aware-practice-planning': return 'blue';
      case 'video-enhanced-play-analysis': return 'purple';
      case 'real-time-health-monitoring': return 'green';
      default: return 'gray';
    }
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {/* Header */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" color="gray.800" mb={2}>
              🚀 Workflow Optimization Dashboard
            </Heading>
            <Text color="gray.600">
              Intelligent data orchestration, smart notifications, and automated workflows
            </Text>
          </Box>
          
          <HStack spacing={4}>
            <Button
              leftIcon={<Icon as={RefreshCw} />}
              onClick={loadData}
              isLoading={isLoading}
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Icon as={Rocket} />}
              colorScheme="purple"
              size="sm"
            >
              Optimize All
            </Button>
          </HStack>
        </Flex>

        {/* Key Metrics Overview */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Active Workflows</StatLabel>
                <StatNumber color="blue.600">{activeWorkflows.filter(w => w.status === 'running').length}</StatNumber>
                <StatHelpText>
                  <Icon as={ArrowUp} color="green.500" boxSize={4} />
                  +15% this week
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Cache Hit Rate</StatLabel>
                <StatNumber color="green.600">
                  {workflowStats ? Math.round(workflowStats.hitRate * 100) : 0}%
                </StatNumber>
                <StatHelpText>
                  <Icon as={ArrowUp} color="green.500" boxSize={4} />
                  +8% improvement
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Smart Notifications</StatLabel>
                <StatNumber color="purple.600">{notificationStats?.total || 0}</StatNumber>
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
                <StatLabel color="gray.600">API Success Rate</StatLabel>
                <StatNumber color="orange.600">
                  {integrationStats ? Math.round((integrationStats.successfulRequests / integrationStats.totalRequests) * 100) : 0}%
                </StatNumber>
                <StatHelpText>
                  <Icon as={ArrowUp} color="green.500" boxSize={4} />
                  +12% this week
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Box>

      <Tabs variant="enclosed" colorScheme="purple">
        <TabList>
          <Tab>
            <Icon as={Workflow} mr={2} />
            Workflows
          </Tab>
          <Tab>
            <Icon as={Bell} mr={2} />
            Smart Notifications
          </Tab>
          <Tab>
            <Icon as={Brain} mr={2} />
            Data Orchestration
          </Tab>
          <Tab>
            <Icon as={Zap} mr={2} />
            Quick Actions
          </Tab>
        </TabList>

        <TabPanels>
          {/* Workflows Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Workflow Execution Controls */}
              <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                <CardHeader>
                  <Heading size="md" color="gray.800">
                    <Icon as={Play} mr={2} color="purple.500" />
                    Execute Workflows
                  </Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Button
                      leftIcon={<Icon as={CloudRain} />}
                      colorScheme="blue"
                      size="lg"
                      onClick={executeWeatherAwareWorkflow}
                      borderRadius="xl"
                    >
                      Weather-Aware Practice Planning
                    </Button>
                    
                    <Button
                      leftIcon={<Icon as={Video} />}
                      colorScheme="purple"
                      size="lg"
                      onClick={executeVideoAnalysisWorkflow}
                      borderRadius="xl"
                    >
                      Video Analysis Workflow
                    </Button>
                    
                    <Button
                      leftIcon={<Icon as={Heart} />}
                      colorScheme="green"
                      size="lg"
                      onClick={executeHealthMonitoringWorkflow}
                      borderRadius="xl"
                    >
                      Health Monitoring
                    </Button>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Active Workflows */}
              <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                <CardHeader>
                  <Heading size="md" color="gray.800">
                    <Icon as={Activity} mr={2} color="purple.500" />
                    Active Workflows
                  </Heading>
                </CardHeader>
                <CardBody>
                  {activeWorkflows.length === 0 ? (
                    <Box textAlign="center" py={8}>
                      <Icon as={Workflow} boxSize={12} color="gray.400" mb={4} />
                      <Text color="gray.500">No active workflows</Text>
                      <Text fontSize="sm" color="gray.400">Execute a workflow to see it here</Text>
                    </Box>
                  ) : (
                    <VStack spacing={4} align="stretch">
                      {activeWorkflows.map((workflow) => (
                        <Card key={workflow.id} bg={cardBg} border="1px" borderColor={borderColor}>
                          <CardBody>
                            <HStack spacing={4} align="center">
                              <Icon 
                                as={getWorkflowTypeIcon(workflow.workflowType)} 
                                boxSize={6} 
                                color={`${getWorkflowTypeColor(workflow.workflowType)}.500`}
                              />
                              
                              <Box flex={1}>
                                <HStack justify="space-between" mb={2}>
                                  <Text fontWeight="semibold" color="gray.800">
                                    {workflow.workflowType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </Text>
                                  <Badge 
                                    colorScheme={getWorkflowStatusColor(workflow.status)}
                                    variant="subtle"
                                  >
                                    {workflow.status}
                                  </Badge>
                                </HStack>
                                
                                <Text fontSize="sm" color="gray.600" mb={2}>
                                  ID: {workflow.id}
                                </Text>
                                
                                <HStack spacing={4} fontSize="xs" color="gray.500">
                                  <Text>Started: {workflow.startedAt.toLocaleString()}</Text>
                                  <Text>Steps: {workflow.currentStep}/{workflow.steps.length}</Text>
                                  {workflow.completedAt && (
                                    <Text>Completed: {workflow.completedAt.toLocaleString()}</Text>
                                  )}
                                </HStack>
                                
                                {/* Workflow Progress */}
                                <Box mt={3}>
                                  <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="gray.600">Progress</Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {Math.round((workflow.currentStep / workflow.steps.length) * 100)}%
                                    </Text>
                                  </HStack>
                                  <Progress 
                                    value={(workflow.currentStep / workflow.steps.length) * 100} 
                                    colorScheme={getWorkflowStatusColor(workflow.status)}
                                    borderRadius="full"
                                  />
                                </Box>
                              </Box>
                              
                              <VStack spacing={2}>
                                <Icon 
                                  as={getWorkflowStatusIcon(workflow.status)} 
                                  color={`${getWorkflowStatusColor(workflow.status)}.500`}
                                  boxSize={5}
                                />
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedWorkflow(workflow);
                                    setIsWorkflowModalOpen(true);
                                  }}
                                  leftIcon={<Icon as={Eye} />}
                                >
                                  Details
                                </Button>
                              </VStack>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>

          {/* Smart Notifications Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Notification Statistics */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.600">Total Notifications</StatLabel>
                      <StatNumber color="purple.600">{notificationStats?.total || 0}</StatNumber>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.600">Unread</StatLabel>
                      <StatNumber color="blue.600">{notificationStats?.unread || 0}</StatNumber>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.600">Critical</StatLabel>
                      <StatNumber color="red.600">{notificationStats?.critical || 0}</StatNumber>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardBody>
                    <Stat>
                      <StatLabel color="gray.600">High Priority</StatLabel>
                      <StatNumber color="orange.600">{notificationStats?.high || 0}</StatNumber>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Smart Notification Features */}
              <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                <CardHeader>
                  <Heading size="md" color="gray.800">
                    <Icon as={Brain} mr={2} color="purple.500" />
                    AI-Powered Notification Intelligence
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
                        AI calculates notification priority based on urgency, role, and context
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
            </VStack>
          </TabPanel>

          {/* Data Orchestration Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Orchestration Features */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Cpu} mr={2} color="blue.500" />
                      Intelligent Data Processing
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <HStack>
                        <Icon as={Workflow} color="green.500" />
                        <Text fontWeight="medium">Automated Workflows</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        Multi-step workflows with dependency management and error handling
                      </Text>
                      
                      <HStack>
                        <Icon as={Database} color="purple.500" />
                        <Text fontWeight="medium">Data Correlation</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        AI-powered correlation analysis across multiple data sources
                      </Text>
                      
                      <HStack>
                        <Icon as={TrendingUp} color="orange.500" />
                        <Text fontWeight="medium">Predictive Caching</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        Machine learning-based cache optimization and expiry prediction
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Server} mr={2} color="green.500" />
                      System Architecture
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <HStack>
                        <Icon as={Network} color="blue.500" />
                        <Text fontWeight="medium">Distributed Processing</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        Scalable architecture with load balancing and failover
                      </Text>
                      
                      <HStack>
                        <Icon as={Lock} color="green.500" />
                        <Text fontWeight="medium">Security First</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        End-to-end encryption and secure data handling
                      </Text>
                      
                      <HStack>
                        <Icon as={Zap} color="purple.500" />
                        <Text fontWeight="medium">Performance Optimized</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        Optimized for speed with intelligent caching and queuing
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Cache Statistics */}
              {workflowStats && (
                <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Chart} mr={2} color="orange.500" />
                      Cache Performance
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                      <Stat>
                        <StatLabel color="gray.600">Cache Size</StatLabel>
                        <StatNumber color="blue.600">{workflowStats.size}</StatNumber>
                        <StatHelpText>Active cache entries</StatHelpText>
                      </Stat>
                      
                      <Stat>
                        <StatLabel color="gray.600">Hit Rate</StatLabel>
                        <StatNumber color="green.600">
                          {Math.round(workflowStats.hitRate * 100)}%
                        </StatNumber>
                        <StatHelpText>Cache efficiency</StatHelpText>
                      </Stat>
                      
                      <Stat>
                        <StatLabel color="gray.600">Performance</StatLabel>
                        <StatNumber color="purple.600">
                          {workflowStats.hitRate > 0.8 ? 'Excellent' : workflowStats.hitRate > 0.6 ? 'Good' : 'Fair'}
                        </StatNumber>
                        <StatHelpText>Overall rating</StatHelpText>
                      </Stat>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </TabPanel>

          {/* Quick Actions Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Workflow Templates */}
              <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                <CardHeader>
                  <Heading size="md" color="gray.800">
                    <Icon as={Rocket} mr={2} color="purple.500" />
                    Workflow Templates
                  </Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    <Button
                      leftIcon={<Icon as={CloudRain} />}
                      variant="outline"
                      size="lg"
                      borderRadius="xl"
                      height="120px"
                      flexDirection="column"
                    >
                      <Text fontSize="lg" fontWeight="bold" mb={2}>
                        Weather-Aware Practice
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Automatic weather monitoring and practice recommendations
                      </Text>
                    </Button>
                    
                    <Button
                      leftIcon={<Icon as={Video} />}
                      variant="outline"
                      size="lg"
                      borderRadius="xl"
                      height="120px"
                      flexDirection="column"
                    >
                      <Text fontSize="lg" fontWeight="bold" mb={2}>
                        Video Analysis
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Cross-platform video processing and AI analysis
                      </Text>
                    </Button>
                    
                    <Button
                      leftIcon={<Icon as={Heart} />}
                      variant="outline"
                      size="lg"
                      borderRadius="xl"
                      height="120px"
                      flexDirection="column"
                    >
                      <Text fontSize="lg" fontWeight="bold" mb={2}>
                        Health Monitoring
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Real-time health tracking and risk assessment
                      </Text>
                    </Button>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* System Optimization */}
              <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
                <CardHeader>
                  <Heading size="md" color="gray.800">
                    <Icon as={Zap} mr={2} color="yellow.500" />
                    System Optimization
                  </Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Button
                      leftIcon={<Icon as={Database} />}
                      colorScheme="blue"
                      size="lg"
                      borderRadius="xl"
                    >
                      Optimize Cache
                    </Button>
                    
                    <Button
                      leftIcon={<Icon as={Network} />}
                      colorScheme="green"
                      size="lg"
                      borderRadius="xl"
                    >
                      Test All Integrations
                    </Button>
                    
                    <Button
                      leftIcon={<Icon as={Bell} />}
                      colorScheme="purple"
                      size="lg"
                      borderRadius="xl"
                    >
                      Notification Preferences
                    </Button>
                    
                    <Button
                      leftIcon={<Icon as={Chart} />}
                      colorScheme="orange"
                      size="lg"
                      borderRadius="xl"
                    >
                      Performance Analytics
                    </Button>
                  </SimpleGrid>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Workflow Details Modal */}
      <Modal isOpen={isWorkflowModalOpen} onClose={() => setIsWorkflowModalOpen(false)} size="4xl">
        <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.300" />
        <ModalContent bg={bgColor} borderRadius="2xl" shadow="2xl" border="1px" borderColor={borderColor}>
          <ModalHeader>
            Workflow Details: {selectedWorkflow?.workflowType}
          </ModalHeader>
          <ModalBody>
            {selectedWorkflow && (
              <VStack spacing={6} align="stretch">
                {/* Workflow Overview */}
                <Card bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box>
                        <Text fontWeight="semibold" color="gray.700" mb={2}>Status</Text>
                        <Badge 
                          colorScheme={getWorkflowStatusColor(selectedWorkflow.status)}
                          size="lg"
                        >
                          {selectedWorkflow.status}
                        </Badge>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="semibold" color="gray.700" mb={2}>Progress</Text>
                        <Text fontSize="lg" color="gray.800">
                          {selectedWorkflow.currentStep} / {selectedWorkflow.steps.length} steps
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="semibold" color="gray.700" mb={2}>Started</Text>
                        <Text color="gray.600">
                          {selectedWorkflow.startedAt.toLocaleString()}
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="semibold" color="gray.700" mb={2}>Duration</Text>
                        <Text color="gray.600">
                          {selectedWorkflow.completedAt 
                            ? `${Math.round((selectedWorkflow.completedAt.getTime() - selectedWorkflow.startedAt.getTime()) / 1000)}s`
                            : 'Running...'
                          }
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Workflow Steps */}
                <Card bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardHeader>
                    <Heading size="sm" color="gray.800">Workflow Steps</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      {selectedWorkflow.steps.map((step: any, index: number) => (
                        <HStack key={step.id} spacing={4} p={3} bg="white" borderRadius="lg">
                          <Box>
                            <Text fontWeight="semibold" color="gray.800">
                              {index + 1}. {step.name}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              Type: {step.type}
                            </Text>
                          </Box>
                          
                          <Spacer />
                          
                          <Badge 
                            colorScheme={getWorkflowStatusColor(step.status)}
                            variant="subtle"
                          >
                            {step.status}
                          </Badge>
                          
                          {step.result && (
                            <IconButton
                              aria-label="View result"
                              icon={<Icon as={Eye} />}
                              size="sm"
                              variant="ghost"
                            />
                          )}
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>

                {/* Workflow Data */}
                <Card bg={cardBg} border="1px" borderColor={borderColor}>
                  <CardHeader>
                    <Heading size="sm" color="gray.800">Workflow Data</Heading>
                  </CardHeader>
                  <CardBody>
                    <Code p={4} borderRadius="lg" bg="gray.100" color="gray.800" fontSize="sm">
                      {JSON.stringify(selectedWorkflow.data, null, 2)}
                    </Code>
                  </CardBody>
                </Card>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsWorkflowModalOpen(false)}>
              Close
            </Button>
            <Button colorScheme="blue">
              View Logs
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default WorkflowOptimizationDashboard;
