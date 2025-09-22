import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  GridItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Tooltip,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {
  DownloadIcon,
  ExternalLinkIcon,
  RepeatIcon,
  CalendarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MinusIcon,
} from '@chakra-ui/icons';
import { lookerStudioService, KPI, DashboardData } from '../../services/analytics/looker-studio';
import { ga4Service } from '../../services/analytics/ga4-config';
import secureLogger from '../../utils/secure-logger';

// Analytics dashboard component
export const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily');
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange(dateRange);
      const data = await lookerStudioService.getDashboardData(
        startDate,
        endDate,
        granularity
      );

      if (data) {
        setDashboardData(data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      secureLogger.error('Failed to load dashboard data', { error: err });
    } finally {
      setIsLoading(false);
    }
  };

  // Load real-time data
  const loadRealTimeData = async () => {
    try {
      const data = await lookerStudioService.getRealTimeData();
      setRealTimeData(data);
    } catch (err) {
      secureLogger.error('Failed to load real-time data', { error: err });
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
    loadRealTimeData();
  }, [dateRange, granularity]);

  // Refresh real-time data every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadRealTimeData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get date range based on selection
  const getDateRange = (range: string) => {
    const now = new Date();
    const start = new Date(now);

    switch (range) {
      case '1d':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  };

  // Format KPI value
  const formatKPIValue = (kpi: KPI): string => {
    switch (kpi.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(kpi.value);
      case 'percentage':
        return `${kpi.value.toFixed(2)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(kpi.value);
      default:
        return kpi.value.toString();
    }
  };

  // Get change icon
  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <Icon as={ChevronUpIcon} color="green.500" />;
      case 'decrease':
        return <Icon as={ChevronDownIcon} color="red.500" />;
      default:
        return <Icon as={MinusIcon} color="gray.500" />;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!dashboardData) return;

    try {
      const csv = lookerStudioService.exportToCSV(dashboardData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-dashboard-${dateRange}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Dashboard data exported to CSV',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      secureLogger.error('Failed to export CSV', { error });
      toast({
        title: 'Export Failed',
        description: 'Failed to export dashboard data',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Open Looker Studio dashboard
  const handleOpenLookerStudio = () => {
    const embedUrl = lookerStudioService.getDashboardEmbedUrl();
    if (embedUrl) {
      window.open(embedUrl, '_blank');
    } else {
      toast({
        title: 'Dashboard Unavailable',
        description: 'Looker Studio dashboard not configured',
        status: 'warning',
        duration: 3000,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Box p={6}>
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading analytics data...</Text>
        </VStack>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button mt={4} onClick={loadDashboardData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <Heading size="lg" color={useColorModeValue('gray.800', 'white')}>
              Analytics Dashboard
            </Heading>
            <Text color={useColorModeValue('gray.600', 'gray.300')}>
              Track user behavior, conversions, and business metrics
            </Text>
          </VStack>
          <HStack spacing={4}>
            <Button
              leftIcon={<RepeatIcon />}
              onClick={loadDashboardData}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              leftIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              variant="outline"
            >
              Export CSV
            </Button>
            <Button
              leftIcon={<ExternalLinkIcon />}
              onClick={handleOpenLookerStudio}
              colorScheme="blue"
            >
              Open Looker Studio
            </Button>
          </HStack>
        </HStack>

        {/* Controls */}
        <Card>
          <CardBody>
            <HStack spacing={4}>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                width="200px"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </Select>
              <Select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as 'daily' | 'weekly')}
                width="150px"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </Select>
            </HStack>
          </CardBody>
        </Card>

        {/* Real-time Data */}
        {realTimeData && (
          <Card>
            <CardHeader>
              <Heading size="md">Real-time Activity</Heading>
            </CardHeader>
            <CardBody>
              <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                <Stat>
                  <StatLabel>Active Users</StatLabel>
                  <StatNumber>{realTimeData.activeUsers}</StatNumber>
                  <StatHelpText>Last hour</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Page Views</StatLabel>
                  <StatNumber>{realTimeData.pageViews}</StatNumber>
                  <StatHelpText>Last hour</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Events</StatLabel>
                  <StatNumber>{realTimeData.events}</StatNumber>
                  <StatHelpText>Last hour</StatHelpText>
                </Stat>
              </Grid>
            </CardBody>
          </Card>
        )}

        {/* Main Dashboard Content */}
        <Tabs>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Funnel Analysis</Tab>
            <Tab>Events</Tab>
            <Tab>User Segments</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* KPIs */}
                {dashboardData && (
                  <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
                    {dashboardData.kpis.map((kpi, index) => (
                      <Card key={index}>
                        <CardBody>
                          <VStack align="start" spacing={2}>
                            <HStack justify="space-between" width="100%">
                              <Text fontSize="sm" color="gray.500">
                                {kpi.name}
                              </Text>
                              <HStack spacing={1}>
                                {getChangeIcon(kpi.changeType)}
                                <Text
                                  fontSize="sm"
                                  color={
                                    kpi.changeType === 'increase'
                                      ? 'green.500'
                                      : kpi.changeType === 'decrease'
                                      ? 'red.500'
                                      : 'gray.500'
                                  }
                                >
                                  {kpi.change.toFixed(1)}%
                                </Text>
                              </HStack>
                            </HStack>
                            <Text fontSize="2xl" fontWeight="bold">
                              {formatKPIValue(kpi)}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {kpi.description}
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </Grid>
                )}

                {/* Trends Chart Placeholder */}
                <Card>
                  <CardHeader>
                    <Heading size="md">Trends</Heading>
                  </CardHeader>
                  <CardBody>
                    <Text color="gray.500">
                      Trends chart would be displayed here. This would show:
                    </Text>
                    <VStack align="start" spacing={2} mt={4}>
                      <Text fontSize="sm">• Page views over time</Text>
                      <Text fontSize="sm">• Signups over time</Text>
                      <Text fontSize="sm">• Subscriptions over time</Text>
                      <Text fontSize="sm">• Revenue over time</Text>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Funnel Analysis Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {dashboardData && (
                  <Card>
                    <CardHeader>
                      <Heading size="md">Conversion Funnel</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        {/* Funnel Steps */}
                        <VStack spacing={2} width="100%">
                          <HStack justify="space-between" width="100%">
                            <Text fontWeight="bold">Page Views</Text>
                            <Text>{dashboardData.funnelData.pageViews}</Text>
                          </HStack>
                          <Progress
                            value={100}
                            colorScheme="blue"
                            size="sm"
                            width="100%"
                          />
                        </VStack>

                        <VStack spacing={2} width="100%">
                          <HStack justify="space-between" width="100%">
                            <Text fontWeight="bold">Signups</Text>
                            <Text>{dashboardData.funnelData.signups}</Text>
                          </HStack>
                          <Progress
                            value={dashboardData.funnelData.conversionRates.signupRate}
                            colorScheme="green"
                            size="sm"
                            width="100%"
                          />
                          <Text fontSize="sm" color="gray.500">
                            {dashboardData.funnelData.conversionRates.signupRate.toFixed(2)}% conversion rate
                          </Text>
                        </VStack>

                        <VStack spacing={2} width="100%">
                          <HStack justify="space-between" width="100%">
                            <Text fontWeight="bold">Beta Activations</Text>
                            <Text>{dashboardData.funnelData.betaActivations}</Text>
                          </HStack>
                          <Progress
                            value={dashboardData.funnelData.conversionRates.betaActivationRate}
                            colorScheme="purple"
                            size="sm"
                            width="100%"
                          />
                          <Text fontSize="sm" color="gray.500">
                            {dashboardData.funnelData.conversionRates.betaActivationRate.toFixed(2)}% conversion rate
                          </Text>
                        </VStack>

                        <VStack spacing={2} width="100%">
                          <HStack justify="space-between" width="100%">
                            <Text fontWeight="bold">Subscriptions</Text>
                            <Text>{dashboardData.funnelData.subscriptions}</Text>
                          </HStack>
                          <Progress
                            value={dashboardData.funnelData.conversionRates.subscriptionRate}
                            colorScheme="orange"
                            size="sm"
                            width="100%"
                          />
                          <Text fontSize="sm" color="gray.500">
                            {dashboardData.funnelData.conversionRates.subscriptionRate.toFixed(2)}% conversion rate
                          </Text>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Events Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {dashboardData && (
                  <Card>
                    <CardHeader>
                      <Heading size="md">Top Events</Heading>
                    </CardHeader>
                    <CardBody>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Event Name</Th>
                            <Th>Count</Th>
                            <Th>Percentage</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {dashboardData.topEvents.map((event, index) => (
                            <Tr key={index}>
                              <Td>{event.eventName}</Td>
                              <Td>{event.count.toLocaleString()}</Td>
                              <Td>{event.percentage.toFixed(2)}%</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* User Segments Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {dashboardData && (
                  <Card>
                    <CardHeader>
                      <Heading size="md">User Segments</Heading>
                    </CardHeader>
                    <CardBody>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Segment</Th>
                            <Th>Count</Th>
                            <Th>Percentage</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {dashboardData.userSegments.map((segment, index) => (
                            <Tr key={index}>
                              <Td>{segment.segment}</Td>
                              <Td>{segment.count.toLocaleString()}</Td>
                              <Td>{segment.percentage.toFixed(2)}%</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};

export default AnalyticsDashboard;