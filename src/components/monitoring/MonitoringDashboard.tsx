import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Badge,
  useToast,
  useColorModeValue,
  SimpleGrid,
  Flex,
  Spacer,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Skeleton,
  SkeletonText,
  Fade,
  ScaleFade,
  Tooltip,
  IconButton,
  Switch,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Input,
  Textarea,
  Divider,
  List,
  ListItem,
  ListIcon,
  Avatar,
  AvatarGroup,
  Tag,
  TagLabel,
  TagCloseButton,
  Stack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Code,
  Link,
  Center,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from '@chakra-ui/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Image,
  Video,
  BookOpen,
  Calendar,
  Settings,
  RefreshCw,
  Download,
  Share,
  Copy,
  ExternalLink,
  RotateCcw,
  Undo2,
  Redo2,
  Layers,
  Palette,
  Move,
  MousePointer,
  PenTool,
  Eraser,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Plus,
  Save,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  HelpCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  Heart,
  Flag,
  Home,
  School,
  GraduationCap,
  Crown,
  Medal,
  Badge as BadgeIcon,
  User,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MapPin,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  MapPin as MapPinIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  User as UserIcon,
  Users as UsersIcon,
  UserCheck as UserCheckIcon,
  UserX as UserXIcon,
  Crown as CrownIcon,
  Zap as ZapIcon,
  BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  BookOpen as BookOpenIcon,
  Trophy as TrophyIcon,
  Medal as MedalIcon,
  Flag as FlagIcon,
  Home as HomeIcon,
  School as SchoolIcon,
  GraduationCap as GraduationCapIcon,
  Shield,
  Sword,
  Target,
  Play,
  Users,
  Clock,
  Star,
  Award,
  Trophy,
  Brain,
  Sparkles,
  Zap,
  Shield as ShieldIcon,
  Sword as SwordIcon,
  Target as TargetIcon,
  Play as PlayIcon,
  Users as UsersIcon2,
  Clock as ClockIcon2,
  Star as StarIcon,
  Award as AwardIcon,
  Trophy as TrophyIcon2,
  Brain as BrainIcon,
  Sparkles as SparklesIcon,
  Zap as ZapIcon2,
} from 'lucide-react';

// Types
interface ErrorData {
  id: string;
  message: string;
  level: 'error' | 'warning' | 'info';
  timestamp: Date;
  user: string;
  component: string;
  stackTrace: string;
  resolved: boolean;
  count: number;
}

interface PerformanceData {
  id: string;
  component: string;
  renderTime: number;
  memoryUsage: number;
  timestamp: Date;
  user: string;
  action: string;
}

interface UserActivity {
  id: string;
  user: string;
  action: string;
  component: string;
  timestamp: Date;
  duration: number;
  success: boolean;
}

