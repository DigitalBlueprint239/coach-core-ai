import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Icon,
  Heading,
  Flex,
  Grid,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  List,
  ListItem,
  ListIcon,
  Code,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Input,
  Textarea
} from '@chakra-ui/react';
import {
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  BarChart3,
  Cpu,
  Database,
  Network,
  Shield,
  RefreshCw,
  Play,
  Pause,
  Activity,
  Gauge,
  Target,
  Lightbulb,
  MessageSquare,
  FileText,
  Users,
  Calendar,
  Award,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { StopCircle as Stop } from 'lucide-react';
// Note: decoupled from enhanced AI service for now to allow clean builds

interface AIBrainMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  activeModels: number;
  cacheHitRate: number;
  errorRate: number;
  costPerDay: number;
  tokensUsed: number;
}

interface AIInsight {
  id: string;
  type: 'performance' | 'suggestion' | 'alert' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actionable: boolean;
  action?: string;
}

interface AIModelStatus {
  name: string;
  status: 'active' | 'idle' | 'error' | 'maintenance';
  performance: number;
  lastUsed: Date;
  requestsToday: number;
  averageLatency: number;
}

const AIBrainDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AIBrainMetrics>({
    totalRequests: 1247,
    successRate: 94.2,
    averageResponseTime: 2.3,
    activeModels: 3,
    cacheHitRate: 67.8,
    errorRate: 5.8,
    costPerDay: 12.45,
    tokensUsed: 45678
  });

  const [insights, setInsights] = useState<AIInsight[]>([
    {
      id: '1',
      type: 'optimization',
      title: 'Cache Performance Improving',
      description: 'Cache hit rate increased by 15% this week, reducing API calls and costs.',
      confidence: 0.92,
      priority: 'medium',
      timestamp: new Date(),
      actionable: false
    },
    {
      id: '2',
      type: 'alert',
      title: 'High Error Rate Detected',
      description: 'Error rate spiked to 8.2% in the last hour. Check API connectivity.',
      confidence: 0.89,
      priority: 'high',
      timestamp: new Date(Date.now() - 3600000),
      actionable: true,
      action: 'Investigate API Issues'
    },
    {
      id: '3',
      type: 'suggestion',
      title: 'Model Optimization Opportunity',
      description: 'Consider switching to GPT-4o for better performance on complex queries.',
      confidence: 0.76,
      priority: 'medium',
      timestamp: new Date(Date.now() - 7200000),
      actionable: true,
      action: 'Upgrade Model'
    }
  ]);

  const [modelStatus, setModelStatus] = useState<AIModelStatus[]>([
    {
      name: 'GPT-4',
      status: 'active',
      performance: 94.2,
      lastUsed: new Date(),
      requestsToday: 456,
      averageLatency: 2.1
    },
    {
      name: 'GPT-3.5-turbo',
      status: 'idle',
      performance: 87.6,
      lastUsed: new Date(Date.now() - 3600000),
      requestsToday: 234,
      averageLatency: 1.8
    },
    {
      name: 'GPT-4o',
      status: 'maintenance',
      performance: 96.1,
      lastUsed: new Date(Date.now() - 7200000),
      requestsToday: 89,
      averageLatency: 1.9
    }
  ]);

  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedModel, setSelectedModel] = useState('GPT-4');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Simulate real-time updates
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 5),
        successRate: Math.max(85, Math.min(98, prev.successRate + (Math.random() - 0.5) * 2)),
        averageResponseTime: Math.max(1.5, Math.min(4, prev.averageResponseTime + (Math.random() - 0.5) * 0.3)),
        cacheHitRate: Math.max(60, Math.min(80, prev.cacheHitRate + (Math.random() - 0.5) * 3)),
        errorRate: Math.max(2, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 2)),
        costPerDay: prev.costPerDay + Math.random() * 0.5,
        tokensUsed: prev.tokensUsed + Math.floor(Math.random() * 100)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const handleAction = (insight: AIInsight) => {
    toast({
      title: 'Action Executed',
      description: `Executed action: ${insight.action}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'idle': return 'yellow';
      case 'error': return 'red';
      case 'maintenance': return 'orange';
      default: return 'gray';
    }
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

  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      {/* Header */}
      <Box bg="white" borderRadius="lg" p={6} mb={6} shadow="sm">
        <Flex justify="space-between" align="center">
          <HStack>
            <Icon as={Brain} color="purple.600" boxSize={8} />
            <VStack align="start" spacing={0}>
              <Heading size="lg" color="purple.600">AI Brain Dashboard</Heading>
              <Text fontSize="sm" color="gray.600">Real-time AI system monitoring and insights</Text>
            </VStack>
          </HStack>
          
          <HStack spacing={4}>
            <HStack>
              <Icon as={Activity} color={isMonitoring ? "green.500" : "gray.400"} />
              <Text fontSize="sm">Live Monitoring</Text>
              <Switch 
                isChecked={isMonitoring} 
                onChange={(e) => setIsMonitoring(e.target.checked)}
                colorScheme="purple"
              />
            </HStack>
            <Button
              leftIcon={<RefreshCw />}
              colorScheme="purple"
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Settings />}
              colorScheme="purple"
              size="sm"
              onClick={onOpen}
            >
              Configure
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
        {/* Main Content */}
        <VStack spacing={6} align="stretch">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <Flex align="center" justify="space-between">
                <HStack>
                  <Icon as={Gauge} color="blue.500" />
                  <Heading size="md">Performance Metrics</Heading>
                </HStack>
                <Badge colorScheme="blue">Live</Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Stat>
                  <StatLabel>Success Rate</StatLabel>
                  <StatNumber>{metrics.successRate.toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    <Icon as={ArrowUp} color="green.500" boxSize={4} />
                    2.1% from last hour
                  </StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>Avg Response Time</StatLabel>
                  <StatNumber>{metrics.averageResponseTime.toFixed(1)}s</StatNumber>
                  <StatHelpText>
                    <Icon as={ArrowDown} color="red.500" boxSize={4} />
                    0.3s improvement
                  </StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>Cache Hit Rate</StatLabel>
                  <StatNumber>{metrics.cacheHitRate.toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    <Icon as={ArrowUp} color="green.500" boxSize={4} />
                    15% improvement
                  </StatHelpText>
                </Stat>
                
                <Stat>
                  <StatLabel>Error Rate</StatLabel>
                  <StatNumber>{metrics.errorRate.toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    <Icon as={ArrowDown} color="red.500" boxSize={4} />
                    1.2% reduction
                  </StatHelpText>
                </Stat>
              </Grid>
            </CardBody>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <Flex align="center" justify="space-between">
                <HStack>
                  <Icon as={Lightbulb} color="orange.500" />
                  <Heading size="md">AI Insights</Heading>
                </HStack>
                <Badge colorScheme="orange">{insights.length} Active</Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {insights.map((insight) => (
                  <Alert 
                    key={insight.id} 
                    status={insight.priority === 'critical' ? 'error' : insight.priority === 'high' ? 'warning' : 'info'}
                    borderRadius="md"
                  >
                    <AlertIcon />
                    <Box flex="1">
                      <Flex justify="space-between" align="start" mb={2}>
                        <AlertTitle>{insight.title}</AlertTitle>
                        <HStack>
                          <Badge colorScheme={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                          <Badge colorScheme="purple">
                            {(insight.confidence * 100).toFixed(0)}%
                          </Badge>
                        </HStack>
                      </Flex>
                      <AlertDescription mb={2}>
                        {insight.description}
                      </AlertDescription>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="gray.600">
                          {insight.timestamp.toLocaleTimeString()}
                        </Text>
                        {insight.actionable && insight.action && (
                          <Button
                            size="sm"
                            colorScheme="purple"
                            variant="outline"
                            onClick={() => handleAction(insight)}
                          >
                            {insight.action}
                          </Button>
                        )}
                      </HStack>
                    </Box>
                  </Alert>
                ))}
              </VStack>
            </CardBody>
          </Card>

          {/* Model Status */}
          <Card>
            <CardHeader>
              <Flex align="center" justify="space-between">
                <HStack>
                  <Icon as={Cpu} color="green.500" />
                  <Heading size="md">Model Status</Heading>
                </HStack>
                <Badge colorScheme="green">{modelStatus.filter(m => m.status === 'active').length} Active</Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Model</Th>
                    <Th>Status</Th>
                    <Th>Performance</Th>
                    <Th>Requests Today</Th>
                    <Th>Avg Latency</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {modelStatus.map((model) => (
                    <Tr key={model.name}>
                      <Td fontWeight="medium">{model.name}</Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(model.status)}>
                          {model.status}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack>
                          <Progress 
                            value={model.performance} 
                            size="sm" 
                            colorScheme="green" 
                            flex={1}
                          />
                          <Text fontSize="sm">{model.performance.toFixed(1)}%</Text>
                        </HStack>
                      </Td>
                      <Td>{model.requestsToday}</Td>
                      <Td>{model.averageLatency.toFixed(1)}s</Td>
                      <Td>
                        <HStack>
                          <Tooltip label="Start">
                            <IconButton
                              size="sm"
                              icon={<Play />}
                              aria-label="Start model"
                              colorScheme="green"
                              variant="ghost"
                            />
                          </Tooltip>
                          <Tooltip label="Pause">
                            <IconButton
                              size="sm"
                              icon={<Pause />}
                              aria-label="Pause model"
                              colorScheme="yellow"
                              variant="ghost"
                            />
                          </Tooltip>
                          <Tooltip label="Stop">
                            <IconButton
                              size="sm"
                              icon={<Stop />}
                              aria-label="Stop model"
                              colorScheme="red"
                              variant="ghost"
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        </VStack>

        {/* Sidebar */}
        <VStack spacing={6} align="stretch">
          {/* System Health */}
          <Card>
            <CardHeader>
              <Heading size="md">System Health</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Flex justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">API Connectivity</Text>
                    <Badge colorScheme="green">Healthy</Badge>
                  </Flex>
                  <Progress value={95} colorScheme="green" size="sm" />
                </Box>
                
                <Box>
                  <Flex justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">Database</Text>
                    <Badge colorScheme="green">Connected</Badge>
                  </Flex>
                  <Progress value={88} colorScheme="green" size="sm" />
                </Box>
                
                <Box>
                  <Flex justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">Cache System</Text>
                    <Badge colorScheme="green">Optimal</Badge>
                  </Flex>
                  <Progress value={92} colorScheme="green" size="sm" />
                </Box>
                
                <Box>
                  <Flex justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">Memory Usage</Text>
                    <Badge colorScheme="yellow">Moderate</Badge>
                  </Flex>
                  <Progress value={67} colorScheme="yellow" size="sm" />
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Cost Analysis */}
          <Card>
            <CardHeader>
              <Heading size="md">Cost Analysis</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Stat>
                  <StatLabel>Today's Cost</StatLabel>
                  <StatNumber>${metrics.costPerDay.toFixed(2)}</StatNumber>
                  <StatHelpText>
                    <Icon as={ArrowUp} color="green.500" boxSize={4} />
                    +5% this week
                  </StatHelpText>
                </Stat>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Token Usage</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                    {metrics.tokensUsed.toLocaleString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600">tokens used today</Text>
                </Box>
                
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Cost Breakdown</Text>
                  <List spacing={2}>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontSize="sm">GPT-4 Requests</Text>
                        <Text fontSize="sm" fontWeight="medium">$8.45</Text>
                      </Flex>
                    </ListItem>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontSize="sm">GPT-3.5 Requests</Text>
                        <Text fontSize="sm" fontWeight="medium">$3.20</Text>
                      </Flex>
                    </ListItem>
                    <ListItem>
                      <Flex justify="space-between">
                        <Text fontSize="sm">Storage & Cache</Text>
                        <Text fontSize="sm" fontWeight="medium">$0.80</Text>
                      </Flex>
                    </ListItem>
                  </List>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <Heading size="md">Quick Actions</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3}>
                <Button leftIcon={<RefreshCw />} colorScheme="blue" size="sm" w="full">
                  Clear Cache
                </Button>
                <Button leftIcon={<Shield />} colorScheme="green" size="sm" w="full">
                  Security Scan
                </Button>
                <Button leftIcon={<Database />} colorScheme="purple" size="sm" w="full">
                  Backup Data
                </Button>
                <Button leftIcon={<BarChart3 />} colorScheme="orange" size="sm" w="full">
                  Generate Report
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Grid>

      {/* Configuration Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>AI Brain Configuration</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs>
              <TabList>
                <Tab>Models</Tab>
                <Tab>Performance</Tab>
                <Tab>Security</Tab>
                <Tab>Monitoring</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Default Model</FormLabel>
                      <Select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                        <option value="GPT-4">GPT-4</option>
                        <option value="GPT-3.5-turbo">GPT-3.5-turbo</option>
                        <option value="GPT-4o">GPT-4o</option>
                      </Select>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Max Tokens</FormLabel>
                      <Input type="number" defaultValue={1500} />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Temperature</FormLabel>
                      <Input type="number" step="0.1" defaultValue={0.7} />
                    </FormControl>
                  </VStack>
                </TabPanel>
                
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Cache TTL (minutes)</FormLabel>
                      <Input type="number" defaultValue={5} />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Rate Limit (requests/minute)</FormLabel>
                      <Input type="number" defaultValue={60} />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Timeout (seconds)</FormLabel>
                      <Input type="number" defaultValue={30} />
                    </FormControl>
                  </VStack>
                </TabPanel>
                
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable Safety Validation</FormLabel>
                      <Switch defaultChecked />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Content Filtering</FormLabel>
                      <Switch defaultChecked />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Audit Logging</FormLabel>
                      <Switch defaultChecked />
                    </FormControl>
                  </VStack>
                </TabPanel>
                
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Real-time Monitoring</FormLabel>
                      <Switch isChecked={isMonitoring} onChange={(e) => setIsMonitoring(e.target.checked)} />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Alert Threshold (%)</FormLabel>
                      <Input type="number" defaultValue={10} />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Update Interval (seconds)</FormLabel>
                      <Input type="number" defaultValue={5} />
                    </FormControl>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AIBrainDashboard; 