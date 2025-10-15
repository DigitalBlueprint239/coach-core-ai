import React, { useMemo, useState } from 'react';
import {
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
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Switch,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { AlertTriangle, CheckCircle, RefreshCw, Thermometer, Timer, ClipboardList } from 'lucide-react';
import aiService, { PracticePlan } from '../../services/ai/ai-service';
import { AIPracticePlanRequest } from '../../services/ai/enhanced-ai-service';
import { generateAllScenarios, MockScenario } from '../../test/mock-data-generator';
import { PlanValidationSummary, validatePracticePlan } from '../../utils/plan-validator';

const DEBUG_LOG_DEFAULT = false;

interface AIBrainSmokeTestProps {
  enabled?: boolean;
  autoStart?: boolean;
}

interface TransformationInsight {
  requestedDuration: number;
  scheduledDuration: number;
  drillDuration: number;
  durationDelta: number;
}

const formatJson = (value: unknown): string =>
  JSON.stringify(value, (_, v) => v ?? undefined, 2);

const computeTransformations = (
  validation: PlanValidationSummary | null
): TransformationInsight | null => {
  if (!validation) {
    return null;
  }
  return {
    requestedDuration: validation.requestedDuration,
    scheduledDuration: validation.scheduledDuration,
    drillDuration: validation.drillDuration,
    durationDelta: validation.scheduledDuration - validation.requestedDuration,
  };
};

const isDevEnvironment = process.env.NODE_ENV !== 'production';

export const AIBrainSmokeTest: React.FC<AIBrainSmokeTestProps> = ({
  enabled,
  autoStart = false,
}) => {
  const allowRender = enabled ?? isDevEnvironment;
  const [debugLogging, setDebugLogging] = useState<boolean>(DEBUG_LOG_DEFAULT);
  const [scenarios] = useState<MockScenario[]>(() => generateAllScenarios());
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id ?? '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [validation, setValidation] = useState<PlanValidationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');
  const jsonBg = useColorModeValue('gray.100', 'gray.700');
  const drillBg = useColorModeValue('gray.50', 'gray.700');

  const selectedScenario = useMemo<MockScenario | undefined>(
    () => scenarios.find(scenario => scenario.id === selectedScenarioId),
    [scenarios, selectedScenarioId]
  );

  const transformations = useMemo(() => computeTransformations(validation), [validation]);

  const logDebug = (label: string, payload: unknown) => {
    if (debugLogging) {
      // eslint-disable-next-line no-console
      console.debug(`[AIBrainSmokeTest] ${label}`, payload);
    }
  };

  const runGeneration = async (scenario: MockScenario) => {
    setIsGenerating(true);
    setError(null);
    setPlan(null);
    setValidation(null);

    try {
      logDebug('Request Payload', scenario.request);
      const response = await aiService.generatePracticePlan(scenario.request);

      if (!response.success || !response.plan) {
        setError('AI service did not return a practice plan. Check service availability.');
        logDebug('AI Response', response);
        return;
      }

      logDebug('AI Raw Response', response);
      const validationSummary = validatePracticePlan(response.plan, scenario.request);
      logDebug('Validation Summary', validationSummary);

      setPlan(response.plan);
      setValidation(validationSummary);
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'Unexpected error during plan generation.';
      setError(message);
      logDebug('Generation Error', generationError);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedScenario) {
      setError('No scenario selected.');
      return;
    }
    void runGeneration(selectedScenario);
  };

  React.useEffect(() => {
    if (autoStart && selectedScenario) {
      void runGeneration(selectedScenario);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, selectedScenarioId]);

  if (!allowRender) {
    return null;
  }

  return (
    <Box bg={sectionBg} p={6} borderRadius="xl" shadow="lg">
      <Stack spacing={6}>
        <HStack justify="space-between" align="center">
          <Heading size="lg">AI Brain Smoke Test</Heading>
          <HStack spacing={6}>
            <Tooltip label="Toggle console debug logging">
              <HStack>
                <Text fontSize="sm">Debug Logs</Text>
                <Switch
                  isChecked={debugLogging}
                  onChange={event => setDebugLogging(event.target.checked)}
                />
              </HStack>
            </Tooltip>
            <Button
              leftIcon={<RefreshCw size={16} />}
              colorScheme="blue"
              onClick={handleGenerate}
              isLoading={isGenerating}
              loadingText="Generating..."
              disabled={!selectedScenario}
            >
              Generate Practice Plan
            </Button>
          </HStack>
        </HStack>

        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <HStack justify="space-between" align="center">
              <Heading size="md">Scenario Selection</Heading>
              <Tag colorScheme="purple">
                <TagLabel>{scenarios.length} scenarios</TagLabel>
              </Tag>
            </HStack>
          </CardHeader>
          <CardBody>
            <Stack spacing={4}>
              <Select
                value={selectedScenarioId}
                onChange={event => setSelectedScenarioId(event.target.value)}
              >
                {scenarios.map(scenario => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </Select>
              {selectedScenario && (
                <Text fontSize="sm" color="gray.500">
                  {selectedScenario.description}
                </Text>
              )}
            </Stack>
          </CardBody>
        </Card>

        {selectedScenario && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Card bg={cardBg} shadow="sm">
              <CardHeader>
                <Heading size="sm">Input Context</Heading>
              </CardHeader>
              <CardBody>
                <Stack spacing={4}>
                  <Box>
                    <Text fontWeight="semibold">Team Overview</Text>
                    <Text fontSize="sm" color="gray.600">
                      {selectedScenario.teamContext.teamName} · {selectedScenario.teamContext.ageGroup} ·{' '}
                      {selectedScenario.teamContext.skillLevel}
                    </Text>
                  </Box>
                  <Divider />
                  <Box>
                    <Text fontWeight="semibold">Constraints</Text>
                    <Text fontSize="sm" color="gray.600">
                      Duration: {selectedScenario.teamContext.constraints.duration} min · Facility: {selectedScenario.teamContext.constraints.facilityType.replace('_', ' ')}
                    </Text>
                  </Box>
                  <Divider />
                  <Box>
                    <Text fontWeight="semibold">Focus Areas</Text>
                    <Stack spacing={1} fontSize="sm" color="gray.600">
                      {selectedScenario.teamContext.focusAreas.map(area => (
                        <Text key={area}>• {area}</Text>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardBody>
            </Card>

            <Card bg={cardBg} shadow="sm">
              <CardHeader>
                <Heading size="sm">AI Request Payload</Heading>
              </CardHeader>
              <CardBody>
                    <Box
                      as="pre"
                      fontSize="xs"
                      bg={jsonBg}
                      p={4}
                      borderRadius="md"
                      overflowX="auto"
                      maxH="300px"
                    >
                  {formatJson(selectedScenario.request)}
                </Box>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {isGenerating && (
          <Flex align="center" justify="center" py={12}>
            <Spinner size="lg" thickness="4px" color="blue.400" />
          </Flex>
        )}

        {error && (
          <Card bg="red.50" borderColor="red.200" borderWidth="1px">
            <CardBody>
              <HStack spacing={3} color="red.600">
                <Icon as={AlertTriangle} />
                <Text>{error}</Text>
              </HStack>
            </CardBody>
          </Card>
        )}

        {plan && validation && (
          <Stack spacing={6}>
            <Card bg={cardBg} shadow="md">
              <CardHeader>
                <HStack justify="space-between" align="center">
                  <Heading size="md">Validation Results</Heading>
                  <Tag colorScheme={validation.passed ? 'green' : 'red'}>
                    <TagLabel>{validation.passed ? 'PASS' : 'FAIL'}</TagLabel>
                  </Tag>
                </HStack>
              </CardHeader>
              <CardBody>
                <Stack spacing={4}>
                  {validation.results.map(result => (
                    <HStack key={result.check} spacing={3} align="flex-start">
                      <Icon
                        as={result.passed ? CheckCircle : AlertTriangle}
                        color={result.passed ? 'green.400' : 'red.400'}
                        mt={1}
                      />
                      <Box>
                        <Text fontWeight="semibold">{result.check}</Text>
                        <Text fontSize="sm" color="gray.600">
                          {result.message}
                        </Text>
                      </Box>
                    </HStack>
                  ))}
                </Stack>
              </CardBody>
            </Card>

            <Card bg={cardBg} shadow="md">
              <CardHeader>
                <Heading size="md">Visual Diff &amp; Transformations</Heading>
              </CardHeader>
              <CardBody>
                <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4}>
                  <GridItem>
                    <Heading size="sm" mb={2}>
                      Input Context
                    </Heading>
                    <Box
                      as="pre"
                      fontSize="xs"
                      bg={jsonBg}
                      p={3}
                      borderRadius="md"
                      maxH="260px"
                      overflowY="auto"
                    >
                      {formatJson(selectedScenario?.teamContext ?? {})}
                    </Box>
                  </GridItem>
                  <GridItem>
                    <Heading size="sm" mb={2}>
                      AI Output Plan
                    </Heading>
                    <Box
                      as="pre"
                      fontSize="xs"
                      bg={jsonBg}
                      p={3}
                      borderRadius="md"
                      maxH="260px"
                      overflowY="auto"
                    >
                      {formatJson(plan)}
                    </Box>
                  </GridItem>
                  <GridItem>
                    <Heading size="sm" mb={2}>
                      Transformation Summary
                    </Heading>
                    <VStack align="stretch" spacing={3}>
                      {transformations && (
                        <React.Fragment>
                          <HStack>
                            <Icon as={Timer} color="blue.400" />
                            <Text fontSize="sm">
                              Requested: {transformations.requestedDuration} min
                            </Text>
                          </HStack>
                          <HStack>
                            <Icon as={Thermometer} color="orange.400" />
                            <Text fontSize="sm">
                              Scheduled: {transformations.scheduledDuration} min ({transformations.durationDelta >= 0 ? '+' : ''}
                              {transformations.durationDelta} min)
                            </Text>
                          </HStack>
                          <HStack>
                            <Icon as={ClipboardList} color="teal.400" />
                            <Text fontSize="sm">
                              Drill Time: {transformations.drillDuration} min
                            </Text>
                          </HStack>
                        </React.Fragment>
                      )}
                    </VStack>
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>

            <Card bg={cardBg} shadow="md">
              <CardHeader>
                <Heading size="md">Practice Plan Detail</Heading>
              </CardHeader>
              <CardBody>
                <Stack spacing={4}>
                  <Box>
                    <Heading size="sm">{plan.title}</Heading>
                    <Text fontSize="sm" color="gray.600">
                      {plan.sport} · {plan.ageGroup} · Goals: {plan.goals.join(', ')}
                    </Text>
                  </Box>
                  <Divider />
                  <Stack spacing={4}>
                    {plan.periods.map((period, periodIndex) => (
                      <Box key={period.id} borderWidth="1px" borderRadius="md" p={4} borderColor="gray.200">
                        <HStack justify="space-between" align="center" mb={2}>
                          <Heading size="sm">{period.name}</Heading>
                          <Tag colorScheme={period.intensity === 'high' ? 'red' : period.intensity === 'medium' ? 'orange' : 'green'}>
                            <TagLabel>
                              {period.duration} min · {period.intensity}
                            </TagLabel>
                          </Tag>
                        </HStack>
                        <Stack spacing={3} fontSize="sm">
                          {period.drills.map((drill, drillIndex) => (
                            <Box key={`${period.id}-drill-${drillIndex}`} bg={drillBg} p={3} borderRadius="md">
                              <Text fontWeight="semibold">{drill.name}</Text>
                              <Text color="gray.600">Duration: {drill.duration} min</Text>
                              <Text mt={1}>{drill.description}</Text>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default AIBrainSmokeTest;