const MonitoringDashboard: React.FC = () => {
  // State
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [performance, setPerformance] = useState<PerformanceData[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  // Refs
  const toast = useToast();

  // Color values
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Load data on mount
  useEffect(() => {
    loadData();
    
    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockErrors: ErrorData[] = [
        {
          id: 'error-1',
          message: 'Failed to load user profile',
          level: 'error',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          user: 'user123',
          component: 'UserProfile',
          stackTrace: 'Error: Cannot read property of undefined\n    at UserProfile.tsx:45',
          resolved: false,
          count: 3,
        },
        {
          id: 'error-2',
          message: 'Network timeout on playbook save',
          level: 'warning',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          user: 'user456',
          component: 'PlaybookDesigner',
          stackTrace: 'TimeoutError: Request timeout\n    at api.ts:123',
          resolved: true,
          count: 1,
        },
      ];

      const mockPerformance: PerformanceData[] = [
        {
          id: 'perf-1',
          component: 'MVPDashboard',
          renderTime: 120,
          memoryUsage: 45.2,
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          user: 'user123',
          action: 'navigate_to_dashboard',
        },
        {
          id: 'perf-2',
          component: 'PlaybookDesigner',
          renderTime: 250,
          memoryUsage: 67.8,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          user: 'user456',
          action: 'create_new_play',
        },
      ];

      const mockUserActivity: UserActivity[] = [
        {
          id: 'activity-1',
          user: 'user123',
          action: 'login',
          component: 'Auth',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          duration: 1200,
          success: true,
        },
        {
          id: 'activity-2',
          user: 'user456',
          action: 'create_play',
          component: 'PlaybookDesigner',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          duration: 4500,
          success: true,
        },
      ];

      setErrors(mockErrors);
      setPerformance(mockPerformance);
      setUserActivity(mockUserActivity);
    } catch (error) {
      setError('Failed to load monitoring data');
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorColor = (level: string) => {
    switch (level) {
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  const getErrorIcon = (level: string) => {
    switch (level) {
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Info;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (isLoading) {
    return (
      <Box p={6}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="60px" />
          <Skeleton height="200px" />
          <Skeleton height="300px" />
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      {/* Header */}
      <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} p={4}>
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <HStack>
              <Heading size="lg" color="gray.800">
                Monitoring Dashboard
              </Heading>
              <Badge colorScheme="green" variant="subtle">
                LIVE
              </Badge>
            </HStack>
            <Text color="gray.600">
              Real-time monitoring of errors, performance, and user activity
            </Text>
          </VStack>
          
          <HStack spacing={3}>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
                Auto Refresh
              </FormLabel>
              <Switch
                id="auto-refresh"
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            </FormControl>
            <Button
              leftIcon={<RefreshCw />}
              variant="outline"
              onClick={loadData}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Settings />}
              variant="outline"
            >
              Settings
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Box p={6}>
        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Errors</Tab>
            <Tab>Performance</Tab>
            <Tab>User Activity</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                {/* Key Metrics */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Active Users</StatLabel>
                        <StatNumber>1,234</StatNumber>
                        <StatHelpText>
                          <StatArrow type="increase" />
                          12% from last hour
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>

                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Error Rate</StatLabel>
                        <StatNumber>0.2%</StatNumber>
                        <StatHelpText>
                          <StatArrow type="decrease" />
                          0.1% from last hour
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>

                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Avg Response Time</StatLabel>
                        <StatNumber>145ms</StatNumber>
                        <StatHelpText>
                          <StatArrow type="decrease" />
                          23ms from last hour
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>

                  <Card bg={bgColor} border="1px" borderColor={borderColor}>
                    <CardBody>
                      <Stat>
                        <StatLabel>Uptime</StatLabel>
                        <StatNumber>99.9%</StatNumber>
                        <StatHelpText>
                          <StatArrow type="increase" />
                          Last 30 days
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                {/* Recent Activity */}
                <Card bg={bgColor} border="1px" borderColor={borderColor}>
                  <CardHeader>
                    <Heading size="md">Recent Activity</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      {userActivity.slice(0, 5).map((activity) => (
                        <HStack key={activity.id} justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={CheckCircle} boxSize={4} color="green.500" />
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="semibold">
                                {activity.user} - {activity.action}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                {activity.component}
                              </Text>
                            </VStack>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {formatTimestamp(activity.timestamp)}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Errors Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                <Card bg={bgColor} border="1px" borderColor={borderColor}>
                  <CardHeader>
                    <Heading size="md">Error Logs</Heading>
                  </CardHeader>
                  <CardBody>
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Level</Th>
                            <Th>Message</Th>
                            <Th>Component</Th>
                            <Th>User</Th>
                            <Th>Count</Th>
                            <Th>Timestamp</Th>
                            <Th>Status</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {errors.map((error) => {
                            const ErrorIcon = getErrorIcon(error.level);
                            return (
                              <Tr key={error.id}>
                                <Td>
                                  <HStack spacing={2}>
                                    <Icon as={ErrorIcon} boxSize={4} color={`${getErrorColor(error.level)}.500`} />
                                    <Badge colorScheme={getErrorColor(error.level)} size="sm">
                                      {error.level}
                                    </Badge>
                                  </HStack>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" noOfLines={1}>
                                    {error.message}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm">{error.component}</Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm">{error.user}</Text>
                                </Td>
                                <Td>
                                  <Badge colorScheme="gray" variant="subtle">
                                    {error.count}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Text fontSize="xs" color="gray.500">
                                    {formatTimestamp(error.timestamp)}
                                  </Text>
                                </Td>
                                <Td>
                                  <Badge colorScheme={error.resolved ? 'green' : 'red'} variant="subtle">
                                    {error.resolved ? 'Resolved' : 'Open'}
                                  </Badge>
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Performance Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                <Card bg={bgColor} border="1px" borderColor={borderColor}>
                  <CardHeader>
                    <Heading size="md">Performance Metrics</Heading>
                  </CardHeader>
                  <CardBody>
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Component</Th>
                            <Th>Render Time</Th>
                            <Th>Memory Usage</Th>
                            <Th>User</Th>
                            <Th>Action</Th>
                            <Th>Timestamp</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {performance.map((perf) => (
                            <Tr key={perf.id}>
                              <Td>
                                <Text fontSize="sm" fontWeight="semibold">
                                  {perf.component}
                                </Text>
                              </Td>
                              <Td>
                                <HStack spacing={2}>
                                  <Text fontSize="sm">{formatDuration(perf.renderTime)}</Text>
                                  {perf.renderTime > 200 && (
                                    <Badge colorScheme="yellow" size="sm">
                                      Slow
                                    </Badge>
                                  )}
                                </HStack>
                              </Td>
                              <Td>
                                <Text fontSize="sm">{perf.memoryUsage.toFixed(1)} MB</Text>
                              </Td>
                              <Td>
                                <Text fontSize="sm">{perf.user}</Text>
                              </Td>
                              <Td>
                                <Text fontSize="sm">{perf.action}</Text>
                              </Td>
                              <Td>
                                <Text fontSize="xs" color="gray.500">
                                  {formatTimestamp(perf.timestamp)}
                                </Text>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* User Activity Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={6} align="stretch">
                <Card bg={bgColor} border="1px" borderColor={borderColor}>
                  <CardHeader>
                    <Heading size="md">User Activity</Heading>
                  </CardHeader>
                  <CardBody>
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>User</Th>
                            <Th>Action</Th>
                            <Th>Component</Th>
                            <Th>Duration</Th>
                            <Th>Status</Th>
                            <Th>Timestamp</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {userActivity.map((activity) => (
                            <Tr key={activity.id}>
                              <Td>
                                <Text fontSize="sm" fontWeight="semibold">
                                  {activity.user}
                                </Text>
                              </Td>
                              <Td>
                                <Text fontSize="sm">{activity.action}</Text>
                              </Td>
                              <Td>
                                <Text fontSize="sm">{activity.component}</Text>
                              </Td>
                              <Td>
                                <Text fontSize="sm">{formatDuration(activity.duration)}</Text>
                              </Td>
                              <Td>
                                <HStack spacing={2}>
                                  <Icon 
                                    as={activity.success ? CheckCircle : XCircle} 
                                    boxSize={4} 
                                    color={activity.success ? 'green.500' : 'red.500'} 
                                  />
                                  <Text fontSize="sm">
                                    {activity.success ? 'Success' : 'Failed'}
                                  </Text>
                                </HStack>
                              </Td>
                              <Td>
                                <Text fontSize="xs" color="gray.500">
                                  {formatTimestamp(activity.timestamp)}
                                </Text>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default MonitoringDashboard;