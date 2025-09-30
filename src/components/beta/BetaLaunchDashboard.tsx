import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
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
  IconButton,
  Input,
  Progress,
  Select,
  SimpleGrid,
  Spacer,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { Download, RefreshCw, Mail } from 'lucide-react';
import { useBetaProgram, BetaMetrics, BetaCohort } from '../../hooks/useBetaProgram';
import type { BetaCriticalIssue, BetaFunnelStage, BetaStalledInvite } from '../../services/beta/beta-program.service';
import secureLogger from '../../utils/secure-logger';

const THRESHOLD_STORAGE_KEY = 'coach-core-beta-thresholds';
const SUMMARY_STORAGE_KEY = 'coach-core-beta-summary';

interface Thresholds {
  criticalIssues: number;
  errorEventsLast24h: number;
  medianActivationMinutes: number;
}

interface DailySummaryConfig {
  enabled: boolean;
  time: string;
}

const defaultThresholds: Thresholds = {
  criticalIssues: 3,
  errorEventsLast24h: 10,
  medianActivationMinutes: 90,
};

const defaultSummaryConfig: DailySummaryConfig = {
  enabled: false,
  time: '08:00',
};

const getStoredThresholds = (): Thresholds => {
  if (typeof window === 'undefined') {
    return defaultThresholds;
  }

  try {
    const raw = window.localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (!raw) {
      return defaultThresholds;
    }
    const parsed = JSON.parse(raw) as Partial<Thresholds>;
    return {
      criticalIssues: parsed.criticalIssues ?? defaultThresholds.criticalIssues,
      errorEventsLast24h: parsed.errorEventsLast24h ?? defaultThresholds.errorEventsLast24h,
      medianActivationMinutes: parsed.medianActivationMinutes ?? defaultThresholds.medianActivationMinutes,
    };
  } catch (error) {
    secureLogger.warn('Failed to parse stored beta thresholds', { error });
    return defaultThresholds;
  }
};

const getStoredSummaryConfig = (): DailySummaryConfig => {
  if (typeof window === 'undefined') {
    return defaultSummaryConfig;
  }

  try {
    const raw = window.localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (!raw) {
      return defaultSummaryConfig;
    }
    const parsed = JSON.parse(raw) as Partial<DailySummaryConfig>;
    return {
      enabled: parsed.enabled ?? defaultSummaryConfig.enabled,
      time: parsed.time ?? defaultSummaryConfig.time,
    };
  } catch (error) {
    secureLogger.warn('Failed to parse stored beta summary config', { error });
    return defaultSummaryConfig;
  }
};

