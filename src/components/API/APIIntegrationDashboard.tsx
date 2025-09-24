// @ts-nocheck
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
  SimpleGrid,
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
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import apiIntegrationManager, {
  IntegrationStatus,
  IntegrationConfig,
  APIMetrics,
} from '../../services/api/api-integration-manager';

const APIIntegrationDashboard: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [metrics, setMetrics] = useState<APIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationConfig | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, boolean>>(
    new Map()
  );
  const [isTesting, setIsTesting] = useState(false);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [integrationsData, statusesData, metricsData] = await Promise.all([
        Promise.resolve(apiIntegrationManager.getAllIntegrations()),
        Promise.resolve(apiIntegrationManager.getAllIntegrationStatuses()),
        Promise.resolve(apiIntegrationManager.getMetrics()),
      ]);

      setIntegrations(integrationsData);
      setStatuses(statusesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load API integration data:', error);
    }
  };

  const handleTestIntegration = async (name: string) => {
    setIsTesting(true);
    try {
      const result = await apiIntegrationManager.testIntegration(name);
      setTestResults(prev => new Map(prev.set(name, result)));

      toast({
        title: `Integration Test ${result ? 'Passed' : 'Failed'}`,
        description: result ? 'Connection successful' : 'Connection failed',
        status: result ? 'success' : 'error',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      setTestResults(prev => new Map(prev.set(name, false)));
      toast({
        title: 'Integration Test Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsTesting(false);
      await loadData(); // Refresh data after test
    }
  };

  const handleTestAllIntegrations = async () => {
    setIsTesting(true);
    try {
      const results = await apiIntegrationManager.testAllIntegrations();
      setTestResults(results);

      const successCount = Array.from(results.values()).filter(Boolean).length;
      const totalCount = results.size;

      toast({
        title: 'All Integrations Tested',
        description: `${successCount}/${totalCount} integrations passed`,
        status: successCount === totalCount ? 'success' : 'warning',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Integration Tests Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsTesting(false);
      await loadData(); // Refresh data after tests
    }
  };

  const handleSyncIntegration = async (name: string) => {
    try {
      await apiIntegrationManager.syncIntegration(name);
      toast({
        title: 'Sync Initiated',
        description: `Data sync started for ${name}`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      await loadData(); // Refresh data after sync
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'error':
        return 'red';
      case 'disconnected':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return XCircle;
      case 'disconnected':
        return WifiOff;
      default:
        return Info;
    }
  };

  const getIntegrationIcon = (name: string) => {
    switch (name) {
      case 'weather':
        return CloudRain;
      case 'hudl':
        return Video;
      case 'youtube':
        return Video;
      case 'vimeo':
        return Video;
      case 'fitbit':
        return Heart;
      case 'garmin':
        return Watch;
      case 'apple-healthkit':
        return Smartphone;
      case 'google-fit':
        return Smartphone;
      default:
        return Cloud;
    }
  };

  const getOverallHealth = () => {
    return apiIntegrationManager.getOverallHealth();
  };

  const getOverallHealthColor = () => {
    const health = getOverallHealth();
    switch (health) {
      case 'healthy':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getOverallHealthIcon = () => {
    const health = getOverallHealth();
    switch (health) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return XCircle;
      default:
        return Info;
    }
  };

  return (
    <Box p={6} maxW="8xl" mx="auto">
      {/* Header */}
      <Box mb={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" color="gray.800" mb={2}>
              API Integration Dashboard
            </Heading>
            <Text color="gray.600">
              Monitor and manage all third-party API integrations
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
              leftIcon={<Icon as={Play} />}
              onClick={handleTestAllIntegrations}
              isLoading={isTesting}
              colorScheme="blue"
              size="sm"
            >
              Test All
            </Button>
          </HStack>
        </Flex>

        {/* Overall Health Status */}
        <Card bg={bgColor} border="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <HStack spacing={6} align="center">
              <Icon
                as={getOverallHealthIcon()}
                boxSize={8}
                color={`${getOverallHealthColor()}.500`}
              />
              <Box>
                <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                  Overall System Health: {getOverallHealth().toUpperCase()}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {statuses.filter(s => s.isEnabled).length} integrations active
                </Text>
              </Box>
              <Spacer />
              <HStack spacing={4}>
                <Stat>
                  <StatLabel color="gray.600">Active</StatLabel>
                  <StatNumber color="green.600">
                    {
                      statuses.filter(
                        s => s.isEnabled && s.status === 'healthy'
                      ).length
                    }
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel color="gray.600">Warning</StatLabel>
                  <StatNumber color="yellow.600">
                    {
                      statuses.filter(
                        s => s.isEnabled && s.status === 'warning'
                      ).length
                    }
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel color="gray.600">Error</StatLabel>
                  <StatNumber color="red.600">
                    {
                      statuses.filter(s => s.isEnabled && s.status === 'error')
                        .length
                    }
                  </StatNumber>
                </Stat>
              </HStack>
            </HStack>
          </CardBody>
        </Card>
      </Box>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>
            <Icon as={Activity} mr={2} />
            Overview
          </Tab>
          <Tab>
            <Icon as={Settings} mr={2} />
            Configuration
          </Tab>
          <Tab>
            <Icon as={BarChart3} mr={2} />
            Metrics
          </Tab>
          <Tab>
            <Icon as={Database} mr={2} />
            Logs
          </Tab>
        </TabList>

        <TabPanels>
          {/* Overview Tab */}
          <TabPanel>
            <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
              {/* Integrations List */}
              <VStack spacing={6} align="stretch">
                <Heading size="md" color="gray.800">
                  Active Integrations
                </Heading>

                {integrations.map(integration => {
                  const status = statuses.find(
                    s => s.name === integration.name
                  );
                  return (
                    <Card
                      key={integration.name}
                      bg={bgColor}
                      border="1px"
                      borderColor={borderColor}
                      shadow="sm"
                    >
                      <CardBody>
                        <HStack spacing={4} align="center">
                          <Icon
                            as={getIntegrationIcon(integration.name)}
                            boxSize={6}
                            color="blue.500"
                          />

                          <Box flex={1}>
                            <HStack justify="space-between" mb={2}>
                              <Text
                                fontWeight="semibold"
                                color="gray.800"
                                textTransform="capitalize"
                              >
                                {integration.name.replace('-', ' ')}
                              </Text>
                              <Badge
                                colorScheme={getStatusColor(
                                  status?.status || 'disconnected'
                                )}
                                variant="subtle"
                              >
                                {status?.status || 'disconnected'}
                              </Badge>
                            </HStack>

                            <Text fontSize="sm" color="gray.600" mb={2}>
                              {integration.baseURL}
                            </Text>

                            <HStack spacing={4} fontSize="xs" color="gray.500">
                              <Text>
                                Auto-sync: {integration.autoSync ? 'Yes' : 'No'}
                              </Text>
                              {integration.autoSync && (
                                <Text>
                                  Interval: {integration.syncInterval} min
                                </Text>
                              )}
                              <Text>Timeout: {integration.timeout}ms</Text>
                            </HStack>
                          </Box>

                          <VStack spacing={2}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleTestIntegration(integration.name)
                              }
                              isLoading={isTesting}
                              leftIcon={<Icon as={RefreshCw} />}
                            >
                              Test
                            </Button>

                            {integration.autoSync && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleSyncIntegration(integration.name)
                                }
                                leftIcon={<Icon as={Upload} />}
                              >
                                Sync
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedIntegration(integration);
                                setIsConfigModalOpen(true);
                              }}
                              leftIcon={<Icon as={Edit} />}
                            >
                              Config
                            </Button>
                          </VStack>
                        </HStack>

                        {status && (
                          <Box mt={4} p={3} bg={cardBg} borderRadius="lg">
                            <HStack justify="space-between" mb={2}>
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color="gray.700"
                              >
                                Status Details
                              </Text>
                              <Icon
                                as={getStatusIcon(status.status)}
                                color={`${getStatusColor(status.status)}.500`}
                                boxSize={4}
                              />
                            </HStack>

                            <Text fontSize="sm" color="gray.600" mb={2}>
                              {status.message}
                            </Text>

                            <HStack spacing={4} fontSize="xs" color="gray.500">
                              <Text>
                                Connected: {status.isConnected ? 'Yes' : 'No'}
                              </Text>
                              {status.lastSync && (
                                <Text>
                                  Last sync: {status.lastSync.toLocaleString()}
                                </Text>
                              )}
                              {status.errorCount > 0 && (
                                <Text>Errors: {status.errorCount}</Text>
                              )}
                            </HStack>
                          </Box>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
              </VStack>

              {/* Quick Actions & Stats */}
              <VStack spacing={6} align="stretch">
                {/* Quick Actions */}
                <Card
                  bg={bgColor}
                  border="1px"
                  borderColor={borderColor}
                  shadow="sm"
                >
                  <CardHeader>
                    <Heading size="md" color="gray.800">
                      <Icon as={Zap} mr={2} color="blue.500" />
                      Quick Actions
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <Button
                        leftIcon={<Icon as={RefreshCw} />}
                        onClick={handleTestAllIntegrations}
                        isLoading={isTesting}
                        colorScheme="blue"
                        size="lg"
                        borderRadius="xl"
                      >
                        Test All Integrations
                      </Button>

                      <Button
                        leftIcon={<Icon as={Upload} />}
                        variant="outline"
                        size="lg"
                        borderRadius="xl"
                      >
                        Sync All Data
                      </Button>

                      <Button
                        leftIcon={<Icon as={Download} />}
                        variant="outline"
                        size="lg"
                        borderRadius="xl"
                      >
                        Export Configuration
                      </Button>

                      <Button
                        leftIcon={<Icon as={Settings} />}
                        variant="outline"
                        size="lg"
                        borderRadius="xl"
                      >
                        Global Settings
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                {/* System Metrics */}
                {metrics && (
                  <Card
                    bg={bgColor}
                    border="1px"
                    borderColor={borderColor}
                    shadow="sm"
                  >
                    <CardHeader>
                      <Heading size="md" color="gray.800">
                        <Icon as={BarChart3} mr={2} color="blue.500" />
                        System Metrics
                      </Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Stat>
                          <StatLabel color="gray.600">Total Requests</StatLabel>
                          <StatNumber color="blue.600">
                            {metrics.totalRequests}
                          </StatNumber>
                        </Stat>

                        <Stat>
                          <StatLabel color="gray.600">Success Rate</StatLabel>
                          <StatNumber color="green.600">
                            {metrics.totalRequests > 0
                              ? Math.round(
                                  (metrics.successfulRequests /
                                    metrics.totalRequests) *
                                    100
                                )
                              : 0}
                            %
                          </StatNumber>
                          <StatHelpText>
                            <Icon as={ArrowUp} color="green.500" boxSize={4} />
                            +15% this week
                          </StatHelpText>
                        </Stat>

                        <Stat>
                          <StatLabel color="gray.600">
                            Avg Response Time
                          </StatLabel>
                          <StatNumber color="purple.600">
                            {Math.round(metrics.averageResponseTime)}ms
                          </StatNumber>
                        </Stat>

                        <Stat>
                          <StatLabel color="gray.600">Cache Hit Rate</StatLabel>
                          <StatNumber color="orange.600">
                            {Math.round(metrics.cacheHitRate * 100)}%
                          </StatNumber>
                        </Stat>

                        <Text fontSize="xs" color="gray.500" textAlign="center">
                          Last updated: {metrics.lastUpdated.toLocaleString()}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </Grid>
          </TabPanel>

          {/* Configuration Tab */}
          <TabPanel>
            <Box textAlign="center" py={12}>
              <Icon as={Settings} boxSize={16} color="gray.400" mb={4} />
              <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                Integration Configuration
              </Text>
              <Text color="gray.500">
                Configure API keys, endpoints, and sync settings for each
                integration. Coming soon with full configuration management.
              </Text>
            </Box>
          </TabPanel>

          {/* Metrics Tab */}
          <TabPanel>
            <Box textAlign="center" py={12}>
              <Icon as={BarChart3} boxSize={16} color="gray.400" mb={4} />
              <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                Detailed Metrics
              </Text>
              <Text color="gray.500">
                Comprehensive analytics and performance metrics for all API
                integrations. Coming soon with detailed charts and insights.
              </Text>
            </Box>
          </TabPanel>

          {/* Logs Tab */}
          <TabPanel>
            <Box textAlign="center" py={12}>
              <Icon as={Database} boxSize={16} color="gray.400" mb={4} />
              <Text fontSize="xl" fontWeight="bold" color="gray.600" mb={2}>
                Integration Logs
              </Text>
              <Text color="gray.500">
                Detailed logs and error tracking for all API operations. Coming
                soon with comprehensive logging and debugging tools.
              </Text>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Configuration Modal */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        size="xl"
      >
        <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.300" />
        <ModalContent
          bg={bgColor}
          borderRadius="2xl"
          shadow="2xl"
          border="1px"
          borderColor={borderColor}
        >
          <ModalHeader>
            Configure {selectedIntegration?.name.replace('-', ' ')} Integration
          </ModalHeader>
          <ModalBody>
            {selectedIntegration && (
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>API Key</FormLabel>
                  <Input
                    value={selectedIntegration.apiKey}
                    placeholder="Enter API key"
                    type="password"
                  />
                  <FormHelperText>Your API key for this service</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Base URL</FormLabel>
                  <Input
                    value={selectedIntegration.baseURL}
                    placeholder="https://api.service.com"
                  />
                  <FormHelperText>Base URL for API endpoints</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Auto Sync</FormLabel>
                  <Switch
                    isChecked={selectedIntegration.autoSync}
                    onChange={e => {
                      // Handle auto sync toggle
                    }}
                  />
                  <FormHelperText>
                    Automatically sync data at regular intervals
                  </FormHelperText>
                </FormControl>

                {selectedIntegration.autoSync && (
                  <FormControl>
                    <FormLabel>Sync Interval (minutes)</FormLabel>
                    <NumberInput
                      value={selectedIntegration.syncInterval}
                      min={1}
                      max={1440}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormHelperText>
                      How often to sync data (1-1440 minutes)
                    </FormHelperText>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <NumberInput
                    value={selectedIntegration.timeout}
                    min={1000}
                    max={60000}
                    step={1000}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <FormHelperText>
                    Request timeout in milliseconds
                  </FormHelperText>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setIsConfigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button colorScheme="blue">Save Configuration</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default APIIntegrationDashboard;
// @ts-nocheck
