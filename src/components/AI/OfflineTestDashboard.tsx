import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Switch,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  CloudOff,
  Download,
  History,
  Layers,
  Radio,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import aiService from '../../services/ai/ai-service';
import { offlineSimulator } from '../../test/offline-simulator';
import { generateMockTeamContext } from '../../test/mock-data-generator';
import { validatePracticePlan } from '../../utils/plan-validator';
import { DEFAULT_FALLBACK_PLAY } from './PlayGeneratorTestHarness';

interface RequestRecord {
  id: string;
  timestamp: number;
  status: 'queued' | 'processed' | 'failed';
  message: string;
}

interface OfflineTestDashboardProps {
  enabled?: boolean;
}

const NETWORK_COLORS: Record<string, string> = {
  online: 'green',
  offline: 'red',
  flaky: 'yellow',
  slow: 'yellow',
};

const isDevEnvironment = process.env.NODE_ENV !== 'production';

export const OfflineTestDashboard: React.FC<OfflineTestDashboardProps> = ({ enabled }) => {
  const allowRender = enabled ?? isDevEnvironment;
  const [networkMode, setNetworkMode] = useState<'online' | 'offline' | 'slow'>('online');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [queueRecords, setQueueRecords] = useState<RequestRecord[]>([]);
  const [history, setHistory] = useState<RequestRecord[]>([]);
  const [fallbackPreview, setFallbackPreview] = useState<string>('');
  const [metrics, setMetrics] = useState({ averageWaitMs: 0, successRate: 0 });

  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');

  const updateNetwork = (mode: 'online' | 'offline' | 'slow') => {
    switch (mode) {
      case 'online':
        offlineSimulator.goOnline();
        break;
      case 'offline':
        offlineSimulator.goOffline();
        break;
      case 'slow':
        offlineSimulator.simulateLatency(3000, 3000);
        break;
      default:
        break;
    }
    setNetworkMode(mode);
  };

  const queueLog = useMemo(() => offlineSimulator.getLogs(), [networkMode, queueRecords]);

  const refreshMetrics = () => {
    const total = history.length;
    const successes = history.filter(item => item.status === 'processed').length;
    const averageWaitMs = history.reduce((acc, record) => acc + (Date.now() - record.timestamp), 0) / Math.max(total, 1);
    setMetrics({
      averageWaitMs: Math.round(averageWaitMs),
      successRate: total > 0 ? Math.round((successes / total) * 100) : 0,
    });
  };

  const emulateRequest = async (label: string) => {
    setIsRunning(true);
    const requestId = `${label}-${Date.now()}`;
    setQueueRecords(prev => [...prev, { id: requestId, timestamp: Date.now(), status: 'queued', message: 'Pending' }]);

    try {
      const { request, teamContext } = generateMockTeamContext({ duration: 30 });
      const response = await aiService.generatePracticePlan(request);
      validatePracticePlan(response.plan, request);
      setHistory(prev => [
        { id: requestId, timestamp: Date.now(), status: 'processed', message: 'Processed successfully' },
        ...prev,
      ]);
    } catch (error) {
      setHistory(prev => [
        { id: requestId, timestamp: Date.now(), status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' },
        ...prev,
      ]);
    } finally {
      refreshMetrics();
      setIsRunning(false);
    }
  };

  const loadFallbackPreview = () => {
    const scenario = generateMockTeamContext({}).teamContext;
    const fallbackPlan = DEFAULT_FALLBACK_PLAY({
      id: 'fallback-preview',
      label: 'Fallback Preview',
      description: 'Preview fallback content',
      teamProfile: scenario,
      requirements: {
        objective: 'scoring',
        difficulty: 'intermediate',
        timeOnShotClock: 12,
        specialSituations: ['offline_mode'],
        playerCount: 5,
      },
      situation: {
        scoreDifferential: 0,
        ourScore: 0,
        theirScore: 0,
        timeRemainingSeconds: 90,
        possession: 'us',
        courtPosition: 'half_court',
        defenseScheme: 'man_to_man',
      },
    } as any);
    setFallbackPreview(JSON.stringify(fallbackPlan, null, 2));
  };

  if (!allowRender) {
    return null;
  }

  return (
    <Box bg={sectionBg} p={6} borderRadius="xl" shadow="lg">
      <Stack spacing={6}>
        <HStack justify="space-between" align="center">
          <Heading size="lg">Offline Mode Test Dashboard</Heading>
          <HStack spacing={4}>
            <Tooltip label="Generate practice plan in current network mode">
              <Button
                colorScheme="blue"
                leftIcon={<RefreshCw size={16} />}
                onClick={() => emulateRequest(networkMode)}
                isLoading={isRunning}
              >
                Run Test Request
              </Button>
            </Tooltip>
            <Tooltip label="Simulate queue persistence across refresh">
              <Button variant="outline" leftIcon={<Download size={16} />} onClick={() => offlineSimulator.clearLogs()}>
                Clear Queue Log
              </Button>
            </Tooltip>
          </HStack>
        </HStack>

        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <HStack justify="space-between" align="center">
              <Heading size="md">Network Controls</Heading>
              <Tag colorScheme={NETWORK_COLORS[networkMode] ?? 'gray'}>
                <TagLabel>{networkMode.toUpperCase()}</TagLabel>
              </Tag>
            </HStack>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Button leftIcon={<CheckCircle size={16} />} colorScheme="green" onClick={() => updateNetwork('online')}>
                Go Online
              </Button>
              <Button leftIcon={<CloudOff size={16} />} colorScheme="red" onClick={() => updateNetwork('offline')}>
                Go Offline
              </Button>
              <Button leftIcon={<Clock size={16} />} colorScheme="yellow" onClick={() => updateNetwork('slow')}>
                Simulate Slow (3s)
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Stat bg={cardBg} p={4} borderRadius="lg" shadow="sm">
            <StatLabel>Queue Size</StatLabel>
            <StatNumber>{queueLog.length}</StatNumber>
            <StatHelpText>Pending requests stored locally</StatHelpText>
          </Stat>
          <Stat bg={cardBg} p={4} borderRadius="lg" shadow="sm">
            <StatLabel>Average Wait</StatLabel>
            <StatNumber>{metrics.averageWaitMs} ms</StatNumber>
            <StatHelpText>Across processed requests</StatHelpText>
          </Stat>
          <Stat bg={cardBg} p={4} borderRadius="lg" shadow="sm">
            <StatLabel>Success Rate</StatLabel>
            <StatNumber>{metrics.successRate}%</StatNumber>
            <StatHelpText>Processed vs failed</StatHelpText>
          </Stat>
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
          <GridItem>
            <Card bg={cardBg} shadow="sm">
              <CardHeader>
                <HStack spacing={3} align="center">
                  <Icon as={Layers} />
                  <Heading size="sm">Queued Requests</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <Stack spacing={3} maxH="260px" overflowY="auto">
                  {queueLog.length === 0 && <Text color="gray.500">No queued requests.</Text>}
                  {queueLog.map(item => (
                    <Box key={`${item.requestId}-${item.timestamp}`} borderWidth="1px" borderRadius="md" p={3}>
                      <Text fontSize="sm" fontWeight="semibold">{item.requestId}</Text>
                      <Text fontSize="xs" color="gray.500">{new Date(item.timestamp).toLocaleString()}</Text>
                      <Text fontSize="xs" color="gray.600">Action: {item.action}</Text>
                    </Box>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg} shadow="sm">
              <CardHeader>
                <HStack spacing={3} align="center">
                  <Icon as={History} />
                  <Heading size="sm">Request History</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <Stack spacing={3} maxH="260px" overflowY="auto">
                  {history.length === 0 && <Text color="gray.500">No requests processed yet.</Text>}
                  {history.map(item => (
                    <Box key={item.id} borderWidth="1px" borderRadius="md" p={3} borderColor={item.status === 'processed' ? 'green.200' : item.status === 'failed' ? 'red.200' : 'gray.200'}>
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="semibold">{item.id}</Text>
                        <Badge colorScheme={item.status === 'processed' ? 'green' : item.status === 'failed' ? 'red' : 'yellow'}>{item.status.toUpperCase()}</Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">{item.message}</Text>
                    </Box>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        <Card bg={cardBg} shadow="sm">
          <CardHeader>
            <HStack spacing={3} align="center">
              <Icon as={Activity} />
              <Heading size="sm">Fallback Preview</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <Stack spacing={3}>
              <HStack justify="space-between" align="center">
                <Text color="gray.600">Template content shown to coaches when offline.</Text>
                <Button size="sm" leftIcon={<UploadCloud size={14} />} onClick={loadFallbackPreview}>
                  Refresh Preview
                </Button>
              </HStack>
              <Box as="pre" bg={useColorModeValue('gray.100', 'gray.700')} p={3} borderRadius="md" maxH="240px" overflowY="auto">
                {fallbackPreview || 'Click "Refresh Preview" to load fallback template.'}
              </Box>
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </Box>
  );
};

export default OfflineTestDashboard;