const createFallbackMetrics = (): BetaMetrics => {
  const invitesSent = 120;
  const acceptedInvites = 78;
  const onboardingCompleted = 62;
  const activeUsers = 55;
  const retainedUsers = 44;

  const conversionRates = {
    acceptance: Math.round((acceptedInvites / invitesSent) * 1000) / 10,
    onboarding: Math.round((onboardingCompleted / acceptedInvites) * 1000) / 10,
    activation: Math.round((activeUsers / acceptedInvites) * 1000) / 10,
    retention: Math.round((retainedUsers / activeUsers) * 1000) / 10,
  };

  const featureUsage: Record<string, number> = {
    'ai-play-designer': 150,
    dashboard: 220,
    'beta-feedback': 45,
    'practice-planner': 110,
    'team-analytics': 70,
  };

  const leastUsedFeatures = Object.entries(featureUsage)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([feature, count]) => ({ feature, count }));

  const funnel: BetaFunnelStage[] = [
    { stage: 'invited', count: invitesSent, conversionRate: 100 },
    { stage: 'accepted', count: acceptedInvites, conversionRate: conversionRates.acceptance },
    { stage: 'onboarded', count: onboardingCompleted, conversionRate: conversionRates.onboarding },
    { stage: 'active', count: activeUsers, conversionRate: conversionRates.activation },
    { stage: 'retained', count: retainedUsers, conversionRate: conversionRates.retention },
  ];

  const criticalIssues: BetaCriticalIssue[] = [
    {
      id: 'critical-1',
      userId: 'beta-user-42',
      message: 'Play Designer crashes when saving new formation.',
      severity: 'critical',
      submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      responseToUser: undefined,
    },
    {
      id: 'critical-2',
      userId: 'beta-user-11',
      message: 'Dashboard metrics not updating after importing practice data.',
      severity: 'high',
      submittedAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
      responseToUser: 'Investigating issue, expect fix in next release.',
    },
  ];

  const stalledInvites: BetaStalledInvite[] = [
    {
      id: 'invite-501',
      email: 'coach.lisa@example.com',
      sentAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      remindersSent: 1,
    },
    {
      id: 'invite-502',
      email: 'trainer.max@example.com',
      sentAt: new Date(Date.now() - 56 * 60 * 60 * 1000),
      remindersSent: 2,
    },
  ];

  return {
    invitesSent,
    acceptedInvites,
    declinedInvites: 12,
    pendingInvites: invitesSent - acceptedInvites - 12,
    onboardingCompleted,
    activeUsers,
    retainedUsers,
    feedbackCount: 38,
    featureUsage,
    leastUsedFeatures,
    featureRequests: 9,
    criticalIssues,
    stalledInvites,
    errorEventsLast24h: 6,
    performanceAlertsLast24h: 3,
    medianActivationMinutes: 45,
    p90ActivationMinutes: 120,
    conversionRates,
    funnel,
    activations: acceptedInvites,
  };
};

const formatMinutes = (value: number | null): string => {
  if (value == null) {
    return 'n/a';
  }
  return `${value} min`;
};

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;

const BetaLaunchDashboard: React.FC = () => {
  const { getBetaMetrics, getBetaCohorts } = useBetaProgram();
  const [availableCohorts, setAvailableCohorts] = useState<BetaCohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('default');
  const [metrics, setMetrics] = useState<BetaMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds>(getStoredThresholds);
  const [summaryConfig, setSummaryConfig] = useState<DailySummaryConfig>(getStoredSummaryConfig);

  const loadCohorts = useCallback(async () => {
    try {
      const cohorts = await getBetaCohorts();
      if (cohorts.length > 0) {
        setAvailableCohorts(cohorts);
        if (selectedCohort === 'default') {
          setSelectedCohort(cohorts[0].id);
        }
      }
    } catch (err) {
      secureLogger.warn('Failed to load beta cohorts, continuing with default cohort', { err });
    }
  }, [getBetaCohorts, selectedCohort]);

  const fetchMetrics = useCallback(
    async (cohortId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getBetaMetrics(cohortId);
        setMetrics(data);
      } catch (err) {
        secureLogger.error('Failed to load beta metrics', { err, cohortId });
        setError('Unable to load live beta metrics. Displaying the fallback snapshot so you can keep planning.');
        setMetrics(createFallbackMetrics());
      } finally {
        setIsLoading(false);
      }
    },
    [getBetaMetrics]
  );

  useEffect(() => {
    loadCohorts();
  }, [loadCohorts]);

  useEffect(() => {
    if (!selectedCohort) {
      return;
    }
    fetchMetrics(selectedCohort === 'default' ? 'beta' : selectedCohort);
  }, [fetchMetrics, selectedCohort]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify(thresholds));
  }, [thresholds]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaryConfig));
  }, [summaryConfig]);

  const topFeatures = useMemo(() => {
    if (!metrics) {
      return [] as Array<{ feature: string; count: number }>;
    }
    return Object.entries(metrics.featureUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature, count]) => ({ feature, count }));
  }, [metrics]);

  const thresholdAlerts = useMemo(() => {
    if (!metrics) {
      return [] as string[];
    }
    const alerts: string[] = [];
    if (metrics.criticalIssues.length > thresholds.criticalIssues) {
      alerts.push('Critical issues exceed the threshold');
    }
    if (metrics.errorEventsLast24h > thresholds.errorEventsLast24h) {
      alerts.push('Error volume in the last 24 hours is over the threshold');
    }
    if (metrics.medianActivationMinutes && metrics.medianActivationMinutes > thresholds.medianActivationMinutes) {
      alerts.push('Median time to activation is above target');
    }
    return alerts;
  }, [metrics, thresholds]);

  const handleThresholdChange = (key: keyof Thresholds, value: number) => {
    setThresholds((prev) => ({ ...prev, [key]: Number.isNaN(value) ? prev[key] : value }));
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!metrics) {
      return;
    }

    const timestamp = new Date().toISOString();
    const cohortLabel = selectedCohort || 'beta';

    if (format === 'json') {
      const payload = {
        generatedAt: timestamp,
        cohortId: cohortLabel,
        metrics,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `beta-dashboard-${cohortLabel}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    const rows: Array<[string, string | number]> = [
      ['Generated At', timestamp],
      ['Cohort', cohortLabel],
      ['Invites Sent', metrics.invitesSent],
      ['Accepted Invites', metrics.acceptedInvites],
      ['Onboarding Completed', metrics.onboardingCompleted],
      ['Active Users', metrics.activeUsers],
      ['Retained Users', metrics.retainedUsers],
      ['Median Activation Minutes', metrics.medianActivationMinutes ?? 'n/a'],
      ['P90 Activation Minutes', metrics.p90ActivationMinutes ?? 'n/a'],
      ['Critical Issues', metrics.criticalIssues.length],
      ['Error Events Last 24h', metrics.errorEventsLast24h],
      ['Performance Alerts Last 24h', metrics.performanceAlertsLast24h],
      ['Feature Requests', metrics.featureRequests],
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `beta-dashboard-${cohortLabel}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSendTestSummary = () => {
    secureLogger.info('Triggering beta daily summary email preview', {
      cohortId: selectedCohort,
      summaryConfig,
    });
  };

  return (
    <VStack align="stretch" spacing={6}>
      <HStack align="center" spacing={4}>
        <Heading size="lg">Beta Launch Dashboard</Heading>
        <Badge colorScheme="blue">Phase 4</Badge>
        <Spacer />
        <Tooltip label="Refresh metrics">
          <IconButton
            aria-label="Refresh metrics"
            icon={<Icon as={RefreshCw} />}
            variant="ghost"
            onClick={() => fetchMetrics(selectedCohort === 'default' ? 'beta' : selectedCohort)}
          />
        </Tooltip>
        <Tooltip label="Export CSV">
          <IconButton
            aria-label="Export CSV"
            icon={<Icon as={Download} />}
            variant="outline"
            onClick={() => handleExport('csv')}
          />
        </Tooltip>
        <Tooltip label="Export JSON">
          <IconButton
            aria-label="Export JSON"
            icon={<Icon as={Download} />}
            variant="outline"
            onClick={() => handleExport('json')}
          />
        </Tooltip>
      </HStack>

      <Card>
        <CardBody>
          <HStack spacing={6} align="center">
            <Box>
              <Text fontWeight="medium">Cohort</Text>
              <Select value={selectedCohort} onChange={(event) => setSelectedCohort(event.target.value)} maxW="240px" mt={1}>
                <option value="default">Primary beta cohort</option>
                {availableCohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </Select>
            </Box>
            <Divider orientation="vertical" height="40px" />
            <Stack spacing={1}>
              <Text fontWeight="medium">Daily summary email</Text>
              <HStack spacing={3}>
                <Switch
                  isChecked={summaryConfig.enabled}
                  onChange={(event) => setSummaryConfig((prev) => ({ ...prev, enabled: event.target.checked }))}
                />
                <Input
                  type="time"
                  value={summaryConfig.time}
                  maxW="140px"
                  isDisabled={!summaryConfig.enabled}
                  onChange={(event) => setSummaryConfig((prev) => ({ ...prev, time: event.target.value }))}
                />
                <Button
                  leftIcon={<Icon as={Mail} />}
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestSummary}
                >
                  Send test summary
                </Button>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                Daily digests summarize funnel drop-offs, critical issues, and alert spikes.
              </Text>
            </Stack>
          </HStack>
        </CardBody>
      </Card>

      {thresholdAlerts.length > 0 && (
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <AlertTitle fontWeight="semibold">Alerts raised</AlertTitle>
            {thresholdAlerts.map((message, index) => (
              <Text key={index} fontSize="sm">
                • {message}
              </Text>
            ))}
          </VStack>
        </Alert>
      )}

      {error && (
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Flex align="center" justify="center" py={20}>
          <Spinner size="xl" thickness="5px" />
        </Flex>
      )}

      {!isLoading && metrics && (
        <VStack align="stretch" spacing={6}>
          {/* Priority 1: Conversion Funnel */}
          <Card>
            <CardHeader>
              <Heading size="md">Priority 1 · Conversion Funnel</Heading>
              <Text mt={1} color="gray.500">
                Track conversion from invites through retention with live drop-off indicators.
              </Text>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 5 }} spacing={4}>
                {metrics.funnel.map((stage) => (
                  <Card key={stage.stage} variant="outline">
                    <CardBody>
                      <Stat>
                        <StatLabel textTransform="capitalize">{stage.stage}</StatLabel>
                        <StatNumber>{stage.count}</StatNumber>
                        <Text fontSize="sm" color="gray.500">
                          {formatPercentage(stage.conversionRate)} conversion
                        </Text>
                        {stage.stage !== 'invited' && (
                          <Progress value={stage.conversionRate} mt={3} size="sm" colorScheme="blue" />
                        )}
                      </Stat>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>

              <Divider my={6} />

              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <Card variant="outline">
                  <CardBody>
                    <Stat>
                      <StatLabel>Median time to activation</StatLabel>
                      <StatNumber>{formatMinutes(metrics.medianActivationMinutes)}</StatNumber>
                      <Text fontSize="sm" color="gray.500">
                        P90: {formatMinutes(metrics.p90ActivationMinutes)}
                      </Text>
                    </Stat>
                  </CardBody>
                </Card>
                <Card variant="outline">
                  <CardBody>
                    <Stat>
                      <StatLabel>Pending invites</StatLabel>
                      <StatNumber>{metrics.pendingInvites}</StatNumber>
                      <Text fontSize="sm" color="gray.500">
                        {metrics.stalledInvites.length} stalled {'>'}48h
                      </Text>
                    </Stat>
                  </CardBody>
                </Card>
                <Card variant="outline">
                  <CardBody>
                    <Stat>
                      <StatLabel>Feature requests</StatLabel>
                      <StatNumber>{metrics.featureRequests}</StatNumber>
                      <Text fontSize="sm" color="gray.500">
                        Prioritize in roadmap grooming
                      </Text>
                    </Stat>
                  </CardBody>
                </Card>
              </Grid>

              {metrics.stalledInvites.length > 0 && (
                <Box mt={6}>
                  <Heading size="sm" mb={3}>
                    Stalled invites (older than 48 hours)
                  </Heading>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Email</Th>
                        <Th>Sent at</Th>
                        <Th isNumeric>Reminders</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {metrics.stalledInvites.map((invite) => (
                        <Tr key={invite.id}>
                          <Td>{invite.email}</Td>
                          <Td>{invite.sentAt.toLocaleString()}</Td>
                          <Td isNumeric>{invite.remindersSent}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </CardBody>
          </Card>

          {/* Priority 2: Critical Issues & Alerts */}
          <Card>
            <CardHeader>
              <Heading size="md">Priority 2 · Critical Issues & Health</Heading>
              <Text mt={1} color="gray.500">
                Keep a live view on critical feedback, error spikes, and performance regressions.
              </Text>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Card variant="outline">
                  <CardBody>
                    <Stat>
                      <StatLabel>Open critical issues</StatLabel>
                      <StatNumber>{metrics.criticalIssues.length}</StatNumber>
                      <Text fontSize="sm" color="gray.500">
                        Threshold: {thresholds.criticalIssues}
                      </Text>
                    </Stat>
                  </CardBody>
                </Card>
                <Card variant="outline">
                  <CardBody>
                    <Stat>
                      <StatLabel>Error events (24h)</StatLabel>
                      <StatNumber>{metrics.errorEventsLast24h}</StatNumber>
                      <Text fontSize="sm" color="gray.500">
                        Threshold: {thresholds.errorEventsLast24h}
                      </Text>
                    </Stat>
                  </CardBody>
                </Card>
                <Card variant="outline">
                  <CardBody>
                    <Stat>
                      <StatLabel>Performance alerts (24h)</StatLabel>
                      <StatNumber>{metrics.performanceAlertsLast24h}</StatNumber>
                      <Text fontSize="sm" color="gray.500">
                        Real-time signal from beta instrumentation
                      </Text>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              <Divider my={6} />

              {metrics.criticalIssues.length > 0 ? (
                <Table size="sm" variant="striped">
                  <Thead>
                    <Tr>
                      <Th>Severity</Th>
                      <Th>Summary</Th>
                      <Th>Submitted</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {metrics.criticalIssues.map((issue) => (
                      <Tr key={issue.id}>
                        <Td>
                          <Badge colorScheme={issue.severity === 'critical' ? 'red' : 'orange'}>{issue.severity}</Badge>
                        </Td>
                        <Td>
                          <Text fontWeight="medium">{issue.message}</Text>
                          {issue.responseToUser && (
                            <Text fontSize="sm" color="gray.500">
                              Response: {issue.responseToUser}
                            </Text>
                          )}
                        </Td>
                        <Td>{issue.submittedAt.toLocaleString()}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>No open critical issues. Keep monitoring real-time alerts.</AlertDescription>
                </Alert>
              )}
            </CardBody>
          </Card>

          {/* Priority 3: Feature Validation */}
          <Card>
            <CardHeader>
              <Heading size="md">Priority 3 · Feature Validation</Heading>
              <Text mt={1} color="gray.500">
                Identify feature adoption wins and friction points to guide iteration.
              </Text>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Card variant="outline">
                  <CardHeader pb={2}>
                    <Heading size="sm">Most used features</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      {topFeatures.map((item) => (
                        <HStack key={item.feature} justify="space-between">
                          <Text textTransform="capitalize">{item.feature.replace(/-/g, ' ')}</Text>
                          <Badge colorScheme="blue">{item.count}</Badge>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>

                <Card variant="outline">
                  <CardHeader pb={2}>
                    <Heading size="sm">Least used features</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      {metrics.leastUsedFeatures.map((item) => (
                        <HStack key={item.feature} justify="space-between">
                          <Text textTransform="capitalize">{item.feature.replace(/-/g, ' ')}</Text>
                          <Badge colorScheme="gray">{item.count}</Badge>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              <Divider my={6} />

              <Heading size="sm" mb={3}>
                Alert thresholds
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Critical issue threshold</Text>
                  <Input
                    type="number"
                    value={thresholds.criticalIssues}
                    onChange={(event) => handleThresholdChange('criticalIssues', Number(event.target.value))}
                    mt={1}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Error events (24h)</Text>
                  <Input
                    type="number"
                    value={thresholds.errorEventsLast24h}
                    onChange={(event) => handleThresholdChange('errorEventsLast24h', Number(event.target.value))}
                    mt={1}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium">Median activation target (min)</Text>
                  <Input
                    type="number"
                    value={thresholds.medianActivationMinutes}
                    onChange={(event) => handleThresholdChange('medianActivationMinutes', Number(event.target.value))}
                    mt={1}
                  />
                </Box>
              </SimpleGrid>
            </CardBody>
          </Card>
        </VStack>
      )}
    </VStack>
  );
};

export default BetaLaunchDashboard;
